from flask import Flask
from flask_cors import CORS
from routes.auth import auth_bp
from routes.files import files_bp
from routes.reports import reports_bp
import os
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from pathlib import Path
# Add the backend directory to the Python path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))
from app_config import Config 


app = Flask(__name__)
CORS(app)

# Load configuration
app.config.from_object('config.Config')

# Create upload folder if it doesn't exist
os.makedirs(Config.UPLOAD_FOLDER, exist_ok=True)

# Create reports folder if it doesn't exist
os.makedirs(Config.REPORTS_FOLDER, exist_ok=True)

# Register blueprints
app.register_blueprint(auth_bp, url_prefix='/api/auth')
app.register_blueprint(files_bp, url_prefix='/api/files')
app.register_blueprint(reports_bp, url_prefix='/api/reports')

@app.route('/api/health', methods=['GET'])
def health_check():
    return {'status': 'Backend is running'}, 200

if __name__ == '__main__':
    app.run(debug=True, port=5000)