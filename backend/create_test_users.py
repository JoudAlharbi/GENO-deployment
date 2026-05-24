"""
Seed a public demo laboratory user for portfolio deployments.
Run after schema creation: python create_test_users.py
"""
import os
import sys
from pathlib import Path

import psycopg2

backend_dir = Path(__file__).resolve().parent
sys.path.insert(0, str(backend_dir))

from app_config import Config
from utils.auth_utils import hash_password

DEMO_EMPLOYEE_ID = os.getenv('DEMO_EMPLOYEE_ID', 'demo')
DEMO_PASSWORD = os.getenv('DEMO_PASSWORD', 'demo1234')
DEMO_EMAIL = os.getenv('DEMO_EMAIL', 'demo@geno-lab.example')
DEMO_FULLNAME = os.getenv('DEMO_FULLNAME', 'Demo Laboratory User')

conn = psycopg2.connect(
    host=Config.DB_HOST,
    database=Config.DB_NAME,
    user=Config.DB_USER,
    password=Config.DB_PASSWORD,
    port=Config.DB_PORT,
)

cur = conn.cursor()

print('Creating public demo user...\n')

try:
    hashed_password = hash_password(DEMO_PASSWORD)
    cur.execute(
        """
        INSERT INTO LaboratoryUser
        (UserID, Email, Password, Fullname, EmployeeID, IsFirstLogin)
        VALUES (%s, %s, %s, %s, %s, %s)
        ON CONFLICT (UserID) DO UPDATE
        SET Email = EXCLUDED.Email,
            Password = EXCLUDED.Password,
            Fullname = EXCLUDED.Fullname,
            EmployeeID = EXCLUDED.EmployeeID,
            IsFirstLogin = EXCLUDED.IsFirstLogin
        """,
        (
            DEMO_EMPLOYEE_ID,
            DEMO_EMAIL,
            hashed_password,
            DEMO_FULLNAME,
            DEMO_EMPLOYEE_ID,
            False,
        ),
    )
    conn.commit()
    print('[OK] Demo user ready')
    print(f'  Company ID: {DEMO_EMPLOYEE_ID}')
    print(f'  Password: {DEMO_PASSWORD}')
    print(f'  Email: {DEMO_EMAIL}\n')
except Exception as e:
    print(f'[ERROR] Error creating demo user: {e}\n')
    conn.rollback()
finally:
    cur.close()
    conn.close()

print('Demo user setup completed.')
