from flask import Blueprint, request, jsonify, send_file
from utils.file_utils import FileHandler
from DB.file_operations import FileOperations
from DB.db_operations import DatabaseOperations
from utils.auth_utils import verify_token
from utils.ai_processor import process_genetic_data
from utils.pdf_generator import save_pdf_report
import os
import sys
import glob
from pathlib import Path
# Add the backend directory to the Python path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from app_config import Config 

files_bp = Blueprint('files', __name__)

def get_current_user():
    """
    Extract user from JWT token
    User must have logged in with lab credentials (Employee ID + Password)
    Admin creates all accounts - no self-registration
    """
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    if not token:
        return None
    return verify_token(token)


@files_bp.route('/upload', methods=['POST'])
def upload_file():
    """
    Upload a DNA file
    Expects: multipart/form-data with 'file' field
    """
    # Verify authentication
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Authentication required'}), 401
    
    # Check if file is in request
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    
    # Save file
    result = FileHandler.save_uploaded_file(file, user['user_id'])
    
    if 'error' in result:
        return jsonify({'error': result['error']}), 400
    
    # Validate file format
    if result['extension'] in ['fasta', 'fa']:
        validation = FileHandler.validate_fasta_format(result['filepath'])
        if not validation['valid']:
            # Delete invalid file
            FileHandler.delete_file(result['filepath'])
            return jsonify({'error': f"Invalid file format: {validation['error']}"}), 400
        
        # Get sequence statistics
        stats = FileHandler.get_sequence_stats(result['filepath'])
        result['stats'] = stats
    elif result['extension'] in ['csv', 'txt']:
        # Validate CSV format for gene expression data
        validation = FileHandler.validate_csv_format(result['filepath'])
        if not validation['valid']:
            # Delete invalid file
            FileHandler.delete_file(result['filepath'])
            return jsonify({'error': f"Invalid CSV format: {validation['error']}"}), 400
        
        # Get CSV statistics
        stats = FileHandler.get_csv_stats(result['filepath'])
        result['stats'] = stats
    
    # Store in database
    try:
        file_record = FileOperations.create_dna_file(
            file_id=result['file_id'],
            user_id=user['user_id'],
            original_name=result['original_name'],
            stored_name=result['stored_name'],
            filepath=result['filepath'],
            file_size=result['size'],
            extension=result['extension']
        )
        
        response_data = {
            'message': 'File uploaded successfully',
            'file': {
                'file_id': result['file_id'],
                'original_name': result['original_name'],
                'size': result['size'],
                'extension': result['extension'],
                'stats': result.get('stats', {})
            }
        }
        
        # Check if immediate processing is requested
        process_immediately = request.form.get('process_immediately', 'false').lower() == 'true'
        
        if process_immediately and result['extension'] in ['csv', 'txt']:
            try:
                # Process file through AI
                analysis_result = process_genetic_data(result['filepath'], result['file_id'])
                
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
                FileOperations.link_file_to_report(result['file_id'], analysis_result['sequence_id'])
                
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
                
                response_data['message'] = 'File uploaded and processed successfully'
                response_data['report'] = {
                    'sequence_id': analysis_result['sequence_id'],
                    'accuracy': analysis_result['accuracy'],
                    'status': 'completed',
                    'pdf_generated': pdf_path is not None
                }
            except Exception as e:
                # Processing failed, but file was uploaded successfully
                response_data['processing_error'] = f"Processing failed: {str(e)}"
                response_data['message'] = 'File uploaded successfully, but processing failed'
        
        return jsonify(response_data), 201
        
    except Exception as e:
        # If database insert fails, delete the file
        FileHandler.delete_file(result['filepath'])
        return jsonify({'error': f"Database error: {str(e)}"}), 500


@files_bp.route('/download/<file_id>', methods=['GET'])
def download_file(file_id):
    """Download a file by its ID"""
    # Verify authentication
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Authentication required'}), 401
    
    # Get file info from database
    file_record = FileOperations.get_file_by_id(file_id)
    
    if not file_record:
        return jsonify({'error': 'File not found'}), 404
    
    # Check if user has access (owns the file or has viewed associated report)
    if file_record['userid'] != user['user_id']:
        # Check if user has viewed the report containing this file
        report = FileOperations.get_file_report(file_id)
        if not report:
            return jsonify({'error': 'Access denied'}), 403
    
    # Construct file path
    filepath = os.path.join(
        Config.UPLOAD_FOLDER, 
        file_record['userid'],
        f"{file_id}.*"  # We need to find the actual file
    )
    
    # Find the actual file
    import glob
    files = glob.glob(filepath)
    
    if not files:
        return jsonify({'error': 'File not found on server'}), 404
    
    actual_filepath = files[0]
    
    # Send file
    try:
        return send_file(
            actual_filepath,
            as_attachment=True,
            download_name=os.path.basename(actual_filepath)
        )
    except Exception as e:
        return jsonify({'error': f"Error sending file: {str(e)}"}), 500


@files_bp.route('/preview/<file_id>', methods=['GET'])
def preview_file(file_id):
    """Get a preview of file content (first 100 lines)"""
    # Verify authentication
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Authentication required'}), 401
    
    # Get file info
    file_record = FileOperations.get_file_by_id(file_id)
    if not file_record:
        return jsonify({'error': 'File not found'}), 404
    
    # Check access
    if file_record['userid'] != user['user_id']:
        return jsonify({'error': 'Access denied'}), 403
    
    # Find file path
    import glob
    filepath = os.path.join(Config.UPLOAD_FOLDER, file_record['userid'], f"{file_id}.*")
    files = glob.glob(filepath)
    
    if not files:
        return jsonify({'error': 'File not found on server'}), 404
    
    # Read file content
    max_lines = request.args.get('lines', 100, type=int)
    content = FileHandler.read_file_content(files[0], max_lines)
    
    if content['success']:
        return jsonify({
            'file_id': file_id,
            'preview': content['lines'],
            'total_lines_read': content['total_lines'],
            'is_partial': content['total_lines'] >= max_lines
        }), 200
    else:
        return jsonify({'error': content['error']}), 500


@files_bp.route('/my-files', methods=['GET'])
def get_my_files():
    """Get all files uploaded by current user"""
    # Verify authentication
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Authentication required'}), 401
    
    # Get user's files
    files = FileOperations.get_user_files(user['user_id'])
    
    # Add file metadata
    file_list = []
    for file_record in files:
        # Find actual file to get size
        import glob
        filepath = os.path.join(
            Config.UPLOAD_FOLDER, 
            user['user_id'],
            f"{file_record['fileid']}.*"
        )
        files_found = glob.glob(filepath)
        
        if files_found:
            file_info = FileHandler.get_file_info(files_found[0])
            file_list.append({
                'file_id': file_record['fileid'],
                'upload_date': file_record['upload_date'].isoformat(),
                'size': file_info['size'] if file_info else 0,
                'extension': os.path.splitext(files_found[0])[1][1:]
            })
    
    return jsonify({
        'total_files': len(file_list),
        'files': file_list
    }), 200


@files_bp.route('/delete/<file_id>', methods=['DELETE'])
def delete_file(file_id):
    """Delete a file"""
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
    
    # Find and delete physical file
    import glob
    filepath = os.path.join(Config.UPLOAD_FOLDER, user['user_id'], f"{file_id}.*")
    files = glob.glob(filepath)
    
    if files:
        FileHandler.delete_file(files[0])
    
    # Delete from database
    try:
        FileOperations.delete_file_record(file_id)
        return jsonify({'message': 'File deleted successfully'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@files_bp.route('/stats/<file_id>', methods=['GET'])
def get_file_stats(file_id):
    """Get statistics about a DNA sequence file"""
    # Verify authentication
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Authentication required'}), 401
    
    # Get file info
    file_record = FileOperations.get_file_by_id(file_id)
    if not file_record:
        return jsonify({'error': 'File not found'}), 404
    
    # Check access
    if file_record['userid'] != user['user_id']:
        return jsonify({'error': 'Access denied'}), 403
    
    # Find file
    import glob
    filepath = os.path.join(Config.UPLOAD_FOLDER, user['user_id'], f"{file_id}.*")
    files = glob.glob(filepath)
    
    if not files:
        return jsonify({'error': 'File not found on server'}), 404
    
    # Get stats (if FASTA file)
    extension = os.path.splitext(files[0])[1][1:]
    if extension in ['fasta', 'fa']:
        stats = FileHandler.get_sequence_stats(files[0])
        return jsonify({
            'file_id': file_id,
            'format': 'FASTA',
            'statistics': stats
        }), 200
    else:
        return jsonify({
            'file_id': file_id,
            'format': extension.upper(),
            'message': 'Statistics not available for this file type'
        }), 200