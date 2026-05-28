import os
import sys
from pathlib import Path

from flask import Flask, jsonify, request
from flask_cors import CORS

from app_config import Config
from routes.auth import auth_bp
from routes.files import files_bp
from routes.reports import reports_bp

backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

def _cors_origins():
    raw = Config.CORS_ORIGINS.strip()
    if not raw or raw == '*':
        return '*'
    return [o.strip() for o in raw.split(',') if o.strip()]


app = Flask(__name__)
CORS(
    app,
    origins=_cors_origins(),
    supports_credentials=False,
    allow_headers=['Content-Type', 'Authorization'],
    expose_headers=['Content-Type'],
    methods=['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
)
app.config.from_object('config.Config')

os.makedirs(Config.UPLOAD_FOLDER, exist_ok=True)
os.makedirs(Config.REPORTS_FOLDER, exist_ok=True)

if Config.DEMO_MODE:
    from stores.memory_store import init_store
    from stores.demo_persistence import get_runtime_store_path, get_seed_store_path

    init_store()
    print('[GENO] Portfolio demo mode — seeded JSON + runtime store, auth disabled')
    print(f'[GENO] Demo seed file: {get_seed_store_path()}')
    print(f'[GENO] Demo runtime file: {get_runtime_store_path()}')

app.register_blueprint(auth_bp, url_prefix='/api/auth')
app.register_blueprint(files_bp, url_prefix='/api/files')
app.register_blueprint(reports_bp, url_prefix='/api/reports')

DEBUG_REQUESTS = os.getenv('FLASK_DEBUG_REQUESTS', 'false').lower() == 'true'


@app.before_request
def log_request_info():
    if DEBUG_REQUESTS:
        print(f"[APP] {request.method} {request.path}")


@app.route('/api/health', methods=['GET'])
def health_check():
    from utils.db_connection import check_database_connection
    ok, code, details = check_database_connection()
    return jsonify({
        'status': 'ok' if ok else 'degraded',
        'backend': 'running',
        'demo_mode': Config.DEMO_MODE,
        'database': 'demo-json' if Config.DEMO_MODE else Config.DB_NAME,
        'database_status': code,
        'database_details': details,
    }), 200 if ok else 503


@app.route('/api/test-db', methods=['GET'])
def test_database():
    from utils.db_connection import check_database_connection
    ok, code, details = check_database_connection()
    if ok:
        return jsonify({'status': 'success', **details}), 200
    return jsonify({'status': 'error', 'code': code, **details}), 503


@app.route('/api/test-login', methods=['POST', 'OPTIONS'])
def test_login_endpoint():
    """Dev-only connectivity check — disabled when FLASK_DEBUG is false."""
    if os.getenv('FLASK_DEBUG', 'false').lower() != 'true':
        return jsonify({'error': 'Not found'}), 404
    if request.method == 'OPTIONS':
        return jsonify({}), 200
    try:
        data = request.get_json() or {}
        return jsonify({
            'status': 'endpoint_reachable',
            'message': 'Login endpoint is accessible',
        }), 200
    except Exception:
        return jsonify({'error': 'Request failed'}), 500
    
if __name__ == '__main__':
    if Config.IS_PRODUCTION and Config.SECRET_KEY == 'genosecret':
        raise RuntimeError('Set SECRET_KEY in production before starting the server.')
    port = int(os.getenv('PORT', '5000'))
    app.run(host='0.0.0.0', port=port, debug=Config.FLASK_DEBUG)
