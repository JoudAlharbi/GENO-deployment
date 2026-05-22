"""Shared request authentication helpers for Flask routes."""

from flask import request

from utils.auth_utils import verify_token


def get_current_user():
    """Extract and verify user from Bearer JWT token."""
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    if not token:
        return None
    return verify_token(token)
