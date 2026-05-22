"""Helpers for parsing and formatting report analysis data."""

import json

from DB.db_operations import DatabaseOperations


def parse_analysis_result(raw_analysis):
    """Normalize analysis_result from DB (str or dict) to a dict."""
    if isinstance(raw_analysis, dict):
        return raw_analysis
    if isinstance(raw_analysis, str):
        try:
            return json.loads(raw_analysis)
        except json.JSONDecodeError:
            return {}
    return {}


def extract_risk_from_analysis(analysis_result):
    """Extract risk score percent and level from parsed analysis_result."""
    report_obj = analysis_result.get('report', {}) if analysis_result else {}
    result_obj = analysis_result.get('result', {}) if analysis_result else {}

    risk_score_percent = (
        result_obj.get('score_percent')
        or report_obj.get('risk_score_percent')
    )
    risk_level = (
        result_obj.get('risk_level')
        or report_obj.get('risk_level')
    )
    return risk_score_percent, risk_level


def format_report_response(report, files=None):
    """Build a consistent JSON response for a single report record."""
    analysis_result = parse_analysis_result(report.get('analysis_result'))
    return {
        'sequence_id': report['sequence_id'],
        'accuracy': float(report['accuracy']) if report.get('accuracy') else None,
        'variant_info': report.get('variant_info'),
        'fullname': report.get('fullname'),
        'patientInfo': report.get('patientinfo'),
        'age': report.get('age'),
        'gender': report.get('gender'),
        'analysis_result': analysis_result,
        'files': [f['fileid'] for f in files] if files else [],
    }


def format_report_list_item(report, files=None):
    """Build list-item JSON for GET /api/reports."""
    item = format_report_response(report, files)
    item['file_count'] = len(files) if files else 0
    return item


def user_has_report_access(user_id, sequence_id):
    """Return True if user owns a file linked to this report."""
    query = """
        SELECT COUNT(*) as count
        FROM contains c
        JOIN UPLOAD u ON c.FileID = u.FileID
        WHERE c.sequence_id = %s AND u.UserID = %s
    """
    access_check = DatabaseOperations.execute_query(
        query, (sequence_id, user_id), fetch=True
    )
    return bool(access_check and access_check[0]['count'] > 0)


def build_report_data_for_pdf(report):
    """Prepare report_data dict for save_pdf_report from a DB row."""
    analysis_result = parse_analysis_result(report.get('analysis_result'))
    return {
        'sequence_id': report['sequence_id'],
        'accuracy': float(report['accuracy']) if report.get('accuracy') is not None else None,
        'variant_info': report.get('variant_info'),
        'fullname': report.get('fullname'),
        'patientInfo': report.get('patientinfo'),
        'age': report.get('age'),
        'gender': report.get('gender'),
        'analysis_result': analysis_result,
    }
