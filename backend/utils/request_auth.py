"""Request authentication — bypassed in portfolio demo mode."""

from functools import wraps

from flask import jsonify

from app_config import Config


def extract_bearer_token():
    return None


def get_current_user():
    """In demo mode always return the public demo lab user (no JWT)."""
    if Config.DEMO_MODE:
        from stores.memory_store import DEMO_EMAIL, DEMO_FULLNAME, DEMO_USER_ID
        uid = Config.DEMO_USER_ID or DEMO_USER_ID
        return {
            'user_id': uid,
            'employee_id': uid,
            'email': DEMO_EMAIL,
            'fullname': DEMO_FULLNAME,
        }
    from flask import request
    from utils.auth_utils import verify_token

    auth_header = request.headers.get('Authorization') or request.headers.get('authorization')
    if not auth_header:
        return None
    parts = auth_header.strip().split(None, 1)
    if len(parts) != 2 or parts[0].lower() != 'bearer':
        return None
    token = parts[1].strip()
    if not token:
        return None
    return verify_token(token)


def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        user = get_current_user()
        if not user:
            return jsonify({'error': 'Authentication required'}), 401
        return f(user, *args, **kwargs)
    return decorated
