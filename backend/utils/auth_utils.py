import os
import sys
from datetime import datetime, timedelta

import bcrypt
import jwt

from config import Config

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def _jwt_secret():
    key = Config.SECRET_KEY
    if isinstance(key, str):
        return key
    return str(key)


def hash_password(password):
    """Hash a password using bcrypt."""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')


def verify_password(password, hashed_password):
    """Verify a password against its hash."""
    return bcrypt.checkpw(password.encode('utf-8'), hashed_password.encode('utf-8'))


def generate_token(user_id, email):
    """Generate a JWT token for an authenticated user."""
    payload = {
        'user_id': user_id,
        'email': email,
        'exp': datetime.utcnow() + timedelta(hours=Config.JWT_EXPIRATION_HOURS),
    }

    token = jwt.encode(payload, _jwt_secret(), algorithm='HS256')

    if isinstance(token, bytes):
        token = token.decode('utf-8')

    return token


def verify_token(token):
    """Verify and decode a JWT token. Returns payload dict or None."""
    if not token or not isinstance(token, str):
        return None

    token = token.strip()
    if not token or token == 'demo-token':
        return None

    try:
        payload = jwt.decode(token, _jwt_secret(), algorithms=['HS256'])
        if not payload.get('user_id'):
            return None
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None
