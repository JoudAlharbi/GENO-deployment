/** Shared content normalization for GENO PDF reports */

export const LABORATORY_NOTE_TEXT =
  'This report estimates genetic susceptibility from gene expression markers. Results indicate predisposition, not diagnosis. Decisions require qualified healthcare professionals and full clinical context. GENO AI tools do not replace medical judgment.';

const defaultClinicalLines = (riskLevel) => {
  const level = (riskLevel || 'LOW').toUpperCase();
  return [
    `Overall Risk Assessment: ${level} genetic susceptibility based on analyzed gene expression markers.`,
    'Important Note: This analysis provides a genetic susceptibility assessment, not a clinical diagnosis.',
    'Clinical Context: Results should be interpreted with clinical evaluation, family history, environment, and lifestyle.',
  ];
};

/** Backend/UI pass string[]; legacy PDF props may use { overallRisk, importantNote, clinicalContext } */
export const resolveClinicalLines = (clinicalInterpretation, riskLevel) => {
  const defaults = defaultClinicalLines(riskLevel);

  if (clinicalInterpretation == null) {
    return defaults;
  }

  if (Array.isArray(clinicalInterpretation)) {
    const lines = clinicalInterpretation
      .map((item) => {
        if (typeof item === 'string') return item.trim();
        if (item && typeof item === 'object') {
          return String(item.text || item.content || item.message || '').trim();
        }
        return String(item ?? '').trim();
      })
      .filter(Boolean);
    return lines.length > 0 ? lines : defaults;
  }

  if (typeof clinicalInterpretation === 'string') {
    const trimmed = clinicalInterpretation.trim();
    return trimmed ? [trimmed] : defaults;
  }

  if (typeof clinicalInterpretation === 'object') {
    const lines = [
      clinicalInterpretation.overallRisk &&
        `Overall Risk Assessment: ${clinicalInterpretation.overallRisk}`,
      clinicalInterpretation.importantNote &&
        `Important Note: ${clinicalInterpretation.importantNote}`,
      clinicalInterpretation.clinicalContext &&
        `Clinical Context: ${clinicalInterpretation.clinicalContext}`,
    ].filter(Boolean);
    return lines.length > 0 ? lines : defaults;
  }

  return defaults;
};

export const resolveMethodologyLines = (methodology, modelName) => {
  const defaults = [
    'Algorithm: Elastic Net Logistic Regression',
    'Preprocessing: StandardScaler normalization',
    'Feature selection: SelectKBest (F-test)',
    'Validation: k-fold cross-validation',
    `Model: GENO AI v2.0 (${modelName})`,
  ];

  if (methodology == null) {
    return defaults;
  }

  if (Array.isArray(methodology)) {
    const lines = methodology
      .map((item) => {
        if (typeof item === 'string') return item.trim();
        if (item && typeof item === 'object') {
          return String(item.text || item.content || item.label || '').trim();
        }
        return String(item ?? '').trim();
      })
      .filter(Boolean);
    return lines.length > 0 ? lines : defaults;
  }

  if (typeof methodology === 'object') {
    const lines = [
      methodology.algorithm && `Algorithm: ${methodology.algorithm}`,
      methodology.preprocessing && `Preprocessing: ${methodology.preprocessing}`,
      (methodology.featureSelection || methodology.feature_selection) &&
        `Feature selection: ${methodology.featureSelection || methodology.feature_selection}`,
      methodology.validation && `Validation: ${methodology.validation}`,
      (methodology.modelVersion || methodology.model_version) &&
        `Model: ${methodology.modelVersion || methodology.model_version}`,
      methodology.training_samples &&
        `Training: ${methodology.training_samples}`,
    ].filter(Boolean);
    return lines.length > 0 ? lines : defaults;
  }

  return defaults;
};

export const truncateSummary = (text, maxLength = 320) => {
  if (!text || text.length <= maxLength) return text || '';
  return `${text.slice(0, maxLength - 3)}...`;
};
