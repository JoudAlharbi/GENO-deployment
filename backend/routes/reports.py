from flask import Blueprint, request, jsonify, send_file #blueprint is used to create a blueprint of the reports route
from DB.db_operations import DatabaseOperations #database operations are used to interact with the database
from DB.file_operations import FileOperations 
from utils.request_auth import get_current_user
from utils.report_helpers import (
    parse_analysis_result,
    extract_risk_from_analysis,
    format_report_response,
    format_report_list_item,
    user_has_report_access,
    build_report_data_for_pdf,
)
from utils.ai_processor import process_genetic_data #process genetic data is placeholder for AI
from utils.file_utils import FileHandler
from utils.pdf_generator import save_pdf_report
from utils.safe_errors import safe_error_message
import os 
import sys 
import uuid #uuid is used to generate a unique identifier
import json
from pathlib import Path
# Add the backend directory to the Python path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from app_config import Config

reports_bp = Blueprint('reports', __name__)


@reports_bp.route('/process/<file_id>', methods=['POST'])
def process_file(file_id):
    """
    Process a file through AI and generate a report
    """
    # ========== DEBUG: CONFIRM ROUTE IS CALLED ==========
    print("=" * 80)
    print(f"[ROUTE] /api/reports/process/{file_id} - REQUEST RECEIVED")
    print(f"[ROUTE] Request method: {request.method}")
    print(f"[ROUTE] Request URL: {request.url}")
    print(f"[ROUTE] File ID: {file_id}")
    print(f"[ROUTE] Request headers: {dict(request.headers)}")
    print("=" * 80)
    # ====================================================
    
    # Verify authentication
    print(f"[ROUTE] Checking authentication...")
    user = get_current_user()
    if not user:
        print(f"[ROUTE] ERROR: Authentication failed")
        return jsonify({'error': 'Authentication required'}), 401
    print(f"[ROUTE] Authentication successful. User ID: {user['user_id']}")
    
    # Get file info
    print(f"[ROUTE] Looking up file record for file_id: {file_id}")
    file_record = FileOperations.get_file_by_id(file_id)
    if not file_record:
        print(f"[ROUTE] ERROR: File not found in database")
        return jsonify({'error': 'File not found'}), 404
    print(f"[ROUTE] File record found: {file_record.get('originalname', 'N/A')}")
    
    # Check ownership
    if file_record['userid'] != user['user_id']:
        print(f"[ROUTE] ERROR: Access denied. File owner: {file_record['userid']}, User: {user['user_id']}")
        return jsonify({'error': 'Access denied'}), 403
    print(f"[ROUTE] Ownership verified")
    
    # Find file path
    import glob
    filepath = os.path.join(Config.UPLOAD_FOLDER, user['user_id'], f"{file_id}.*")
    print(f"[ROUTE] Searching for file pattern: {filepath}")
    files = glob.glob(filepath)
    
    if not files:
        print(f"[ROUTE] ERROR: File not found on filesystem")
        return jsonify({'error': 'File not found on server'}), 404
    
    actual_filepath = files[0]
    print(f"[ROUTE] File found at: {actual_filepath}")
    
    # Validate file format if CSV
    extension = os.path.splitext(actual_filepath)[1][1:].lower()
    print(f"[ROUTE] File extension: {extension}")
    if extension in ['csv', 'txt']:
        print(f"[ROUTE] Validating CSV format...")
        validation = FileHandler.validate_csv_format(actual_filepath)
        if not validation['valid']:
            print(f"[ROUTE] ERROR: CSV validation failed: {validation.get('error', 'Unknown error')}")
            return jsonify({'error': f"Invalid file format: {validation['error']}"}), 400
        print(f"[ROUTE] CSV validation passed")
        # New update 7 Dec (No file csv can analyze just genes file)
        # Validate gene-expression columns before processing
        print(f"[ROUTE] Validating gene-expression columns...")
        gene_validation = FileHandler.validate_gene_expression_columns(actual_filepath)
        if not gene_validation['valid']:
            print(f"[ROUTE] ERROR: Gene-expression validation failed: {gene_validation.get('error', 'Unknown error')}")
            return jsonify({'error': gene_validation.get('error', 'Invalid file: gene-expression columns not found.')}), 400
        print(f"[ROUTE] Gene-expression validation passed")
    
    try:
        print(f"[ROUTE] Calling process_genetic_data()...")
        # Process file through AI
        analysis_result = process_genetic_data(actual_filepath, file_id, user_id=user['user_id'])
        print(f"[ROUTE] process_genetic_data() completed successfully")
        
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
        pdf_path = None
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
        
        parsed_analysis = parse_analysis_result(analysis_result.get('analysis_result'))
        risk_score_percent, risk_level = extract_risk_from_analysis(parsed_analysis)
        if not risk_level:
            risk_level = analysis_result.get('risk_level')
        
        return jsonify({
            'message': 'File processed successfully',
            'report': {
                'sequence_id': analysis_result['sequence_id'],
                'file_id': file_id,
                'accuracy': analysis_result['accuracy'],  # Model accuracy (88-98%)
                'risk_score_percent': risk_score_percent,  # Patient's addiction risk score (0-100%)
                'risk_level': risk_level,  # 'HIGH' or 'LOW'
                'status': 'completed',
                'pdf_generated': pdf_path is not None
            }
        }), 201
        
    except Exception as e:
        return jsonify({'error': safe_error_message(e, 'Processing failed.')}), 500


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
        reports = DatabaseOperations.get_reports_for_user(user['user_id'])
        
        # Format reports
        report_list = []
        for report in reports:
            # Get associated files
            files = FileOperations.get_report_files(report['sequence_id'])
            report_list.append(format_report_list_item(report, files))
        
        return jsonify({
            'total_reports': len(report_list),
            'reports': report_list
        }), 200
        
    except Exception as e:
        return jsonify({'error': safe_error_message(e)}), 500


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
        
        if not user_has_report_access(user['user_id'], sequence_id):
            return jsonify({'error': 'Access denied'}), 403

        files = FileOperations.get_report_files(sequence_id)
        response = format_report_response(report, files)
        return jsonify(response), 200
        
    except Exception as e:
        return jsonify({'error': safe_error_message(e)}), 500


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
        
        if not user_has_report_access(user['user_id'], sequence_id):
            return jsonify({'error': 'Access denied'}), 403

        # Record view
        DatabaseOperations.record_report_view(user['user_id'], sequence_id)
        
        return jsonify({'message': 'View recorded successfully'}), 200
        
    except Exception as e:
        return jsonify({'error': safe_error_message(e)}), 500


@reports_bp.route('/<sequence_id>/pdf', methods=['GET'])
def download_pdf_report(sequence_id):
    """
    Download PDF report (the PDF IS the report)
    Auto-generates PDF if missing
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
        
        if not user_has_report_access(user['user_id'], sequence_id):
            return jsonify({'error': 'Access denied'}), 403

        pdf_path = report.get('pdf_path')
        if not pdf_path or not os.path.exists(pdf_path):
            try:
                report_data = build_report_data_for_pdf(report)
                pdf_path = save_pdf_report(
                    report_data=report_data,
                    user_id=user['user_id'],
                    sequence_id=sequence_id
                )
                
                # Update DB with PDF path
                DatabaseOperations.update_report_pdf_path(sequence_id, pdf_path)
                
            except Exception as e:
                print(f"[PDF ERROR] Failed to generate PDF: {e}")
                return jsonify({'error': 'Failed to generate PDF'}), 500
        
        # Send PDF file
        return send_file(
            pdf_path,
            as_attachment=True,
            download_name=f"report_{sequence_id}.pdf",
            mimetype='application/pdf'
        )
        
    except Exception as e:
        return jsonify({'error': safe_error_message(e)}), 500


@reports_bp.route('/<sequence_id>/generate-pdf', methods=['POST'])
def generate_pdf_report_endpoint(sequence_id):
    """
    Generate or regenerate PDF report from existing report data
    """
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Authentication required'}), 401

    try:
        # Fetch report
        report = DatabaseOperations.get_report_by_id(sequence_id)
        if not report:
            return jsonify({'error': 'Report not found'}), 404

        if not user_has_report_access(user['user_id'], sequence_id):
            return jsonify({'error': 'Access denied'}), 403

        report_data = build_report_data_for_pdf(report)
        pdf_path = save_pdf_report(
            report_data=report_data,
            user_id=user['user_id'],
            sequence_id=sequence_id
        )

        # Save pdf path
        DatabaseOperations.update_report_pdf_path(sequence_id, pdf_path)

        return jsonify({
            'message': 'PDF report generated successfully',
            'pdf_path': pdf_path,
            'sequence_id': sequence_id
        }), 200

    except Exception as e:
        print(f"[PDF] Error while generating PDF: {e}")
        return jsonify({'error': safe_error_message(e, 'PDF generation failed.')}), 500

