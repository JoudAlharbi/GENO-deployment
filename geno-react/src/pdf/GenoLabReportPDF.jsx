// src/pdf/GenoLabReportPDF.jsx — single-page A4 laboratory report
import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from '@react-pdf/renderer';

/** Max gene rows — leave room for Section C + footer blocks on one A4 page */
const MAX_GENE_ROWS = 4;

const defaultClinicalLines = (riskLevel) => {
  const level = (riskLevel || 'LOW').toUpperCase();
  return [
    `Overall Risk Assessment: ${level} genetic susceptibility based on analyzed gene expression markers.`,
    'Important Note: This analysis provides a genetic susceptibility assessment, not a clinical diagnosis.',
    'Clinical Context: Results should be interpreted with clinical evaluation, family history, environment, and lifestyle.',
  ];
};

/** Backend/UI pass string[]; legacy PDF props may use { overallRisk, importantNote, clinicalContext } */
const resolveClinicalLines = (clinicalInterpretation, riskLevel) => {
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

const resolveMethodologyLines = (methodology, modelName) => {
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

const styles = StyleSheet.create({
  page: {
    backgroundColor: '#FFFFFF',
    paddingTop: 10,
    paddingBottom: 8,
    paddingHorizontal: 14,
    color: '#000000',
    fontSize: 7.5,
    fontFamily: 'Helvetica',
  },
  labSubtitle: {
    fontSize: 8,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: '#777777',
    textAlign: 'center',
    marginBottom: 4,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  headerLeft: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    flex: 1,
  },
  logo: {
    width: 118,
    height: 'auto',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 2,
  },
  riskBoxSpacer: {
    width: 6,
  },
  riskLevelBox: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: '#f35a5a',
    backgroundColor: '#ffe9ea',
    color: '#c52222',
    fontWeight: 'bold',
    fontSize: 9,
    textAlign: 'center',
    minWidth: 72,
  },
  riskLevelBoxLow: {
    borderColor: '#4caf50',
    backgroundColor: '#e8f5e9',
    color: '#2e7d32',
  },
  riskLevelCaption: {
    marginTop: 1,
    fontSize: 6,
    fontWeight: 'normal',
  },
  riskScoreBox: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: '#dddddd',
    backgroundColor: '#f9f9f9',
    textAlign: 'center',
    minWidth: 72,
  },
  riskScoreValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#111111',
  },
  riskScoreCaption: {
    marginTop: 1,
    fontSize: 6,
    color: '#777777',
  },
  metaStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#fafafa',
    borderWidth: 1,
    borderColor: '#eeeeee',
    borderRadius: 4,
    paddingVertical: 5,
    paddingHorizontal: 10,
    marginBottom: 6,
  },
  metaItem: {
    flex: 1,
  },
  metaLabel: {
    fontSize: 6,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: '#999999',
    marginBottom: 2,
  },
  metaValue: {
    fontSize: 7.5,
    color: '#111111',
  },
  section: {
    marginBottom: 4,
  },
  clinicalBullet: {
    fontSize: 7,
    color: '#333333',
    lineHeight: 1.24,
    marginBottom: 1.5,
  },
  sectionTitle: {
    fontSize: 7,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 1,
    textTransform: 'uppercase',
  },
  sectionSubtitle: {
    fontSize: 7,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 3,
    textTransform: 'uppercase',
  },
  bodyText: {
    fontSize: 7.5,
    color: '#333333',
    lineHeight: 1.28,
    marginBottom: 2,
  },
  bold: {
    fontWeight: 'bold',
  },
  geneTable: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginTop: 2,
  },
  geneTableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#F5F5F5',
    borderBottomWidth: 1,
    borderBottomColor: '#CCCCCC',
    paddingVertical: 3,
    paddingHorizontal: 6,
  },
  geneTableHeaderCell: {
    flex: 1,
    fontSize: 6,
    fontWeight: 'bold',
    color: '#000000',
    textTransform: 'uppercase',
  },
  geneTableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#E0E0E0',
    paddingVertical: 2.5,
    paddingHorizontal: 6,
  },
  geneTableCell: {
    flex: 1,
    fontSize: 7,
    color: '#000000',
  },
  bottomRow: {
    flexDirection: 'row',
    marginTop: 4,
  },
  bottomCol: {
    flex: 1,
    marginRight: 6,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    borderRadius: 3,
    paddingVertical: 5,
    paddingHorizontal: 7,
    backgroundColor: '#FAFAFA',
  },
  bottomColTitle: {
    fontSize: 7,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 3,
    textTransform: 'uppercase',
  },
  bottomBullet: {
    fontSize: 6.5,
    color: '#333333',
    lineHeight: 1.22,
    marginBottom: 1.5,
  },
  labNoteText: {
    fontSize: 6.5,
    color: '#333333',
    lineHeight: 1.22,
  },
  footer: {
    marginTop: 5,
    paddingTop: 4,
    borderTopWidth: 0.5,
    borderTopColor: '#E0E0E0',
    textAlign: 'center',
  },
  footerText: {
    fontSize: 6,
    color: '#666666',
    lineHeight: 1.2,
  },
});

const formatDateTime = (isoString) => {
  const d = isoString ? new Date(isoString) : new Date();
  if (Number.isNaN(d.getTime())) {
    return new Date().toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  }
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

const toNumberSafe = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const GenoLabReportPDF = ({
  sampleId,
  laboratoryId,
  generatedAt,
  riskLevel = 'LOW',
  riskScore = 0,
  highImpactGenes = [],
  riskScorePercent,
  sequenceId,
  laboratoryUserId,
  modelName = 'geno_enet_pipeline.pkl',
  riskThresholdPercent = 75,
  summaryText,
  topGenes = [],
  clinicalInterpretation,
  methodology,
}) => {
  const finalSampleId = sampleId || sequenceId || 'N/A';
  const finalLaboratoryId = laboratoryId || laboratoryUserId || 'LAB-DEMO-001';

  const numericRiskScore = (() => {
    const main = toNumberSafe(riskScore);
    if (main !== 0 || riskScore === 0) return main;
    return toNumberSafe(riskScorePercent, 0);
  })();

  const safeRiskLevel =
    riskLevel && typeof riskLevel === 'string' ? riskLevel : 'LOW';
  const isHighRisk = safeRiskLevel.toUpperCase() === 'HIGH';
  const shouldShowGenes = numericRiskScore > 1.0;

  const finalHighImpactGenes = shouldShowGenes
    ? Array.isArray(highImpactGenes) && highImpactGenes.length > 0
      ? highImpactGenes
      : Array.isArray(topGenes) && topGenes.length > 0
        ? topGenes
        : []
    : [];

  const autoSummary = isHighRisk
    ? `Elevated addiction risk profile. Risk score ${numericRiskScore.toFixed(1)}% exceeds the ${riskThresholdPercent}% high-risk threshold.`
    : `Low addiction risk profile. Risk score ${numericRiskScore.toFixed(1)}% is below the ${riskThresholdPercent}% threshold.`;

  const rawSummary = summaryText || autoSummary;
  const finalSummaryText =
    rawSummary.length > 320 ? `${rawSummary.slice(0, 317)}...` : rawSummary;

  const methodologyLines = resolveMethodologyLines(methodology, modelName);
  const clinicalLines = resolveClinicalLines(clinicalInterpretation, safeRiskLevel);

  return (
    <Document>
      <Page size="A4" style={styles.page} wrap>
        <Text style={styles.labSubtitle}>GENETIC ANALYSIS LABORATORY</Text>

        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <Image src="/BlackLogo.png" style={styles.logo} />
          </View>
          <View style={styles.headerRight}>
            <View
              style={[
                styles.riskLevelBox,
                isHighRisk ? null : styles.riskLevelBoxLow,
              ]}
            >
              <Text>{safeRiskLevel.toUpperCase()}</Text>
              <Text style={styles.riskLevelCaption}>RISK LEVEL</Text>
            </View>
            <View style={styles.riskBoxSpacer} />
            <View style={styles.riskScoreBox}>
              <Text style={styles.riskScoreValue}>
                {numericRiskScore.toFixed(1)}%
              </Text>
              <Text style={styles.riskScoreCaption}>RISK SCORE</Text>
            </View>
          </View>
        </View>

        <View style={styles.metaStrip}>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Sample ID</Text>
            <Text style={styles.metaValue}>{finalSampleId}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Laboratory ID</Text>
            <Text style={styles.metaValue}>{finalLaboratoryId}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Generated</Text>
            <Text style={styles.metaValue}>{formatDateTime(generatedAt)}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Section A</Text>
          <Text style={styles.sectionSubtitle}>Risk Summary</Text>
          <Text style={styles.bodyText}>{finalSummaryText}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Section B</Text>
          <Text style={styles.sectionSubtitle}>
            {isHighRisk
              ? 'High-Impact Addiction-Related Genes'
              : 'Addiction-Related Genes'}
          </Text>
          <View style={styles.geneTable}>
            <View style={styles.geneTableHeaderRow}>
              <Text style={styles.geneTableHeaderCell}>Gene</Text>
              <Text style={styles.geneTableHeaderCell}>Expression</Text>
              <Text style={styles.geneTableHeaderCell}>Impact / Notes</Text>
            </View>
            {finalHighImpactGenes.length > 0 ? (
              finalHighImpactGenes.slice(0, MAX_GENE_ROWS).map((g, idx) => {
                const gene = g || {};
                const name = gene.gene || gene.gene_name || 'N/A';
                const exp =
                  typeof gene.expression === 'number' &&
                  !Number.isNaN(gene.expression)
                    ? gene.expression.toFixed(4)
                    : gene.expressionValue || gene.expression || 'N/A';
                const impact =
                  gene.impact ||
                  (isHighRisk
                    ? 'Elevated marker'
                    : 'Expression marker');
                return (
                  <View key={`gene-${idx}`} style={styles.geneTableRow}>
                    <Text style={styles.geneTableCell}>{name}</Text>
                    <Text style={styles.geneTableCell}>{String(exp)}</Text>
                    <Text style={styles.geneTableCell}>{impact}</Text>
                  </View>
                );
              })
            ) : (
              <View style={styles.geneTableRow}>
                <Text
                  style={[
                    styles.geneTableCell,
                    { fontStyle: 'italic', color: '#666666' },
                  ]}
                >
                  {numericRiskScore <= 1.0
                    ? 'No addiction-related risk detected.'
                    : 'No significant genes identified.'}
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Section C</Text>
          <Text style={styles.sectionSubtitle}>Clinical Interpretation</Text>
          {clinicalLines.map((line, i) => (
            <Text key={`clin-${i}`} style={styles.clinicalBullet} wrap>
              • {line}
            </Text>
          ))}
        </View>

        <View style={styles.bottomRow}>
          <View style={styles.bottomCol}>
            <Text style={styles.bottomColTitle}>Section D — Methodology</Text>
            {methodologyLines.map((line, i) => (
              <Text key={`meth-${i}`} style={styles.bottomBullet}>
                • {line}
              </Text>
            ))}
          </View>
          <View style={[styles.bottomCol, { marginRight: 0 }]}>
            <Text style={styles.bottomColTitle}>Laboratory Note</Text>
            <Text style={styles.labNoteText}>
              This report estimates genetic susceptibility from gene expression
              markers. Results indicate predisposition, not diagnosis. Decisions
              require qualified healthcare professionals and full clinical
              context. GENO AI tools do not replace medical judgment.
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Generated by GENO AI Analysis System — genetic susceptibility
            information only; not a medical diagnosis.
          </Text>
        </View>
      </Page>
    </Document>
  );
};

export default GenoLabReportPDF;
