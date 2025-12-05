"""
Script to create 3 test users for the laboratory system
Run this script to add test users to the database
"""
import psycopg2
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from utils.auth_utils import hash_password

from pathlib import Path
# Add the backend directory to the Python path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))
from app_config import Config

conn = psycopg2.connect(
    host=Config.DB_HOST,
    database=Config.DB_NAME,
    user=Config.DB_USER,
    password=Config.DB_PASSWORD,
    port=Config.DB_PORT
)

cur = conn.cursor()

# Test users data
test_users = [
    {
        'user_id': 'F55055',
        'employee_id': 'F55055',
        'fullname': 'Farah Najjar',
        'email': 'farah.najjar@mediLab.com',
        'password': 'F500!'
    },
    {
        'user_id': 'J99099',
        'employee_id': 'J99099',
        'fullname': 'Joud Alharbi',
        'email': 'joud.alharbi@mediLab.com',
        'password': 'J900!'
    },
    {
        'user_id': 'S44044',
        'employee_id': 'S44044',
        'fullname': 'Shams Almasabi',
        'email': 'shams.almasabi@mediLab.com',
        'password': 'S400!'
    }
]

print("Creating test users...\n")

for user in test_users:
    try:
        hashed_password = hash_password(user['password'])
        
        cur.execute("""
            INSERT INTO LaboratoryUser 
            (UserID, Email, Password, Fullname, EmployeeID, IsFirstLogin)
            VALUES (%s, %s, %s, %s, %s, %s)
            ON CONFLICT (UserID) DO UPDATE
            SET Email = EXCLUDED.Email,
                Password = EXCLUDED.Password,
                Fullname = EXCLUDED.Fullname,
                EmployeeID = EXCLUDED.EmployeeID
        """, (
            user['user_id'],
            user['email'],
            hashed_password,
            user['fullname'],
            user['employee_id'],
            True  # IsFirstLogin
        ))
        
        print(f"✓ Created user: {user['fullname']}")
        print(f"  Employee ID: {user['employee_id']}")
        print(f"  Email: {user['email']}")
        print(f"  Password: {user['password']}\n")
        
    except Exception as e:
        print(f"✗ Error creating user {user['fullname']}: {e}\n")

conn.commit()
cur.close()
conn.close()

print("Test users creation completed!")

