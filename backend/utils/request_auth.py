"""Shared request authentication helpers for Flask routes."""

from functools import wraps

from flask import jsonify, request

from utils.auth_utils import verify_token


def extract_bearer_token():
    """
    Read Authorization: Bearer <token> from the request.
    Handles case-insensitive header name and scheme.
    """
    auth_header = request.headers.get('Authorization') or request.headers.get('authorization')
    if not auth_header:
        return None

    parts = auth_header.strip().split(None, 1)
    if len(parts) != 2 or parts[0].lower() != 'bearer':
        return None

    token = parts[1].strip()
    return token or None


def get_current_user():
    """Extract and verify user from Bearer JWT. Returns payload dict or None."""
    token = extract_bearer_token()
    if not token:
        return None
    return verify_token(token)


def require_auth(f):
    """Decorator: inject verified JWT payload as first argument `user`."""

    @wraps(f)
    def decorated(*args, **kwargs):
        user = get_current_user()
        if not user:
            return jsonify({'error': 'Authentication required'}), 401
        return f(user, *args, **kwargs)

    return decorated
