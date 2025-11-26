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

admin_password = hash_password("Admin123!")

cur.execute("""
    INSERT INTO LaboratoryUser 
    (UserID, Email, Password, Fullname, EmployeeID, IsFirstLogin)
    VALUES 
    ('ADMIN-001', 'admin@genolabs.com', %s, 'System Administrator', 
     'ADMIN-001', FALSE)
""", (admin_password,))

conn.commit()
cur.close()
conn.close()

print("✓ Admin created successfully!")
print("Employee ID: ADMIN-001")
print("Password: Admin123!")
print("⚠️  Change this password after first login!")