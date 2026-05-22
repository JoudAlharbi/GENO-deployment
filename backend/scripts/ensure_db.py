"""Ensure PostgreSQL database exists and is reachable."""
import os
import sys
from pathlib import Path

import psycopg2

backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from app_config import Config


def resolve_host():
    host = os.getenv('DB_HOST', Config.DB_HOST)
    if host in ('localhost', '::1'):
        return '127.0.0.1'
    return host


def main():
    host = resolve_host()
    conn = psycopg2.connect(
        host=host,
        database='postgres',
        user=Config.DB_USER,
        password=Config.DB_PASSWORD,
        port=Config.DB_PORT,
    )
    conn.autocommit = True
    cur = conn.cursor()
    cur.execute('SELECT 1 FROM pg_database WHERE datname = %s', (Config.DB_NAME,))
    if not cur.fetchone():
        cur.execute(f'CREATE DATABASE "{Config.DB_NAME}"')
        print(f'Created database: {Config.DB_NAME}')
    else:
        print(f'Database exists: {Config.DB_NAME}')
    cur.close()
    conn.close()

    test = psycopg2.connect(
        host=host,
        database=Config.DB_NAME,
        user=Config.DB_USER,
        password=Config.DB_PASSWORD,
        port=Config.DB_PORT,
    )
    test.close()
    print('Connection to geno database: OK')


if __name__ == '__main__':
    main()
