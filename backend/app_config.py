import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    # Database
    DB_HOST = os.getenv('DB_HOST', 'localhost')
    DB_NAME = os.getenv('DB_NAME', 'geno')
    DB_USER = os.getenv('DB_USER', 'postgres')
    DB_PASSWORD = os.getenv('DB_PASSWORD', 'geno')
    DB_PORT = os.getenv('DB_PORT', '5432')
    
    # Security
    SECRET_KEY = os.getenv('SECRET_KEY', 'genosecret')
    JWT_EXPIRATION_HOURS = 24
    
    # File Upload
    UPLOAD_FOLDER = os.path.join(os.getcwd(), 'uploads')
    MAX_FILE_SIZE = 16 * 1024 * 1024  # 16MB
    ALLOWED_EXTENSIONS = {'fasta', 'fa', 'fastq', 'fq', 'vcf', 'bam', 'sam', 'txt', 'ab1', 'csv'}
    
    # PDF Reports Storage
    REPORTS_FOLDER = os.path.join(os.getcwd(), 'reports')
    
    # AI Service Configuration (placeholder for future integration)
    AI_SERVICE_ENABLED = os.getenv('AI_SERVICE_ENABLED', 'false').lower() == 'true'
    AI_SERVICE_URL = os.getenv('AI_SERVICE_URL', '')
    AI_SERVICE_API_KEY = os.getenv('AI_SERVICE_API_KEY', '')
    AI_MODEL_PATH = os.getenv('AI_MODEL_PATH', '')