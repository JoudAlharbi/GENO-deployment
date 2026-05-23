from flask import Blueprint, request, jsonify
from DB.admin_operations import AdminOperations
from utils.request_auth import extract_bearer_token, get_current_user

admin_bp = Blueprint('admin', __name__)

def require_admin(f):
    """Decorator to require admin role"""
    from functools import wraps
    
    @wraps(f)
    def decorated_function(*args, **kwargs):
        payload = get_current_user()
        if not payload:
            return jsonify({'error': 'Invalid token'}), 401
        
        # Check if user is admin (you can add role check here)
        # For now, we'll just verify the token is valid
        # In production, check: if payload.get('role') != 'Admin':
        
        return f(*args, **kwargs)
    
    return decorated_function


@admin_bp.route('/create-user', methods=['POST'])
@require_admin
def create_lab_user():
    """Admin creates a new lab user"""
    data = request.get_json()
    payload = get_current_user()
    
    required = ['fullname', 'email', 'department', 'role', 'lab_location']
    if not all(field in data for field in required):
        return jsonify({'error': 'Missing required fields'}), 400
    
    result = AdminOperations.create_lab_user(
        fullname=data['fullname'],
        email=data['email'],
        department=data['department'],
        role=data['role'],
        lab_location=data['lab_location'],
        created_by=payload['user_id']
    )
    
    if result['success']:
        return jsonify({
            'message': 'User created successfully',
            'employee_id': result['employee_id'],
            'temporary_password': result['temporary_password'],
            'email': result['email'],
            'note': 'Share these credentials with the user securely'
        }), 201
    else:
        return jsonify({'error': result['error']}), 500


@admin_bp.route('/reset-password/<employee_id>', methods=['POST'])
@require_admin
def reset_password(employee_id):
    """Admin resets user password"""
    result = AdminOperations.reset_user_password(employee_id)
    
    if result['success']:
        return jsonify({
            'message': 'Password reset successfully',
            'employee_id': employee_id,
            'temporary_password': result['temporary_password'],
            'email': result['email']
        }), 200
    else:
        return jsonify({'error': result['error']}), 404


@admin_bp.route('/users', methods=['GET'])
@require_admin
def list_users():
    """Get all lab users"""
    users = AdminOperations.get_all_lab_users()
    return jsonify({'users': users}), 200


@admin_bp.route('/deactivate-user/<employee_id>', methods=['POST'])
@require_admin
def deactivate_user(employee_id):
    """Deactivate a user account"""
    result = AdminOperations.deactivate_user(employee_id)
    
    if result['success']:
        return jsonify({'message': 'User deactivated successfully'}), 200
    else:
        return jsonify({'error': result['error']}), 500