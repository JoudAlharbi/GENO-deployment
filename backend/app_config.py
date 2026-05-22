import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

_BACKEND_ROOT = Path(__file__).resolve().parent
_DATA_DIR = Path(os.getenv('DATA_DIR', str(_BACKEND_ROOT)))


class Config:
    # Database
    DB_HOST = os.getenv('DB_HOST', '127.0.0.1')
    DB_NAME = os.getenv('DB_NAME', 'geno')
    DB_USER = os.getenv('DB_USER', 'postgres')
    DB_PASSWORD = os.getenv('DB_PASSWORD', 'geno')
    DB_PORT = os.getenv('DB_PORT', '5432')

    # Security (never use default SECRET_KEY in production)
    SECRET_KEY = os.getenv('SECRET_KEY', 'genosecret')
    JWT_EXPIRATION_HOURS = int(os.getenv('JWT_EXPIRATION_HOURS', '24'))
    FLASK_DEBUG = os.getenv('FLASK_DEBUG', 'false').lower() == 'true'
    IS_PRODUCTION = (
        os.getenv('RENDER', '').lower() in ('true', '1')
        or os.getenv('FLASK_ENV', '').lower() == 'production'
    )

    # File Upload (use DATA_DIR on Render persistent disk if configured)
    UPLOAD_FOLDER = str(_DATA_DIR / 'uploads')
    MAX_FILE_SIZE = 16 * 1024 * 1024  # 16MB
    ALLOWED_EXTENSIONS = {'fasta', 'fa', 'fastq', 'fq', 'vcf', 'bam', 'sam', 'txt', 'ab1', 'csv'}

    # PDF Reports Storage
    REPORTS_FOLDER = str(_DATA_DIR / 'reports')

    # CORS — comma-separated origins in production (e.g. https://your-app.vercel.app)
    # Local dev may use *; set explicit origins when deployed.
    CORS_ORIGINS = os.getenv('CORS_ORIGINS', '*' if not IS_PRODUCTION else '')
    
    # AI Service Configuration (placeholder for future integration)
    AI_SERVICE_ENABLED = os.getenv('AI_SERVICE_ENABLED', 'false').lower() == 'true'
    AI_SERVICE_URL = os.getenv('AI_SERVICE_URL', '')
    AI_SERVICE_API_KEY = os.getenv('AI_SERVICE_API_KEY', '')
    AI_MODEL_PATH = os.getenv('AI_MODEL_PATH', '')