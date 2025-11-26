from flask import Blueprint, request, jsonify, send_file #blueprint is used to create a blueprint of the reports route
from DB.db_operations import DatabaseOperations #database operations are used to interact with the database
from DB.file_operations import FileOperations 
from utils.auth_utils import verify_token
from utils.ai_processor import process_genetic_data #process genetic data is placeholder for AI
from utils.file_utils import FileHandler
from utils.pdf_generator import save_pdf_report
import os 
import sys 
import uuid #uuid is used to generate a unique identifier
from pathlib import Path
# Add the backend directory to the Python path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from app_config import Config 

from app_config import Config 

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

reports_bp = Blueprint('reports', __name__)


def get_current_user():
    """
    Extract user from JWT token
    """
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    if not token:
        return None
    return verify_token(token)


@reports_bp.route('/process/<file_id>', methods=['POST'])
def process_file(file_id):
    """
    Process a file through AI and generate a report
    """
    # Verify authentication
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Authentication required'}), 401
    
    # Get file info
    file_record = FileOperations.get_file_by_id(file_id)
    if not file_record:
        return jsonify({'error': 'File not found'}), 404
    
    # Check ownership
    if file_record['userid'] != user['user_id']:
        return jsonify({'error': 'Access denied'}), 403
    
    # Find file path
    import glob
    filepath = os.path.join(Config.UPLOAD_FOLDER, user['user_id'], f"{file_id}.*")
    files = glob.glob(filepath)
    
    if not files:
        return jsonify({'error': 'File not found on server'}), 404
    
    actual_filepath = files[0]
    
    # Validate file format if CSV
    extension = os.path.splitext(actual_filepath)[1][1:].lower()
    if extension in ['csv', 'txt']:
        validation = FileHandler.validate_csv_format(actual_filepath)
        if not validation['valid']:
            return jsonify({'error': f"Invalid file format: {validation['error']}"}), 400
    
    try:
        # Process file through AI
        analysis_result = process_genetic_data(actual_filepath, file_id)
        
        # Store report in database
        DatabaseOperations.create_report(
            sequence_id=analysis_result['sequence_id'],
            accuracy=analysis_result['accuracy'],
            variant_info=analysis_result['variant_info'],
            fullname=analysis_result['fullname'],
            patient_info=analysis_result['patientInfo'],
            age=analysis_result.get('age'),
            gender=analysis_result.get('gender'),
            analysis_result=analysis_result['analysis_result']
        )
        
        # Link file to report
        FileOperations.link_file_to_report(file_id, analysis_result['sequence_id'])
        
        # Generate PDF report (the PDF IS the report)
        try:
            pdf_path = save_pdf_report(
                report_data=analysis_result,
                user_id=user['user_id'],
                sequence_id=analysis_result['sequence_id']
            )
            
            # Update report with PDF path
            DatabaseOperations.update_report_pdf_path(analysis_result['sequence_id'], pdf_path)
        except Exception as pdf_error:
            # PDF generation failed, but report is still created
            print(f"PDF generation failed: {str(pdf_error)}")
        
        return jsonify({
            'message': 'File processed successfully',
            'report': {
                'sequence_id': analysis_result['sequence_id'],
                'file_id': file_id,
                'accuracy': analysis_result['accuracy'],
                'status': 'completed',
                'pdf_generated': pdf_path is not None
            }
        }), 201
        
    except Exception as e:
        return jsonify({'error': f"Processing failed: {str(e)}"}), 500


@reports_bp.route('', methods=['GET'])
def get_reports():
    """
    Get all reports for the current user
    """
    # Verify authentication
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Authentication required'}), 401
    
    try:
        # Get all reports that are linked to files uploaded by this user
        query = """
            SELECT DISTINCT r.*
            FROM Reports r
            JOIN contains c ON r.sequence_id = c.sequence_id
            JOIN UPLOAD u ON c.FileID = u.FileID
            WHERE u.UserID = %s
            ORDER BY r.sequence_id DESC
        """
        reports = DatabaseOperations.execute_query(query, (user['user_id'],), fetch=True)
        
        # Format reports
        report_list = []
        for report in reports:
            # Get associated files
            files = FileOperations.get_report_files(report['sequence_id'])
            report_list.append({
                'sequence_id': report['sequence_id'],
                'accuracy': float(report['accuracy']) if report['accuracy'] else None,
                'variant_info': report['variant_info'],
                'fullname': report['fullname'],
                'patientInfo': report['patientinfo'],
                'age': report['age'],
                'gender': report['gender'],
                'analysis_result': report['analysis_result'],
                'file_count': len(files) if files else 0
            })
        
        return jsonify({
            'total_reports': len(report_list),
            'reports': report_list
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@reports_bp.route('/<sequence_id>', methods=['GET'])
def get_report(sequence_id):
    """
    Get a specific report by sequence_id
    """
    # Verify authentication
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Authentication required'}), 401
    
    try:
        # Get report
        report = DatabaseOperations.get_report_by_id(sequence_id)
        if not report:
            return jsonify({'error': 'Report not found'}), 404
        
        # Check if user has access (owns a file linked to this report)
        query = """
            SELECT COUNT(*) as count
            FROM contains c
            JOIN UPLOAD u ON c.FileID = u.FileID
            WHERE c.sequence_id = %s AND u.UserID = %s
        """
        access_check = DatabaseOperations.execute_query(query, (sequence_id, user['user_id']), fetch=True)
        
        if not access_check or access_check[0]['count'] == 0:
            return jsonify({'error': 'Access denied'}), 403
        
        # Get associated files
        files = FileOperations.get_report_files(sequence_id)
        
        # Format response
        response = {
            'sequence_id': report['sequence_id'],
            'accuracy': float(report['accuracy']) if report['accuracy'] else None,
            'variant_info': report['variant_info'],
            'fullname': report['fullname'],
            'patientInfo': report['patientinfo'],
            'age': report['age'],
            'gender': report['gender'],
            'analysis_result': report['analysis_result'],
            'files': [f['fileid'] for f in files] if files else []
        }
        
        return jsonify(response), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@reports_bp.route('/<sequence_id>/view', methods=['POST'])
def record_report_view(sequence_id):
    """
    Record that a user has viewed a report
    """
    # Verify authentication
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Authentication required'}), 401
    
    try:
        # Check if report exists
        report = DatabaseOperations.get_report_by_id(sequence_id)
        if not report:
            return jsonify({'error': 'Report not found'}), 404
        
        # Check if user has access
        query = """
            SELECT COUNT(*) as count
            FROM contains c
            JOIN UPLOAD u ON c.FileID = u.FileID
            WHERE c.sequence_id = %s AND u.UserID = %s
        """
        access_check = DatabaseOperations.execute_query(query, (sequence_id, user['user_id']), fetch=True)
        
        if not access_check or access_check[0]['count'] == 0:
            return jsonify({'error': 'Access denied'}), 403
        
        # Record view
        DatabaseOperations.record_report_view(user['user_id'], sequence_id)
        
        return jsonify({'message': 'View recorded successfully'}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@reports_bp.route('/<sequence_id>/pdf', methods=['GET'])
def download_pdf_report(sequence_id):
    """
    Download PDF report (the PDF IS the report)
    """
    # Verify authentication
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Authentication required'}), 401
    
    try:
        # Get report
        report = DatabaseOperations.get_report_by_id(sequence_id)
        if not report:
            return jsonify({'error': 'Report not found'}), 404
        
        # Check if user has access
        query = """
            SELECT COUNT(*) as count
            FROM contains c
            JOIN UPLOAD u ON c.FileID = u.FileID
            WHERE c.sequence_id = %s AND u.UserID = %s
        """
        access_check = DatabaseOperations.execute_query(query, (sequence_id, user['user_id']), fetch=True)
        
        if not access_check or access_check[0]['count'] == 0:
            return jsonify({'error': 'Access denied'}), 403
        
        # Check if PDF exists
        pdf_path = report.get('pdf_path')
        if not pdf_path or not os.path.exists(pdf_path):
            return jsonify({'error': 'PDF report not found. Please generate it first.'}), 404
        
        # Send PDF file
        return send_file(
            pdf_path,
            as_attachment=True,
            download_name=f"report_{sequence_id}.pdf",
            mimetype='application/pdf'
        )
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@reports_bp.route('/<sequence_id>/generate-pdf', methods=['POST'])
def generate_pdf_report_endpoint(sequence_id):
    """
    Generate or regenerate PDF report from existing report data
    """
    # Verify authentication
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Authentication required'}), 401
    
    try:
        # Get report
        report = DatabaseOperations.get_report_by_id(sequence_id)
        if not report:
            return jsonify({'error': 'Report not found'}), 404
        
        # Check if user has access
        query = """
            SELECT COUNT(*) as count
            FROM contains c
            JOIN UPLOAD u ON c.FileID = u.FileID
            WHERE c.sequence_id = %s AND u.UserID = %s
        """
        access_check = DatabaseOperations.execute_query(query, (sequence_id, user['user_id']), fetch=True)
        
        if not access_check or access_check[0]['count'] == 0:
            return jsonify({'error': 'Access denied'}), 403
        
        # Prepare report data for PDF generation
        report_data = {
            'sequence_id': report['sequence_id'],
            'accuracy': report['accuracy'],
            'variant_info': report['variant_info'],
            'fullname': report['fullname'],
            'patientInfo': report['patientinfo'],
            'age': report['age'],
            'gender': report['gender'],
            'analysis_result': report['analysis_result']
        }
        
        # Generate PDF report
        pdf_path = save_pdf_report(
            report_data=report_data,
            user_id=user['user_id'],
            sequence_id=sequence_id
        )
        
        # Update report with PDF path
        DatabaseOperations.update_report_pdf_path(sequence_id, pdf_path)
        
        return jsonify({
            'message': 'PDF report generated successfully',
            'pdf_path': pdf_path,
            'sequence_id': sequence_id
        }), 200
        
    except Exception as e:
        return jsonify({'error': f"PDF generation failed: {str(e)}"}), 500

