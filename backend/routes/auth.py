from flask import Blueprint, request, jsonify
from DB.db_operations import DatabaseOperations
from utils.auth_utils import hash_password, verify_password, generate_token
from utils.request_auth import extract_bearer_token, get_current_user
import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

auth_bp = Blueprint('auth', __name__)


@auth_bp.route('/login', methods=['POST'])
def login():
    """Lab user login with employee credentials — returns a signed JWT."""
    try:
        data = request.get_json() or {}

        if os.getenv('FLASK_DEBUG_REQUESTS', 'false').lower() == 'true':
            emp = data.get('employee_id') or data.get('company_id')
            print(f"Login attempt - Employee ID: {emp}")

        employee_id = (data.get('employee_id') or data.get('company_id') or '').strip()
        password = data.get('password')

        if not employee_id or not password:
            return jsonify({'error': 'Employee ID and password required'}), 400

        query = """
            SELECT * FROM LaboratoryUser
            WHERE EmployeeID = %s OR Email = %s
        """
        result = DatabaseOperations.execute_query(
            query, (employee_id, employee_id), fetch=True
        )

        if not result:
            return jsonify({'error': 'Invalid credentials'}), 401

        user = result[0]

        if not verify_password(password, user['password']):
            increment_query = """
                UPDATE LaboratoryUser
                SET FailedLoginAttempts = FailedLoginAttempts + 1
                WHERE EmployeeID = %s
            """
            DatabaseOperations.execute_query(increment_query, (user['employeeid'],))
            return jsonify({'error': 'Invalid credentials'}), 401

        update_query = """
            UPDATE LaboratoryUser
            SET FailedLoginAttempts = 0
            WHERE EmployeeID = %s
        """
        DatabaseOperations.execute_query(update_query, (user['employeeid'],))

        token = generate_token(user['userid'], user['email'])

        response = {
            'message': 'Login successful',
            'token': token,
            'user': {
                'user_id': user['userid'],
                'employee_id': user['employeeid'],
                'email': user['email'],
                'fullname': user['fullname'],
            },
        }

        if user.get('isfirstlogin'):
            response['requires_password_change'] = True
            response['message'] = 'First login - password change required'

        return jsonify(response), 200

    except Exception as e:
        if os.getenv('FLASK_DEBUG', 'false').lower() == 'true':
            print(f"Login error: {str(e)}")
            import traceback
            traceback.print_exc()
        try:
            from utils.db_connection import format_db_error_for_api
            message, status = format_db_error_for_api(e)
            if status == 503:
                return jsonify({'error': message, 'code': 'database_unavailable'}), status
        except ImportError:
            pass
        return jsonify({'error': 'Login failed. Please try again later.'}), 500


@auth_bp.route('/me', methods=['GET'])
def me():
    """Return current user from JWT (optional auth check endpoint)."""
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Authentication required'}), 401
    return jsonify({
        'user_id': user.get('user_id'),
        'email': user.get('email'),
    }), 200


@auth_bp.route('/change-password', methods=['POST'])
def change_password():
    """User changes their password (first login or voluntary)."""
    data = request.get_json() or {}
    token = extract_bearer_token()

    if not token:
        return jsonify({'error': 'Authorization required'}), 401

    payload = get_current_user()
    if not payload:
        return jsonify({'error': 'Invalid or expired token'}), 401

    required = ['current_password', 'new_password']
    if not all(field in data for field in required):
        return jsonify({'error': 'Current and new password required'}), 400

    if len(data['new_password']) < 4:
        return jsonify({'error': 'Password must be at least 4 characters'}), 400

    user = DatabaseOperations.get_user_by_id(payload['user_id'])
    if not user:
        return jsonify({'error': 'User not found'}), 404

    if not verify_password(data['current_password'], user['password']):
        return jsonify({'error': 'Current password incorrect'}), 401

    if verify_password(data['new_password'], user['password']):
        return jsonify({'error': 'New password must be different'}), 400

    new_hashed = hash_password(data['new_password'])
    query = """
        UPDATE LaboratoryUser
        SET Password = %s,
            IsFirstLogin = FALSE
        WHERE UserID = %s
    """

    try:
        DatabaseOperations.execute_query(query, (new_hashed, payload['user_id']))
        return jsonify({'message': 'Password changed successfully'}), 200
    except Exception as e:
        from utils.safe_errors import safe_error_message
        return jsonify({'error': safe_error_message(e)}), 500
