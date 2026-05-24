/**
 * @deprecated Use ReportPdfDownloadButton or reportPdfDocument utilities instead.
 * Re-exports shared PDF helpers for backward compatibility.
 */
import { pdf } from '@react-pdf/renderer';
import {
  buildGenoLabReportDocument,
  extractReportPdfFields,
  getGenoReportPdfFileName,
  normalizeAnalysisResultForPdf,
} from './reportPdfDocument';

export { normalizeAnalysisResultForPdf, extractReportPdfFields, buildGenoLabReportDocument, getGenoReportPdfFileName };

export const extractReportData = (analysisResult) => {
  const fields = extractReportPdfFields(analysisResult);
  if (!fields) return null;
  return {
    riskLevel: fields.riskLevel,
    riskScorePercent: fields.scorePercent,
    sequenceId: fields.sequenceId,
    sourceFileName: fields.fileInfo?.original_name || fields.fileInfo?.filename || 'N/A',
    laboratoryUserId: fields.labUserId,
    generatedAt: fields.generatedAt,
    modelName: fields.modelName,
    totalGenesInModel: fields.totalGenes,
    riskThresholdPercent: 75,
    summaryText: fields.summaryText,
    topGenes: fields.topGenes,
    lowGenes: fields.bottomGenes,
    clinicalInterpretation: fields.clinicalInterpretation,
    methodologyPoints: fields.methodology,
  };
};

export const generateLabReportPDF = async (analysisResult, fileName) => {
  const normalized = normalizeAnalysisResultForPdf(analysisResult);
  const pdfDocument = buildGenoLabReportDocument(normalized);
  if (!pdfDocument) return false;

  const blob = await pdf(pdfDocument).toBlob();
  const url = URL.createObjectURL(blob);
  const link = window.document.createElement('a');
  link.href = url;
  link.download = fileName || getGenoReportPdfFileName(normalized);
  window.document.body.appendChild(link);
  link.click();
  window.document.body.removeChild(link);
  URL.revokeObjectURL(url);
  return true;
};

export const downloadLabReportPDF = async (analysisResult) => {
  const normalized = normalizeAnalysisResultForPdf(analysisResult);
  if (!normalized) return false;
  return generateLabReportPDF(normalized, getGenoReportPdfFileName(normalized));
};

export const generatePDF = async () => {
  console.warn('generatePDF is deprecated. Use ReportPdfDownloadButton.');
  return false;
};

export default downloadLabReportPDF;
