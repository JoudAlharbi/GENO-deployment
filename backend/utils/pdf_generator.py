from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
from datetime import datetime
import os
from config import Config


def generate_pdf_report(report_data, output_path):
    """
    Generate a PDF report from AI analysis findings
    
    Args:
        report_data (dict): Report data containing:
            - sequence_id: Report identifier
            - accuracy: Analysis accuracy
            - variant_info: Variant information
            - fullname: Patient/analysis name
            - patientInfo: Patient information
            - age: Age (optional)
            - gender: Gender (optional)
            - analysis_result: Main analysis result
        output_path (str): Path where PDF should be saved
    
    Returns:
        str: Path to the generated PDF file
    """
    # Create PDF document
    doc = SimpleDocTemplate(
        output_path,
        pagesize=letter,
        rightMargin=72,
        leftMargin=72,
        topMargin=72,
        bottomMargin=18
    )
    
    # Container for PDF content
    story = []
    
    # Define styles
    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor('#1a237e'),
        spaceAfter=30,
        alignment=TA_CENTER
    )
    
    heading_style = ParagraphStyle(
        'CustomHeading',
        parent=styles['Heading2'],
        fontSize=16,
        textColor=colors.HexColor('#283593'),
        spaceAfter=12,
        spaceBefore=12
    )
    
    subheading_style = ParagraphStyle(
        'CustomSubHeading',
        parent=styles['Heading3'],
        fontSize=14,
        textColor=colors.HexColor('#3949ab'),
        spaceAfter=8,
        spaceBefore=8
    )
    
    # Title
    title = Paragraph("Genetic Analysis Report", title_style)
    story.append(title)
    story.append(Spacer(1, 0.2*inch))
    
    # Report metadata
    metadata_data = [
        ['Report ID:', report_data.get('sequence_id', 'N/A')],
        ['Generated:', datetime.now().strftime('%Y-%m-%d %H:%M:%S')],
    ]
    
    if report_data.get('fullname'):
        metadata_data.append(['Patient Name:', report_data['fullname']])
    if report_data.get('age'):
        metadata_data.append(['Age:', str(report_data['age'])])
    if report_data.get('gender'):
        metadata_data.append(['Gender:', report_data['gender']])
    
    metadata_table = Table(metadata_data, colWidths=[2*inch, 4*inch])
    metadata_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#e3f2fd')),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 1, colors.grey)
    ]))
    story.append(metadata_table)
    story.append(Spacer(1, 0.3*inch))
    
    # Analysis Accuracy
    if report_data.get('accuracy'):
        accuracy_heading = Paragraph("Analysis Accuracy", heading_style)
        story.append(accuracy_heading)
        accuracy_text = f"<b>{report_data['accuracy']}%</b>"
        story.append(Paragraph(accuracy_text, styles['Normal']))
        story.append(Spacer(1, 0.2*inch))
    
    # Patient Information
    if report_data.get('patientInfo'):
        patient_heading = Paragraph("Patient Information", heading_style)
        story.append(patient_heading)
        story.append(Paragraph(report_data['patientInfo'], styles['Normal']))
        story.append(Spacer(1, 0.2*inch))
    
    # Variant Information
    if report_data.get('variant_info'):
        variant_heading = Paragraph("Variant Information", heading_style)
        story.append(variant_heading)
        story.append(Paragraph(report_data['variant_info'], styles['Normal']))
        story.append(Spacer(1, 0.2*inch))
    
    # Analysis Result
    if report_data.get('analysis_result'):
        result_heading = Paragraph("Analysis Results", heading_style)
        story.append(result_heading)
        story.append(Paragraph(report_data['analysis_result'], styles['Normal']))
        story.append(Spacer(1, 0.2*inch))
    
    # Footer note
    story.append(Spacer(1, 0.3*inch))
    footer = Paragraph(
        "<i>This report was generated automatically from genetic data analysis. "
        "For questions or concerns, please contact your healthcare provider.</i>",
        ParagraphStyle('Footer', parent=styles['Normal'], fontSize=9, textColor=colors.grey, alignment=TA_CENTER)
    )
    story.append(footer)
    
    # Build PDF
    doc.build(story)
    
    return output_path


def save_pdf_report(report_data, user_id, sequence_id):
    """
    Generate and save a PDF report to the reports directory
    
    Args:
        report_data (dict): Report data from database
        user_id (str): User ID for directory structure
        sequence_id (str): Report sequence ID
    
    Returns:
        str: Path to the saved PDF file
    """
    # Create reports directory structure
    reports_folder = os.path.join(Config.REPORTS_FOLDER, user_id)
    os.makedirs(reports_folder, exist_ok=True)
    
    # Generate PDF filename
    pdf_filename = f"{sequence_id}.pdf"
    pdf_path = os.path.join(reports_folder, pdf_filename)
    
    # Generate PDF
    generate_pdf_report(report_data, pdf_path)
    return pdf_path