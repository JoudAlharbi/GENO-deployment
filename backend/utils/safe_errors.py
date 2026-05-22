"""Return detailed errors only when FLASK_DEBUG is enabled."""
import os


def is_debug_mode():
    return os.getenv('FLASK_DEBUG', 'false').lower() == 'true'


def safe_error_message(exc, fallback='An error occurred. Please try again.'):
    if is_debug_mode():
        return str(exc)
    return fallback
