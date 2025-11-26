from DB.db_operations import DatabaseOperations
from utils.auth_utils import hash_password
import secrets
import string

class AdminOperations:
    
    @staticmethod
    def generate_employee_id(department_code="LAB"):
        """Generate unique employee ID"""
        import time
        timestamp = str(int(time.time()))[-6:]  # Last 6 digits of timestamp
        return f"{department_code}-{timestamp}"
    
    @staticmethod
    def generate_temporary_password(length=12):
        """Generate secure temporary password"""
        alphabet = string.ascii_letters + string.digits + "!@#$%"
        password = ''.join(secrets.choice(alphabet) for i in range(length))
        return password
    
    @staticmethod
    def create_lab_user(fullname, email):
        """Admin creates a new lab user account"""
        
        # Generate credentials
        employee_id = AdminOperations.generate_employee_id()
        temp_password = AdminOperations.generate_temporary_password()
        hashed_password = hash_password(temp_password)
        
        # Create user
        query = """
            INSERT INTO LaboratoryUser 
            (UserID, Email, Password, Fullname, EmployeeID, IsFirstLogin)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING UserID, EmployeeID
        """
        
        try:
            result = DatabaseOperations.execute_query(
                query, 
                (employee_id, email, hashed_password, fullname, employee_id, 
                  True),
                fetch=True
            )
            
            return {
                'success': True,
                'employee_id': employee_id,
                'temporary_password': temp_password,  # Return to admin to give to user
                'email': email
            }
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    # @staticmethod
    # def reset_user_password(employee_id):
    #     """Admin resets a user's password"""
    #     temp_password = AdminOperations.generate_temporary_password()
    #     hashed_password = hash_password(temp_password)
        
    #     query = """
    #         UPDATE LaboratoryUser
    #         SET Password = %s, 
    #             IsFirstLogin = TRUE,
    #             FailedLoginAttempts = 0,
    #             AccountLockedUntil = NULL,
    #             PasswordLastChanged = CURRENT_TIMESTAMP
    #         WHERE EmployeeID = %s
    #         RETURNING Email
    #     """
        
    #     try:
    #         result = DatabaseOperations.execute_query(
    #             query, (hashed_password, employee_id), fetch=True
    #         )
            
    #         if result:
    #             return {
    #                 'success': True,
    #                 'temporary_password': temp_password,
    #                 'email': result[0]['email']
    #             }
    #         return {'success': False, 'error': 'User not found'}
            
    #     except Exception as e:
    #         return {'success': False, 'error': str(e)}
    
    @staticmethod
    def get_all_lab_users():
        """Get list of all lab users"""
        query = """
            SELECT UserID, EmployeeID, Email, Fullname, Department, 
                   Role, LabLocation, IsActive, CreatedAt, LastLogin
            FROM LaboratoryUser
            ORDER BY CreatedAt DESC
        """
        return DatabaseOperations.execute_query(query, fetch=True)