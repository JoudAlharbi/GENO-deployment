from app_config import Config
from DB.db_operations import DatabaseOperations

if Config.DEMO_MODE:
    from stores import memory_store as _store


class FileOperations:

    @staticmethod
    def create_dna_file(file_id, user_id, original_name, stored_name,
                        filepath, file_size, extension):
        if Config.DEMO_MODE:
            _store.create_dna_file(
                file_id, user_id, original_name, stored_name,
                filepath, file_size, extension,
            )
            return {
                'file_id': file_id,
                'original_name': original_name,
                'stored_name': stored_name,
                'size': file_size,
                'extension': extension,
            }

        query1 = """
            INSERT INTO DNAfile (FileID, original_name, stored_name, filepath, size, extension, upload_date)
            VALUES (%s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP)
        """
        DatabaseOperations.execute_query(
            query1, (file_id, original_name, stored_name, filepath, file_size, extension)
        )
        query2 = """
            INSERT INTO UPLOAD (UserID, FileID, upload_date)
            VALUES (%s, %s, CURRENT_TIMESTAMP)
        """
        DatabaseOperations.execute_query(query2, (user_id, file_id))
        return {
            'file_id': file_id,
            'original_name': original_name,
            'stored_name': stored_name,
            'size': file_size,
            'extension': extension,
        }

    @staticmethod
    def get_user_files(user_id):
        if Config.DEMO_MODE:
            return _store.get_user_files(user_id)
        query = """
            SELECT d.FileID, u.upload_date
            FROM DNAfile d
            JOIN UPLOAD u ON d.FileID = u.FileID
            WHERE u.UserID = %s
            ORDER BY u.upload_date DESC
        """
        return DatabaseOperations.execute_query(query, (user_id,), fetch=True)

    @staticmethod
    def get_file_by_id(file_id):
        if Config.DEMO_MODE:
            return _store.get_file_by_id(file_id)
        query = """
            SELECT d.FileID, u.UserID, u.upload_date
            FROM DNAfile d
            JOIN UPLOAD u ON d.FileID = u.FileID
            WHERE d.FileID = %s
        """
        result = DatabaseOperations.execute_query(query, (file_id,), fetch=True)
        return result[0] if result else None

    @staticmethod
    def delete_file_record(file_id):
        if Config.DEMO_MODE:
            return _store.delete_file_record(file_id)
        query = "DELETE FROM DNAfile WHERE FileID = %s"
        DatabaseOperations.execute_query(query, (file_id,))

    @staticmethod
    def link_file_to_report(file_id, sequence_id):
        if Config.DEMO_MODE:
            return _store.link_file_to_report(file_id, sequence_id)
        query = """
            INSERT INTO contains (sequence_id, FileID) VALUES (%s, %s)
        """
        DatabaseOperations.execute_query(query, (sequence_id, file_id))

    @staticmethod
    def get_file_report(file_id):
        if Config.DEMO_MODE:
            return _store.get_file_report(file_id)
        query = """
            SELECT r.*
            FROM Reports r
            JOIN contains c ON r.sequence_id = c.sequence_id
            WHERE c.FileID = %s
        """
        result = DatabaseOperations.execute_query(query, (file_id,), fetch=True)
        return result[0] if result else None

    @staticmethod
    def get_report_files(sequence_id):
        if Config.DEMO_MODE:
            return _store.get_report_files(sequence_id)
        query = """
            SELECT d.FileID
            FROM DNAfile d
            JOIN contains c ON d.FileID = c.FileID
            WHERE c.sequence_id = %s
        """
        return DatabaseOperations.execute_query(query, (sequence_id,), fetch=True)
