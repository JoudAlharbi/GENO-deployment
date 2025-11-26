import psycopg2
from psycopg2 import sql
import os
import sys

#--------- to fix config import problem
'''
config was being confused with another venv config, i changed the name to
 app_config and added 
'''
from pathlib import Path
# Add the backend directory to the Python path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from app_config import Config 
#--------------------- 

def create_database_schema():
    """Create all tables for the system"""
    
    #Connection parameters-------------------------------
    conn = psycopg2.connect(
        host=Config.DB_HOST,
        database=Config.DB_NAME,
        user=Config.DB_USER,
        password=Config.DB_PASSWORD,
        port=Config.DB_PORT
    )
    
    #autocommit off so we can undo if error
    conn.autocommit = False
    cur = conn.cursor()
    
    try:
        # Table creation dictionary, key: table name, value: CREATE TABLE statement
        tables = {
            'LaboratoryUser': """
                CREATE TABLE IF NOT EXISTS LaboratoryUser (
                    UserID VARCHAR(50) PRIMARY KEY,           -- e.g., "EMP12345"
                    Email VARCHAR(255) UNIQUE NOT NULL,       -- Lab email
                    Password VARCHAR(255) NOT NULL,          -- Hashed password
                    Fullname VARCHAR(255) NOT NULL,

                    -- for lab employees
                    EmployeeID VARCHAR(50) UNIQUE,
                    IsFirstLogin BOOLEAN DEFAULT TRUE,
                    FailedLoginAttempts INTEGER DEFAULT 0
                );
            """,
            
            'DNAfile': """
                CREATE TABLE IF NOT EXISTS DNAfile (
                    FileID VARCHAR(50) PRIMARY KEY,
                    original_name VARCHAR(255),
                    stored_name VARCHAR(255),
                    filepath TEXT,
                    size BIGINT,
                    extension VARCHAR(10),
                    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """,
            
            'Reports': """
                CREATE TABLE IF NOT EXISTS Reports (
                    sequence_id VARCHAR(50) PRIMARY KEY,
                    accuracy DECIMAL(5,2),
                    variant_info TEXT,
                    fullname VARCHAR(255),
                    patientInfo TEXT,
                    age INTEGER,
                    gender VARCHAR(20),
                    analysis_result TEXT,
                    pdf_path TEXT
                );
            """,
            
            # Relationship tables (many-to-many)
            'view_download': """
                CREATE TABLE IF NOT EXISTS view_download (
                    UserID VARCHAR(50) NOT NULL,
                    sequence_id VARCHAR(50) NOT NULL,
                    view_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (UserID, sequence_id),
                    FOREIGN KEY (UserID) REFERENCES LaboratoryUser(UserID) 
                        ON DELETE CASCADE ON UPDATE CASCADE,
                    FOREIGN KEY (sequence_id) REFERENCES Reports(sequence_id) 
                        ON DELETE CASCADE ON UPDATE CASCADE
                );
            """,
            
            'UPLOAD': """
                CREATE TABLE IF NOT EXISTS UPLOAD (
                    UserID VARCHAR(50) NOT NULL,
                    FileID VARCHAR(50) NOT NULL,
                    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (UserID, FileID),
                    FOREIGN KEY (UserID) REFERENCES LaboratoryUser(UserID) 
                        ON DELETE CASCADE ON UPDATE CASCADE,
                    FOREIGN KEY (FileID) REFERENCES DNAfile(FileID) 
                        ON DELETE CASCADE ON UPDATE CASCADE
                );
            """,
            
            'contains': """
                CREATE TABLE IF NOT EXISTS contains (
                    sequence_id VARCHAR(50) NOT NULL,
                    FileID VARCHAR(50) NOT NULL,
                    PRIMARY KEY (sequence_id, FileID),
                    FOREIGN KEY (sequence_id) REFERENCES Reports(sequence_id) 
                        ON DELETE CASCADE ON UPDATE CASCADE,
                    FOREIGN KEY (FileID) REFERENCES DNAfile(FileID) 
                        ON DELETE CASCADE ON UPDATE CASCADE
                );
            """
        }
        
        # Create tables in order (respecting foreign key dependencies)
        table_order = [
            'LaboratoryUser',
            'DNAfile', 
            'Reports',
            'view_download',
            'UPLOAD',
            'contains'
        ]
        
        print("Creating database schema...\n")
        
        for table_name in table_order:
            print(f"Creating table: {table_name}")
            cur.execute(tables[table_name])
            print(f"✓ {table_name} created successfully\n")
        
        # Commit all changes
        conn.commit()
        print("All tables created successfully!")
        
        # Display table information
        #what does this do?
        cur.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name;
        """)
        
        print("\nExisting tables in database:")
        for table in cur.fetchall():
            print(f"  - {table[0]}")
            
    except psycopg2.Error as e:
        print(f"Database error: {e}")
        conn.rollback()
        
    finally:
        cur.close()
        conn.close()
        print("\nDatabase connection closed.")


def drop_all_tables():
    """Drop all tables (useful for testing/resetting)"""
    conn = psycopg2.connect(
        host="localhost", 
        database="geno", 
        user="postgres", 
        password="geno", 
        port=5432
    )
    
    cur = conn.cursor()
    
    try:
        # Drop in reverse order due to foreign key constraints
        tables_to_drop = [
            'contains',
            'UPLOAD',
            'view_download',
            'Reports',
            'DNAfile',
            'LaboratoryUser'
        ]
        
        print("Dropping tables...\n")
        for table in tables_to_drop:
            cur.execute(f"DROP TABLE IF EXISTS {table} CASCADE;")
            print(f"✓ Dropped {table}")
        
        conn.commit()
        print("\nAll tables dropped successfully!")
        
    except psycopg2.Error as e:
        print(f"Error: {e}")
        conn.rollback()
        
    finally:
        cur.close()
        conn.close()


def insert_sample_data():
    """Insert sample data for testing"""
    conn = psycopg2.connect(
        host="localhost", 
        database="geno", 
        user="postgres", 
        password="geno", 
        port=5432
    )
    
    cur = conn.cursor()
    
    try:
        # Sample user
        cur.execute("""
            INSERT INTO LaboratoryUser (UserID, Email, Password, Fullname)
            VALUES ('user001', 'john.doe@lab.com', 'hashed_password', 'John Doe')
            ON CONFLICT (UserID) DO NOTHING;
        """)
        
        # Sample DNA file
        cur.execute("""
            INSERT INTO DNAfile (FileID)
            VALUES ('DNA001')
            ON CONFLICT (FileID) DO NOTHING;
        """)
        
        # Sample report
        cur.execute("""
            INSERT INTO Reports (sequence_id, accuracy, variant_info, fullname, 
                                patientInfo, age, gender, analysis_result)
            VALUES ('SEQ001', 98.5, 'No significant variants', 'Jane Smith', 
                    'Patient shows normal markers', 35, 'Female', 'Normal')
            ON CONFLICT (sequence_id) DO NOTHING;
        """)
        
        conn.commit()
        print("Sample data inserted successfully!")
        
    except psycopg2.Error as e:
        print(f"Error inserting data: {e}")
        conn.rollback()
        
    finally:
        cur.close()
        conn.close()


if __name__ == "__main__":
    # Create the schema
    create_database_schema()
    
    # Insert sample data (optional)
    # insert_sample_data()
    
    # Drop all tables (use with caution!)
    # drop_all_tables()
