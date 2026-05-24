"""Centralized PostgreSQL connection helpers."""

import os

import psycopg2
from psycopg2 import OperationalError

from app_config import Config


def resolve_db_host():
    """Prefer IPv4 loopback — avoids ::1 connection refused on some Windows setups."""
    host = os.getenv('DB_HOST', Config.DB_HOST)
    if host in ('localhost', '::1'):
        return '127.0.0.1'
    return host


def get_connection_params(database=None):
    return {
        'host': resolve_db_host(),
        'database': database or Config.DB_NAME,
        'user': Config.DB_USER,
        'password': Config.DB_PASSWORD,
        'port': Config.DB_PORT,
    }


def get_db_connection(database=None):
    """Create and return a database connection."""
    database_url = os.getenv('DATABASE_URL')
    if database_url:
        return psycopg2.connect(database_url, sslmode='require')
    return psycopg2.connect(**get_connection_params(database))


def check_database_connection():
    """
    Verify PostgreSQL is reachable.
    Returns (ok: bool, message: str, details: dict|None)
    """
    if Config.DEMO_MODE:
        return True, 'demo_mode', {
            'database': 'in-memory',
            'postgres_version': 'N/A (portfolio demo)',
            'host': 'memory',
            'port': '0',
        }
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute('SELECT current_database(), version();')
        row = cur.fetchone()
        cur.close()
        conn.close()
        return True, 'connected', {
            'database': row[0],
            'postgres_version': row[1].split(',')[0] if row[1] else None,
            'host': resolve_db_host(),
            'port': Config.DB_PORT,
        }
    except OperationalError as e:
        err = str(e).lower()
        if 'connection refused' in err or 'could not connect' in err:
            return False, 'postgresql_not_running', {
                'hint': (
                    'PostgreSQL is not running. Start the service '
                    '(postgresql-x64-18) or run scripts/start_postgres.ps1'
                ),
                'error': str(e),
            }
        if 'password authentication failed' in err:
            return False, 'invalid_db_credentials', {
                'hint': 'Check DB_USER and DB_PASSWORD in backend/.env',
                'error': str(e),
            }
        if 'does not exist' in err and 'database' in err:
            return False, 'database_missing', {
                'hint': f'Run: python scripts/ensure_db.py',
                'error': str(e),
            }
        return False, 'connection_failed', {'error': str(e)}
    except Exception as e:
        return False, 'connection_failed', {'error': str(e)}


def format_db_error_for_api(error):
    """Map DB exceptions to safe API error messages (no raw stack traces)."""
    if isinstance(error, OperationalError):
        ok, code, details = check_database_connection()
        if code == 'postgresql_not_running':
            return (
                'Database server is not running. Please start PostgreSQL on port 5432, '
                'then try again. (Windows: Services → postgresql-x64-18 → Start)',
                503,
            )
        if code == 'invalid_db_credentials':
            return (
                'Database credentials are incorrect. Check backend/.env (DB_USER, DB_PASSWORD).',
                503,
            )
        if code == 'database_missing':
            return (
                'Application database is not initialized. Run: python scripts/ensure_db.py',
                503,
            )
    return ('Database connection failed. Contact your administrator.', 503)
