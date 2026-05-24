"""
Optional admin seed — set ADMIN_EMPLOYEE_ID and ADMIN_PASSWORD in env before running.
Not required for public portfolio demo (use create_test_users.py / demo).
"""
import os
import sys
from pathlib import Path

import psycopg2

backend_dir = Path(__file__).resolve().parent
sys.path.insert(0, str(backend_dir))

from app_config import Config
from utils.auth_utils import hash_password

ADMIN_ID = os.getenv('ADMIN_EMPLOYEE_ID', 'ADMIN-001')
ADMIN_EMAIL = os.getenv('ADMIN_EMAIL', 'admin@geno-lab.example')
ADMIN_PASSWORD = os.getenv('ADMIN_PASSWORD', '')
ADMIN_NAME = os.getenv('ADMIN_FULLNAME', 'System Administrator')

if not ADMIN_PASSWORD:
    print('[SKIP] Set ADMIN_PASSWORD in the environment to create an admin user.')
    sys.exit(0)

conn = psycopg2.connect(
    host=Config.DB_HOST,
    database=Config.DB_NAME,
    user=Config.DB_USER,
    password=Config.DB_PASSWORD,
    port=Config.DB_PORT,
)

cur = conn.cursor()
admin_password = hash_password(ADMIN_PASSWORD)

cur.execute(
    """
    INSERT INTO LaboratoryUser
    (UserID, Email, Password, Fullname, EmployeeID, IsFirstLogin)
    VALUES (%s, %s, %s, %s, %s, FALSE)
    ON CONFLICT (UserID) DO UPDATE
    SET Password = EXCLUDED.Password, Email = EXCLUDED.Email
    """,
    (ADMIN_ID, ADMIN_EMAIL, admin_password, ADMIN_NAME, ADMIN_ID),
)

conn.commit()
cur.close()
conn.close()

print('[OK] Admin user created/updated')
print(f'  Employee ID: {ADMIN_ID}')
