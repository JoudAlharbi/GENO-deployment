import React from 'react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import {
  buildGenoLabReportDocument,
  getGenoReportPdfFileName,
  normalizeAnalysisResultForPdf,
} from '../utils/reportPdfDocument';

const VARIANT_STYLES = {
  result: {
    background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
    border: '1px solid rgba(255,255,255,0.2)',
    color: '#ffffff',
    padding: '14px 30px',
    borderRadius: '10px',
    fontSize: '0.9rem',
    fontWeight: '500',
    transition: 'all 0.3s ease',
  },
};

/**
 * Single download control used by Result and View Report — same PDF output.
 */
export default function ReportPdfDownloadButton({
  analysisResult,
  variant = 'result',
  className,
  style,
  label = 'Download PDF',
  loadingLabel = 'Generating...',
  disabled = false,
}) {
  const normalized = normalizeAnalysisResultForPdf(analysisResult);
  const document = normalized ? buildGenoLabReportDocument(normalized) : null;

  if (!document || disabled) {
    return (
      <button type="button" className={className} style={style} disabled>
        {label}
      </button>
    );
  }

  const fileName = getGenoReportPdfFileName(normalized);
  const baseStyle = variant === 'result' ? VARIANT_STYLES.result : undefined;

  return (
    <PDFDownloadLink document={document} fileName={fileName}>
      {({ loading }) => (
        <button
          type="button"
          className={className}
          disabled={loading}
          style={{
            ...baseStyle,
            ...style,
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? loadingLabel : label}
        </button>
      )}
    </PDFDownloadLink>
  );
}
