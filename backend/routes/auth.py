from flask import Blueprint, request, jsonify
import os
import sys

from app_config import Config

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

auth_bp = Blueprint('auth', __name__)


@auth_bp.route('/login', methods=['POST'])
def login():
    """Demo mode: open access. Production: use database auth (set DEMO_MODE=false)."""
    if Config.DEMO_MODE:
        from stores.memory_store import DEMO_EMAIL, DEMO_FULLNAME, DEMO_USER_ID
        uid = Config.DEMO_USER_ID or DEMO_USER_ID
        return jsonify({
            'message': 'Demo mode — no login required',
            'token': 'demo-portfolio',
            'user': {
                'user_id': uid,
                'employee_id': uid,
                'email': DEMO_EMAIL,
                'fullname': DEMO_FULLNAME,
            },
        }), 200

    from DB.db_operations import DatabaseOperations
    from utils.auth_utils import generate_token, verify_password

    try:
        data = request.get_json() or {}
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
            return jsonify({'error': 'Invalid credentials'}), 401

        token = generate_token(user['userid'], user['email'])
        return jsonify({
            'message': 'Login successful',
            'token': token,
            'user': {
                'user_id': user['userid'],
                'employee_id': user['employeeid'],
                'email': user['email'],
                'fullname': user['fullname'],
            },
        }), 200
    except Exception:
        return jsonify({'error': 'Login failed. Please try again later.'}), 500


@auth_bp.route('/me', methods=['GET'])
def me():
    from utils.request_auth import get_current_user
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Authentication required'}), 401
    return jsonify(user), 200


@auth_bp.route('/change-password', methods=['POST'])
def change_password():
    if Config.DEMO_MODE:
        return jsonify({'message': 'Password change disabled in demo mode'}), 200
    return jsonify({'error': 'Not available'}), 501
