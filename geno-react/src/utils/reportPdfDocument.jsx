/**
 * Shared GENO laboratory PDF — same document for Result and View Report pages.
 */
import GenoLabReportPDF from '../pdf/GenoLabReportPDF.jsx';

/**
 * Normalize analysis payloads from upload flow, session, or dashboard API.
 */
export function normalizeAnalysisResultForPdf(raw) {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  let data = raw;

  if (data.analysis_result && !data.report && !data.result) {
    const core = data.analysis_result;
    data = {
      ...core,
      report: core.report || data.report,
      result: core.result || data.result,
      file_info: core.file_info || data.file_info,
      meta: {
        sequence_id: data.sequence_id,
        accuracy: data.accuracy,
        variant_info: data.variant_info,
        fullname: data.fullname,
        patientInfo: data.patientInfo,
        age: data.age,
        gender: data.gender,
      },
    };
  }

  const report = data.report || {};
  const result = data.result || {};
  const fileInfo = data.file_info || {};

  return {
    ...data,
    report,
    result,
    file_info: fileInfo,
  };
}

/**
 * Extract display fields (mirrors Result.jsx).
 */
export function extractReportPdfFields(analysisResult) {
  const normalized = normalizeAnalysisResultForPdf(analysisResult);
  if (!normalized) {
    return null;
  }

  const report = normalized.report || {};
  const result = normalized.result || {};
  const fileInfo = normalized.file_info || {};

  const riskLevel = (report.risk_level || result.risk_level || 'LOW').toUpperCase();
  const isHighRisk = riskLevel === 'HIGH';
  const scorePercent = report.risk_score_percent ?? result.score_percent ?? 0;
  const sequenceId =
    report.sample_id ||
    result.sequence_id ||
    normalized.meta?.sequence_id ||
    normalized.sequence_id ||
    'N/A';
  const labUserId = report.laboratory_user_id || result.laboratory_user_id || 'LAB-DEMO-001';
  const modelName =
    report.model_name || result.model_used || 'GENO Elastic Net Logistic Regression';
  const totalGenes = report.total_genes_in_model || result.genes_used || 237;
  const generatedAt = report.generated_at || result.generated_at || new Date().toISOString();

  const summaryText =
    report.summary_text ||
    (isHighRisk
      ? `Elevated addiction risk profile. Risk score ${Number(scorePercent).toFixed(1)}% exceeds the 75% high-risk threshold.`
      : `Low addiction risk profile. Risk score ${Number(scorePercent).toFixed(1)}% is below the 75% threshold.`);

  return {
    normalized,
    sequenceId,
    labUserId,
    generatedAt,
    riskLevel,
    scorePercent,
    summaryText,
    modelName,
    totalGenes,
    topGenes: report.top_genes || [],
    bottomGenes: report.bottom_genes || [],
    clinicalInterpretation: report.clinical_interpretation || null,
    methodology: report.methodology || null,
    fileInfo,
  };
}

/**
 * Build the React-PDF document (identical on Result and View Report).
 */
export function buildGenoLabReportDocument(analysisResult) {
  const fields = extractReportPdfFields(analysisResult);
  if (!fields) {
    return null;
  }

  const {
    sequenceId,
    labUserId,
    generatedAt,
    riskLevel,
    scorePercent,
    summaryText,
    modelName,
    totalGenes,
    topGenes,
    bottomGenes,
    clinicalInterpretation,
    methodology,
  } = fields;

  return (
    <GenoLabReportPDF
      sampleId={sequenceId}
      laboratoryId={labUserId}
      generatedAt={generatedAt}
      riskLevel={riskLevel}
      riskScore={scorePercent}
      highImpactGenes={topGenes}
      lowExpressionGenes={bottomGenes}
      clinicalInterpretation={clinicalInterpretation}
      methodology={methodology}
      summaryText={summaryText}
      modelName={modelName}
      totalGenesInModel={totalGenes}
    />
  );
}

export function getGenoReportPdfFileName(analysisResult) {
  const fields = extractReportPdfFields(analysisResult);
  const id = fields?.sequenceId || 'analysis';
  return `GENO_Report_${id}.pdf`;
}
