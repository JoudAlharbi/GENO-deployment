import psycopg2
from psycopg2.extras import RealDictCursor
from config import Config

def get_db_connection():
    """Create and return a database connection"""
    return psycopg2.connect(
        host=Config.DB_HOST,
        database=Config.DB_NAME,
        user=Config.DB_USER,
        password=Config.DB_PASSWORD,
        port=Config.DB_PORT
    )

class DatabaseOperations:
    
    #@staticmethod: Don't need to create an instance, just call DatabaseOperations.method_name()

    @staticmethod
    def execute_query(query, params=None, fetch=False):
        """Execute a query and optionally fetch results"""
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor) #better than default cursor, shows column names
        
        try:
            cur.execute(query, params)
            
            if fetch:
                result = cur.fetchall()
                cur.close()
                conn.close()
                return result
            else:
                conn.commit()
                cur.close()
                conn.close()
                return True
                
        except Exception as e:
            conn.rollback()
            cur.close()
            conn.close()
            raise e
    
    # User Operations-----------------------------------
    @staticmethod
    def create_user(user_id, hashed_password, fullname):
        query = """
            INSERT INTO LaboratoryUser (UserID, Password, Fullname)
            VALUES (%s, %s, %s)
        """
        return DatabaseOperations.execute_query(
            query, (user_id, hashed_password, fullname)
        )
    
    @staticmethod
    def get_user_by_id(user_id):
        query = "SELECT * FROM LaboratoryUser WHERE UserID = %s"
        result = DatabaseOperations.execute_query(query, (user_id,), fetch=True)
        return result[0] if result else None
    
    # Report Operations-------------------------------------
    @staticmethod
    def create_report(sequence_id, accuracy, variant_info, fullname, 
                     patient_info, age, gender, analysis_result, pdf_path=None):
        query = """
            INSERT INTO Reports 
            (sequence_id, accuracy, variant_info, fullname, patientInfo, 
             age, gender, analysis_result, pdf_path, saved_date)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP)
        """
        return DatabaseOperations.execute_query(
            query, (sequence_id, accuracy, variant_info, fullname, 
                   patient_info, age, gender, analysis_result, pdf_path)
        )
    
    @staticmethod
    def update_report_pdf_path(sequence_id, pdf_path):
        """Update the PDF path for a report"""
        query = """
            UPDATE Reports
            SET pdf_path = %s
            WHERE sequence_id = %s
        """
        return DatabaseOperations.execute_query(query, (pdf_path, sequence_id))
    
    @staticmethod
    def get_all_reports():
        query = "SELECT * FROM Reports ORDER BY sequence_id DESC"
        return DatabaseOperations.execute_query(query, fetch=True)
    
    @staticmethod
    def get_report_by_id(sequence_id):
        query = "SELECT * FROM Reports WHERE sequence_id = %s"
        result = DatabaseOperations.execute_query(query, (sequence_id,), fetch=True)
        return result[0] if result else None
    
    # File Operations---------------------------------------
    @staticmethod
    def create_dna_file(file_id):
        query = "INSERT INTO DNAfile (FileID) VALUES (%s)"
        return DatabaseOperations.execute_query(query, (file_id,))
    
    @staticmethod
    def link_user_file_upload(user_id, file_id):
        query = """
            INSERT INTO UPLOAD (UserID, FileID, upload_date)
            VALUES (%s, %s, CURRENT_TIMESTAMP)
        """
        return DatabaseOperations.execute_query(query, (user_id, file_id))
    
    @staticmethod
    def link_report_file(sequence_id, file_id):
        query = """
            INSERT INTO contains (sequence_id, FileID)
            VALUES (%s, %s)
        """
        return DatabaseOperations.execute_query(query, (sequence_id, file_id))
    
    @staticmethod
    def record_report_view(user_id, sequence_id):
        query = """
            INSERT INTO view_download (UserID, sequence_id, view_date)
            VALUES (%s, %s, CURRENT_TIMESTAMP)
            ON CONFLICT (UserID, sequence_id) DO UPDATE
            SET view_date = CURRENT_TIMESTAMP
        """
        return DatabaseOperations.execute_query(query, (user_id, sequence_id))