import { pdf } from '@react-pdf/renderer';
import GenoLabReportPDF from '../pdf/GenoLabReportPDF';

/**
 * Generate a professional laboratory PDF report using @react-pdf/renderer
 * Creates a PDF with selectable text, proper layout, and dark theme
 * 
 * @param {Object} reportData - All data needed for the report
 * @param {string} fileName - The name for the downloaded PDF file
 * @returns {Promise<boolean>} - Success status
 */
export const generateLabReportPDF = async (reportData, fileName) => {
  try {
    // Extract data with fallbacks
    const {
      riskLevel = "LOW",
      riskScorePercent = 0,
      sequenceId = "N/A",
      sourceFileName = "N/A",
      laboratoryUserId = "LAB-DEMO-001",
      generatedAt,
      modelName = "GENO Elastic Net Logistic Regression",
      totalGenesInModel = 237,
      riskThresholdPercent = 75,
      summaryText = "",
      topGenes = [],
      lowGenes = [],
      clinicalInterpretation = [],
      methodologyPoints = [],
      logoSrc = null
    } = reportData;

    // Create the PDF document
    const pdfDocument = (
      <GenoLabReportPDF
        logoSrc={logoSrc}
        riskLevel={riskLevel}
        riskScorePercent={riskScorePercent}
        sequenceId={sequenceId}
        sourceFileName={sourceFileName}
        laboratoryUserId={laboratoryUserId}
        generatedAt={generatedAt}
        modelName={modelName}
        totalGenesInModel={totalGenesInModel}
        riskThresholdPercent={riskThresholdPercent}
        summaryText={summaryText}
        topGenes={topGenes}
        lowGenes={lowGenes}
        clinicalInterpretation={clinicalInterpretation}
        methodologyPoints={methodologyPoints}
      />
    );

    // Generate PDF blob
    const blob = await pdf(pdfDocument).toBlob();

    // Create download link and trigger download
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return true;
  } catch (error) {
    console.error('Error generating PDF:', error);
    return false;
  }
};

/**
 * Helper function to extract report data from analysis result object
 * Maps the analysisResult structure to the format needed by generateLabReportPDF
 * 
 * @param {Object} analysisResult - The analysis result from the backend
 * @returns {Object} - Formatted report data
 */
export const extractReportData = (analysisResult) => {
  const report = analysisResult?.report || {};
  const result = analysisResult?.result || {};
  const fileInfo = analysisResult?.file_info || {};

  const riskLevel = (report.risk_level || result.risk_level || "LOW").toUpperCase();
  const isHighRisk = riskLevel === "HIGH";
  const scorePercent = report.risk_score_percent ?? result.score_percent ?? 0;

  // Generate summary text if not provided
  const defaultSummary = isHighRisk
    ? `The genetic analysis indicates an ELEVATED risk profile with gene expression patterns consistent with increased addiction susceptibility. The calculated risk score of ${scorePercent.toFixed(1)}% exceeds the 75% threshold for high-risk classification.`
    : `The genetic analysis indicates a LOW risk profile. Gene expression patterns are within normal ranges with minimal addiction-related markers detected. The calculated risk score of ${scorePercent.toFixed(1)}% is below the 75% threshold.`;

  return {
    riskLevel,
    riskScorePercent: scorePercent,
    sequenceId: report.sample_id || result.sequence_id || "N/A",
    sourceFileName: fileInfo.original_name || fileInfo.filename || "N/A",
    laboratoryUserId: report.laboratory_user_id || "LAB-DEMO-001",
    generatedAt: report.generated_at || result.generated_at,
    modelName: report.model_name || result.model_used || "GENO Elastic Net Logistic Regression",
    totalGenesInModel: report.total_genes_in_model || result.genes_used || 237,
    riskThresholdPercent: report.risk_threshold || 75,
    summaryText: report.summary_text || defaultSummary,
    topGenes: report.top_genes || [],
    lowGenes: report.bottom_genes || [],
    clinicalInterpretation: [
      `Overall Risk Assessment: ${riskLevel} genetic susceptibility to addiction-related behaviors based on analyzed gene expression markers.`,
      "Important Note: This analysis provides a genetic susceptibility assessment, not a clinical diagnosis. Results indicate predisposition, not confirmation of any condition.",
      "Clinical Context: Results should be interpreted in conjunction with clinical evaluation, family history, environmental factors, and lifestyle considerations."
    ],
    methodologyPoints: [
      "Algorithm: Elastic Net Logistic Regression (L1/L2 regularization)",
      "Preprocessing: StandardScaler normalization applied to gene expression values",
      "Feature Selection: SelectKBest using F-test statistical scoring",
      "Validation: k-fold cross-validation with performance benchmarking",
      "Model Version: GENO AI v2.0 (geno_enet_pipeline.pkl)"
    ],
    logoSrc: '/BlackLogo.png' // Path to black GENO logo in public folder
  };
};

/**
 * Main function to generate and download the laboratory report PDF
 * Call this from Result.jsx and ViewReport.jsx
 * 
 * @param {Object} analysisResult - The full analysis result object
 * @returns {Promise<boolean>} - Success status
 */
export const downloadLabReportPDF = async (analysisResult) => {
  try {
    const reportData = extractReportData(analysisResult);
    const sequenceId = reportData.sequenceId || 'GENO';
    const fileName = `${sequenceId}_Laboratory_Report.pdf`;
    
    return await generateLabReportPDF(reportData, fileName);
  } catch (error) {
    console.error('Error downloading PDF:', error);
    return false;
  }
};

// Legacy export for backwards compatibility (deprecated)
export const generatePDF = async (elementId, fileName) => {
  console.warn('generatePDF using html2canvas is deprecated. Use downloadLabReportPDF instead.');
  // Return false to indicate this method is no longer supported
  return false;
};

export default downloadLabReportPDF;
