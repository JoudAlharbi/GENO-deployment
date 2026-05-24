import sys
from pathlib import Path

backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from app_config import Config

if Config.DEMO_MODE:
    from stores import memory_store as _store
else:
    from psycopg2.extras import RealDictCursor
    from utils.db_connection import get_db_connection


class DatabaseOperations:

    @staticmethod
    def execute_query(query, params=None, fetch=False):
        if Config.DEMO_MODE:
            return _store.execute_query(query, params, fetch)

        conn = None
        cur = None
        try:
            conn = get_db_connection()
            cur = conn.cursor(cursor_factory=RealDictCursor)
            cur.execute(query, params)
            if fetch:
                result = cur.fetchall()
                cur.close()
                conn.close()
                return result
            conn.commit()
            cur.close()
            conn.close()
            return True
        except Exception as e:
            if conn:
                try:
                    conn.rollback()
                except Exception:
                    pass
            if cur:
                try:
                    cur.close()
                except Exception:
                    pass
            if conn:
                try:
                    conn.close()
                except Exception:
                    pass
            print(f"Database error in execute_query: {str(e)}")
            print(f"Query: {query[:100]}...")
            raise e

    @staticmethod
    def create_user(user_id, hashed_password, fullname):
        if Config.DEMO_MODE:
            _store.upsert_user(user_id, '', fullname, user_id, hashed_password)
            return True
        query = """
            INSERT INTO LaboratoryUser (UserID, Password, Fullname)
            VALUES (%s, %s, %s)
        """
        return DatabaseOperations.execute_query(
            query, (user_id, hashed_password, fullname)
        )

    @staticmethod
    def get_user_by_id(user_id):
        if Config.DEMO_MODE:
            return _store.get_user_by_id(user_id)
        query = "SELECT * FROM LaboratoryUser WHERE UserID = %s"
        result = DatabaseOperations.execute_query(query, (user_id,), fetch=True)
        return result[0] if result else None

    @staticmethod
    def create_report(
        sequence_id, accuracy, variant_info, fullname,
        patient_info, age, gender, analysis_result, pdf_path=None,
    ):
        if Config.DEMO_MODE:
            return _store.create_report(
                sequence_id, accuracy, variant_info, fullname,
                patient_info, age, gender, analysis_result, pdf_path,
            )
        query = """
            INSERT INTO Reports
            (sequence_id, accuracy, variant_info, fullname, patientInfo,
             age, gender, analysis_result, pdf_path, saved_date)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP)
        """
        return DatabaseOperations.execute_query(
            query,
            (sequence_id, accuracy, variant_info, fullname,
             patient_info, age, gender, analysis_result, pdf_path),
        )

    @staticmethod
    def update_report_pdf_path(sequence_id, pdf_path):
        if Config.DEMO_MODE:
            return _store.update_report_pdf_path(sequence_id, pdf_path)
        query = """
            UPDATE Reports SET pdf_path = %s WHERE sequence_id = %s
        """
        return DatabaseOperations.execute_query(query, (pdf_path, sequence_id))

    @staticmethod
    def get_all_reports():
        if Config.DEMO_MODE:
            return _store.get_all_reports()
        query = "SELECT * FROM Reports ORDER BY sequence_id DESC"
        return DatabaseOperations.execute_query(query, fetch=True)

    @staticmethod
    def get_report_by_id(sequence_id):
        if Config.DEMO_MODE:
            return _store.get_report_by_id(sequence_id)
        query = "SELECT * FROM Reports WHERE sequence_id = %s"
        result = DatabaseOperations.execute_query(query, (sequence_id,), fetch=True)
        return result[0] if result else None

    @staticmethod
    def get_reports_for_user(user_id):
        if Config.DEMO_MODE:
            return _store.get_reports_for_user(user_id)
        query = """
            SELECT DISTINCT r.*
            FROM Reports r
            JOIN contains c ON r.sequence_id = c.sequence_id
            JOIN UPLOAD u ON c.FileID = u.FileID
            WHERE u.UserID = %s
            ORDER BY r.sequence_id DESC
        """
        return DatabaseOperations.execute_query(query, (user_id,), fetch=True)

    @staticmethod
    def create_dna_file(file_id):
        if Config.DEMO_MODE:
            return True
        query = "INSERT INTO DNAfile (FileID) VALUES (%s)"
        return DatabaseOperations.execute_query(query, (file_id,))

    @staticmethod
    def link_user_file_upload(user_id, file_id):
        if Config.DEMO_MODE:
            return True
        query = """
            INSERT INTO UPLOAD (UserID, FileID, upload_date)
            VALUES (%s, %s, CURRENT_TIMESTAMP)
        """
        return DatabaseOperations.execute_query(query, (user_id, file_id))

    @staticmethod
    def link_report_file(sequence_id, file_id):
        if Config.DEMO_MODE:
            return _store.link_file_to_report(file_id, sequence_id)
        query = """
            INSERT INTO contains (sequence_id, FileID) VALUES (%s, %s)
        """
        return DatabaseOperations.execute_query(query, (sequence_id, file_id))

    @staticmethod
    def record_report_view(user_id, sequence_id):
        if Config.DEMO_MODE:
            return _store.record_report_view(user_id, sequence_id)
        query = """
            INSERT INTO view_download (UserID, sequence_id, view_date)
            VALUES (%s, %s, CURRENT_TIMESTAMP)
            ON CONFLICT (UserID, sequence_id) DO UPDATE
            SET view_date = CURRENT_TIMESTAMP
        """
        return DatabaseOperations.execute_query(query, (user_id, sequence_id))
