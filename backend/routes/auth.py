from flask import Blueprint, request, jsonify
from DB.db_operations import DatabaseOperations
from utils.auth_utils import hash_password, verify_password, generate_token
from datetime import datetime
import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/login', methods=['POST'])
def login():
    try:
        data = request.get_json()

        employee_id = data.get('employee_id') or data.get('company_id')
        password = data.get('password')

        if employee_id == "DEMO01" and password == "demo123":
            return jsonify({
                'message': 'Login successful',
                'token': 'demo-token',
                'user': {
                    'user_id': 1,
                    'employee_id': 'DEMO01',
                    'email': 'demo@geno.com',
                    'fullname': 'Demo User',
                }
            }), 200

        return jsonify({'error': 'Invalid credentials'}), 401

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@auth_bp.route('/change-password', methods=['POST'])
def change_password():
    """User changes their password (first login or voluntary)"""
    data = request.get_json()
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    
    if not token:
        return jsonify({'error': 'Authorization required'}), 401
    
    # Verify token
    #why? to ensure the user is authenticated and authorized to change their password
    from utils.auth_utils import verify_token
    payload = verify_token(token)
    if not payload:
        return jsonify({'error': 'Invalid or expired token'}), 401
    
    # Validate input
    required = ['current_password', 'new_password']
    if not all(field in data for field in required):
        return jsonify({'error': 'Current and new password required'}), 400
    
    # Password strength validation
    if len(data['new_password']) < 4:
        return jsonify({'error': 'Password must be at least 4 characters'}), 400

    # Get user
    user = DatabaseOperations.get_user_by_id(payload['user_id'])
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    # Verify current password
    if not verify_password(data['current_password'], user['password']):
        return jsonify({'error': 'Current password incorrect'}), 401
    
    # Check new password is different
    if verify_password(data['new_password'], user['password']):
        return jsonify({'error': 'New password must be different'}), 400
    
    # Update password
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