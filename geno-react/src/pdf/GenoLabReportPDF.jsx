// src/pdf/GenoLabReportPDF.jsx — single-page adaptive A4 laboratory report
import React, { useMemo } from 'react';
import { Document, Page, Text, View, Image } from '@react-pdf/renderer';
import {
  LABORATORY_NOTE_TEXT,
  resolveClinicalLines,
  resolveMethodologyLines,
  truncateSummary,
} from './genoPdfContent';
import { computeAdaptiveLayout, createPdfStyles } from './genoPdfLayout';

const SectionHeading = ({ styles, label, title }) => (
  <View style={styles.sectionHeader}>
    <Text style={styles.sectionTitle}>{label}</Text>
    <Text style={styles.sectionSubtitle}>{title}</Text>
  </View>
);

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

  const methodologyLines = resolveMethodologyLines(methodology, modelName);
  const clinicalLines = resolveClinicalLines(clinicalInterpretation, safeRiskLevel);

  const layout = useMemo(
    () =>
      computeAdaptiveLayout({
        geneRowCount: finalHighImpactGenes.length,
        clinicalLineCount: clinicalLines.length,
        methodologyLineCount: methodologyLines.length,
        summaryCharCount: (summaryText || autoSummary).length,
      }),
    [
      finalHighImpactGenes.length,
      clinicalLines.length,
      methodologyLines.length,
      summaryText,
      autoSummary,
    ]
  );

  const styles = useMemo(() => createPdfStyles(layout), [layout]);

  const finalSummaryText = truncateSummary(
    summaryText || autoSummary,
    layout.summaryMax
  );

  const geneRowsToRender =
    finalHighImpactGenes.length > 0
      ? finalHighImpactGenes.slice(0, layout.maxGeneRows)
      : [];

  return (
    <Document>
      <Page size="A4" style={styles.page} wrap>
        <View style={styles.pageInner}>
          <View style={styles.reportHeader}>
            <View style={styles.headerMainRow}>
              <View style={styles.headerBrand}>
                <Image src="/BlackLogo.png" style={styles.logo} />
                <Text style={styles.labSubtitle}>
                  GENETIC ANALYSIS LABORATORY
                </Text>
              </View>
              <View style={styles.headerRiskGroup}>
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
              <Text style={styles.metaValue} wrap>
                {finalSampleId}
              </Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Laboratory ID</Text>
              <Text style={styles.metaValue} wrap>
                {finalLaboratoryId}
              </Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Generated</Text>
              <Text style={styles.metaValue} wrap>
                {formatDateTime(generatedAt)}
              </Text>
            </View>
            </View>
          </View>

          <View style={styles.reportBody}>
            <View style={styles.section}>
              <SectionHeading
                styles={styles}
                label="Section A"
                title="Risk Summary"
              />
              <Text style={styles.bodyText} wrap>
                {finalSummaryText}
              </Text>
            </View>

            <View style={styles.section}>
              <SectionHeading
                styles={styles}
                label="Section B"
                title={
                  isHighRisk
                    ? 'High-Impact Addiction-Related Genes'
                    : 'Addiction-Related Genes'
                }
              />
              <View style={styles.geneTable}>
                <View style={styles.geneTableHeaderRow}>
                  <Text style={[styles.geneTableHeaderCell, styles.geneColName]}>
                    Gene
                  </Text>
                  <Text
                    style={[styles.geneTableHeaderCell, styles.geneColExpression]}
                  >
                    Expression
                  </Text>
                  <Text
                    style={[styles.geneTableHeaderCell, styles.geneColImpact]}
                  >
                    Impact / Notes
                  </Text>
                </View>
                {geneRowsToRender.length > 0 ? (
                  geneRowsToRender.map((g, idx) => {
                    const gene = g || {};
                    const name = gene.gene || gene.gene_name || 'N/A';
                    const exp =
                      typeof gene.expression === 'number' &&
                      !Number.isNaN(gene.expression)
                        ? gene.expression.toFixed(4)
                        : gene.expressionValue || gene.expression || 'N/A';
                    const impact =
                      gene.impact ||
                      (isHighRisk ? 'Elevated marker' : 'Expression marker');
                    return (
                      <View key={`gene-${idx}`} style={styles.geneTableRow}>
                        <Text
                          style={[styles.geneTableCell, styles.geneColName]}
                          wrap
                        >
                          {name}
                        </Text>
                        <Text
                          style={[
                            styles.geneTableCell,
                            styles.geneColExpression,
                          ]}
                          wrap
                        >
                          {String(exp)}
                        </Text>
                        <Text
                          style={[styles.geneTableCell, styles.geneColImpact]}
                          wrap
                        >
                          {impact}
                        </Text>
                      </View>
                    );
                  })
                ) : (
                  <View style={styles.geneTableRow}>
                    <Text
                      style={[
                        styles.geneTableCell,
                        styles.geneColImpact,
                        { fontStyle: 'italic', color: '#666666', flex: 3 },
                      ]}
                      wrap
                    >
                      {numericRiskScore <= 1.0
                        ? 'No addiction-related risk detected.'
                        : 'No significant genes identified.'}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.sectionTight}>
              <SectionHeading
                styles={styles}
                label="Section C"
                title="Clinical Interpretation"
              />
              {clinicalLines.map((line, i) => (
                <Text key={`clin-${i}`} style={styles.clinicalBullet} wrap>
                  • {line}
                </Text>
              ))}
            </View>

            <View style={styles.sectionRule} />

            <View style={styles.supplementaryBlock}>
              <View style={styles.bottomPanel}>
                <Text style={styles.bottomColTitle}>Section D — Methodology</Text>
                {methodologyLines.map((line, i) => (
                  <Text key={`meth-${i}`} style={styles.bottomBullet} wrap>
                    • {line}
                  </Text>
                ))}
              </View>
              <View style={[styles.bottomPanel, styles.bottomPanelLast]}>
                <Text style={styles.bottomColTitle}>Laboratory Note</Text>
                <Text style={styles.labNoteText} wrap>
                  {LABORATORY_NOTE_TEXT}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText} wrap>
              Generated by GENO AI Analysis System — genetic susceptibility
              information only; not a medical diagnosis.
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  );
};

export default GenoLabReportPDF;
