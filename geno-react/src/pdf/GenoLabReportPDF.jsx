// src/pdf/GenoLabReportPDF.jsx
import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: {
    backgroundColor: "#FFFFFF",
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
    color: "#000000",
    fontSize: 9,
    fontFamily: "Helvetica",
  },
  labSubtitle: {
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: "#777777",
    textAlign: "center",
    width: "100%",
    marginTop: 0,
    marginBottom: 6,
  },
  headerContentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  headerLeft: {
    flexDirection: "column",
    alignItems: "flex-start",
    marginTop: 0,
    paddingTop: 0,
  },
  logo: {
    width: 219,
    height: "auto",
  },
  headerRight: {
    flexDirection: "column",
    alignItems: "flex-end",
    minWidth: 150,
    marginTop: 25,
  },
  riskLevelBox: {
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: "#f35a5a",
    backgroundColor: "#ffe9ea",
    color: "#c52222",
    fontWeight: "bold",
    fontSize: 12,
    textAlign: "center",
  },
  riskLevelBoxLow: {
    borderColor: "#4caf50",
    backgroundColor: "#e8f5e9",
    color: "#2e7d32",
  },
  riskLevelCaption: {
    marginTop: 2,
    fontSize: 8,
    fontWeight: "normal",
  },
  riskScoreBox: {
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: "#dddddd",
    backgroundColor: "#f9f9f9",
    textAlign: "center",
  },
  riskScoreValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#111111",
  },
  riskScoreCaption: {
    marginTop: 2,
    fontSize: 8,
    fontWeight: "normal",
    color: "#777777",
  },
  sampleSummaryCard: {
    backgroundColor: "#ffffff",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#eeeeee",
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginBottom: 18,
    marginTop: 15,
  },
  sampleSummaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  sampleSummaryItem: {
    flex: 1,
  },
  sampleSummaryLabel: {
    fontSize: 9,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: "#999999",
    marginBottom: 4,
  },
  sampleSummaryValue: {
    fontSize: 10,
    color: "#111111",
  },
  detailSection: {
    marginTop: 18,
    marginBottom: 12,
  },
  detailSectionTitle: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#000000",
    marginBottom: 4,
    textTransform: "uppercase",
  },
  detailSectionSubtitle: {
    fontSize: 8,
    fontWeight: "bold",
    color: "#000000",
    marginBottom: 8,
    textTransform: "uppercase",
  },
  detailSectionText: {
    fontSize: 9,
    color: "#333333",
    lineHeight: 1.5,
    marginBottom: 6,
  },
  geneTable: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  geneTableHeaderRow: {
    flexDirection: "row",
    backgroundColor: "#F5F5F5",
    borderBottomWidth: 1,
    borderBottomColor: "#CCCCCC",
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  geneTableHeaderCell: {
    flex: 1,
    fontSize: 7,
    fontWeight: "bold",
    color: "#000000",
    textTransform: "uppercase",
  },
  geneTableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#E0E0E0",
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  geneTableCell: {
    flex: 1,
    fontSize: 8,
    color: "#000000",
  },
  labNoteBox: {
    backgroundColor: "#F9F9F9",
    borderWidth: 1,
    borderColor: "#D0D0D0",
    padding: 12,
    marginTop: 15,
    marginBottom: 10,
  },
  labNoteTitle: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#000000",
    marginBottom: 6,
  },
  labNoteText: {
    fontSize: 8,
    color: "#333333",
    lineHeight: 1.5,
  },
  footerContainer: {
    position: "absolute",
    bottom: 15,
    left: 20,
    right: 20,
    textAlign: "center",
    paddingTop: 8,
    borderTopWidth: 0.5,
    borderTopColor: "#E0E0E0",
  },
  footerText: {
    fontSize: 7,
    color: "#666666",
    lineHeight: 1.4,
  },
});

// helper: safe date
const formatDateTime = (isoString) => {
  const d = isoString ? new Date(isoString) : new Date();
  if (Number.isNaN(d.getTime())) {
    return new Date().toLocaleString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  }
  return d.toLocaleString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const toNumberSafe = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const toArraySafe = (value) => (Array.isArray(value) ? value : []);

const GenoLabReportPDF = ({
  sampleId,
  laboratoryId,
  generatedAt,
  riskLevel = "LOW",
  riskScore = 0,
  highImpactGenes = [],
  lowExpressionGenes = [],
  clinicalInterpretation,
  methodology,
  riskScorePercent,
  sequenceId,
  laboratoryUserId,
  modelName = "geno_enet_pipeline.pkl",
  riskThresholdPercent = 75,
  summaryText,
  topGenes = [],
  lowGenes = [],
}) => {
  const finalSampleId = sampleId || sequenceId || "N/A";
  const finalLaboratoryId = laboratoryId || laboratoryUserId || "LAB-DEMO-001";

  const numericRiskScore = (() => {
    const main = toNumberSafe(riskScore);
    if (main !== 0 || riskScore === 0) return main;
    return toNumberSafe(riskScorePercent, 0);
  })();

  const safeRiskLevel = (riskLevel && typeof riskLevel === 'string') ? riskLevel : "LOW";
  const isHighRisk = safeRiskLevel.toUpperCase() === "HIGH";

  // Filter genes based on risk score: only show genes if risk score > 1%
  // Low risk scores (< 1%) indicate no meaningful addiction-related risk
  const shouldShowGenes = numericRiskScore > 1.0;

  // Use highImpactGenes directly if provided, otherwise fallback to topGenes
  // Priority: highImpactGenes > topGenes > []
  // Only include genes if risk score > 0%
  const finalHighImpactGenes = shouldShowGenes
    ? (Array.isArray(highImpactGenes) && highImpactGenes.length > 0
        ? highImpactGenes
        : (Array.isArray(topGenes) && topGenes.length > 0 ? topGenes : []))
    : []; // Empty array for risk < 1%

  // Debug logging for PDF component
  if (!shouldShowGenes) {
    console.log("ℹ️ PDF Section B: Risk score is 0%, no genes will be displayed.");
  } else if (finalHighImpactGenes.length === 0) {
    console.warn("⚠️ PDF Section B: No high-impact genes received. highImpactGenes:", highImpactGenes, "topGenes:", topGenes);
  }

  const autoSummary =
    isHighRisk
      ? `The genetic analysis indicates an ELEVATED addiction risk profile based on the evaluated gene-expression markers. The calculated risk score of ${numericRiskScore.toFixed(
          2
        )}% exceeds the ${riskThresholdPercent}% threshold for high-risk classification.`
      : `The genetic analysis indicates a LOW addiction risk profile with gene-expression markers mainly within reference ranges. The calculated risk score of ${numericRiskScore.toFixed(
          2
        )}% is below the ${riskThresholdPercent}% threshold.`;

  const finalSummaryText = summaryText || autoSummary;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Top title */}
        <Text style={styles.labSubtitle}>GENETIC ANALYSIS LABORATORY</Text>

        {/* Header */}
        <View style={styles.headerContentRow}>
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
            <View style={styles.riskScoreBox}>
              <Text style={styles.riskScoreValue}>
                {numericRiskScore.toFixed(1)}%
              </Text>
              <Text style={styles.riskScoreCaption}>RISK SCORE</Text>
            </View>
          </View>
        </View>

        {/* Sample summary */}
        <View style={styles.sampleSummaryCard}>
          <View style={styles.sampleSummaryRow}>
            <View style={styles.sampleSummaryItem}>
              <Text style={styles.sampleSummaryLabel}>SAMPLE ID</Text>
              <Text style={styles.sampleSummaryValue}>{finalSampleId}</Text>
            </View>
            <View style={styles.sampleSummaryItem}>
              <Text style={styles.sampleSummaryLabel}>LABORATORY ID</Text>
              <Text style={styles.sampleSummaryValue}>
                {finalLaboratoryId}
              </Text>
            </View>
            <View style={styles.sampleSummaryItem}>
              <Text style={styles.sampleSummaryLabel}>GENERATED AT</Text>
              <Text style={styles.sampleSummaryValue}>
                {formatDateTime(generatedAt)}
              </Text>
            </View>
          </View>
        </View>

        {/* SECTION A */}
        <View style={styles.detailSection}>
          <Text style={styles.detailSectionTitle}>SECTION A</Text>
          <Text style={styles.detailSectionSubtitle}>RISK SUMMARY</Text>
          <Text style={styles.detailSectionText}>{finalSummaryText}</Text>
        </View>

        {/* SECTION B */}
        <View style={styles.detailSection}>
          <Text style={styles.detailSectionTitle}>SECTION B</Text>
          <Text style={styles.detailSectionSubtitle}>
            {isHighRisk ? "HIGH-IMPACT ADDICTION-RELATED GENES" : "ADDICTION-RELATED GENES"}
          </Text>

          <View style={styles.geneTable}>
            <View style={styles.geneTableHeaderRow}>
              <Text style={styles.geneTableHeaderCell}>GENE</Text>
              <Text style={styles.geneTableHeaderCell}>EXPRESSION VALUE</Text>
              <Text style={styles.geneTableHeaderCell}>IMPACT / NOTES</Text>
            </View>

            {Array.isArray(finalHighImpactGenes) && finalHighImpactGenes.length > 0 ? (
              finalHighImpactGenes.slice(0, 10).map((g, idx) => {
                const gene = g || {};
                const name = gene.gene || gene.gene_name || "N/A";
                const exp =
                  typeof gene.expression === "number" && !isNaN(gene.expression) && isFinite(gene.expression)
                    ? gene.expression.toFixed(4)
                    : (gene.expressionValue || gene.expression || "N/A");
                const impact =
                  gene.impact || (isHighRisk ? "Elevated expression marker" : "Expression marker");

                return (
                  <View key={`high-${idx}`} style={styles.geneTableRow}>
                    <Text style={styles.geneTableCell}>{name}</Text>
                    <Text style={styles.geneTableCell}>{exp}</Text>
                    <Text style={styles.geneTableCell}>{impact}</Text>
                  </View>
                );
              })
            ) : (
              <View style={styles.geneTableRow}>
                <Text
                  style={[
                    styles.geneTableCell,
                    { fontStyle: "italic", color: "#666666" },
                  ]}
                >
                  {numericRiskScore <= 1.0 
                    ? "No addiction-related risk detected. No genes to display."
                    : "No significant genes identified."}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* SECTION C */}
        <View style={styles.detailSection}>
          <Text style={styles.detailSectionTitle}>SECTION C</Text>
          <Text style={styles.detailSectionSubtitle}>
            CLINICAL INTERPRETATION
          </Text>

          {clinicalInterpretation ? (
            <View>
              {clinicalInterpretation.overallRisk && (
                <Text style={styles.detailSectionText}>
                  <Text style={{ fontWeight: "bold" }}>
                    Overall Risk Assessment:
                  </Text>{" "}
                  {clinicalInterpretation.overallRisk}
                </Text>
              )}
              {clinicalInterpretation.importantNote && (
                <Text style={styles.detailSectionText}>
                  <Text style={{ fontWeight: "bold" }}>
                    Important Note:
                  </Text>{" "}
                  {clinicalInterpretation.importantNote}
                </Text>
              )}
              {clinicalInterpretation.clinicalContext && (
                <Text style={styles.detailSectionText}>
                  <Text style={{ fontWeight: "bold" }}>
                    Clinical Context:
                  </Text>{" "}
                  {clinicalInterpretation.clinicalContext}
                </Text>
              )}
            </View>
          ) : (
            <View>
              <Text style={styles.detailSectionText}>
                <Text style={{ fontWeight: "bold" }}>
                  Overall Risk Assessment:
                </Text>{" "}
                {safeRiskLevel} genetic susceptibility based on analyzed gene
                expression markers.
              </Text>
              <Text style={styles.detailSectionText}>
                <Text style={{ fontWeight: "bold" }}>Important Note:</Text> This
                analysis provides a genetic susceptibility assessment, not a
                clinical diagnosis.
              </Text>
              <Text style={styles.detailSectionText}>
                <Text style={{ fontWeight: "bold" }}>Clinical Context:</Text>{" "}
                Results should be interpreted with clinical evaluation, family
                history, environment, and lifestyle.
              </Text>
            </View>
          )}
        </View>

        {/* SECTION D */}
        <View style={styles.detailSection}>
          <Text style={styles.detailSectionTitle}>SECTION D</Text>
          <Text style={styles.detailSectionSubtitle}>METHODOLOGY</Text>

          {methodology ? (
            <View>
              {methodology.algorithm && (
                <Text style={styles.detailSectionText}>
                  <Text style={{ fontWeight: "bold" }}>Algorithm:</Text>{" "}
                  {methodology.algorithm}
                </Text>
              )}
              {methodology.preprocessing && (
                <Text style={styles.detailSectionText}>
                  <Text style={{ fontWeight: "bold" }}>Preprocessing:</Text>{" "}
                  {methodology.preprocessing}
                </Text>
              )}
              {(methodology.featureSelection ||
                methodology.feature_selection) && (
                <Text style={styles.detailSectionText}>
                  <Text style={{ fontWeight: "bold" }}>
                    Feature Selection:
                  </Text>{" "}
                  {methodology.featureSelection ||
                    methodology.feature_selection}
                </Text>
              )}
              {methodology.validation && (
                <Text style={styles.detailSectionText}>
                  <Text style={{ fontWeight: "bold" }}>Validation:</Text>{" "}
                  {methodology.validation}
                </Text>
              )}
              {(methodology.modelVersion || methodology.model_version) && (
                <Text style={styles.detailSectionText}>
                  <Text style={{ fontWeight: "bold" }}>Model Version:</Text>{" "}
                  {methodology.modelVersion || methodology.model_version}
                </Text>
              )}
            </View>
          ) : (
            <View>
              <Text style={styles.detailSectionText}>
                <Text style={{ fontWeight: "bold" }}>Algorithm:</Text> Elastic
                Net Logistic Regression
              </Text>
              <Text style={styles.detailSectionText}>
                <Text style={{ fontWeight: "bold" }}>Preprocessing:</Text>{" "}
                StandardScaler normalization
              </Text>
              <Text style={styles.detailSectionText}>
                <Text style={{ fontWeight: "bold" }}>Feature Selection:</Text>{" "}
                SelectKBest (F-test)
              </Text>
              <Text style={styles.detailSectionText}>
                <Text style={{ fontWeight: "bold" }}>Validation:</Text> k-fold
                cross-validation with performance benchmarking
              </Text>
              <Text style={styles.detailSectionText}>
                <Text style={{ fontWeight: "bold" }}>Model Version:</Text> GENO
                AI v2.0 ({modelName})
              </Text>
            </View>
          )}
        </View>

        {/* Lab note */}
        <View style={styles.labNoteBox}>
          <Text style={styles.labNoteTitle}>LABORATORY NOTE</Text>
          <Text style={styles.labNoteText}>
            This analysis estimates genetic susceptibility to addiction based on
            gene expression markers. Results indicate predisposition, not a
            diagnosis. Clinical decisions must be made by qualified healthcare
            professionals. This report should be reviewed in conjunction with
            clinical evaluation, family history, and other relevant medical
            information. The GENO AI Analysis System provides genetic risk
            assessment tools and does not replace clinical judgment or medical
            consultation.
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footerContainer}>
          <Text style={styles.footerText}>
            This report was generated by the GENO AI Analysis System. It
            provides genetic susceptibility information only and does not
            constitute a medical diagnosis.
          </Text>
        </View>
      </Page>
    </Document>
  );
};

export default GenoLabReportPDF;