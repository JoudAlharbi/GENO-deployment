"""WSGI entry for production (gunicorn wsgi:app)."""
from app_config import Config

if Config.IS_PRODUCTION and Config.SECRET_KEY == 'genosecret':
    raise RuntimeError('SECRET_KEY must be set in production (Render/host env vars).')

from app import app

__all__ = ['app']
