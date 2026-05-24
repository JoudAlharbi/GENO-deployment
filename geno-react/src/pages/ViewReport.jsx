import React, { useEffect, useState, Component } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { formatPercentEn } from "../utils/formatNumber";
import "../styles/report.css";
import { DEMO_MODE } from "../config/demo";
import ReportPdfDownloadButton from "../components/ReportPdfDownloadButton";

// Error Boundary Component - catches render errors and prevents blank page
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ViewReport ErrorBoundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // If this is the PDF error boundary, show a simple error message
      if (this.props.isPDFError) {
        return (
          <button
            className="report-download-button"
            disabled
            style={{ opacity: 0.6, cursor: "not-allowed" }}
            title="PDF generation is temporarily unavailable"
          >
            PDF Unavailable
          </button>
        );
      }
      // Main error boundary - show full error page
      return (
        <main className="report-page">
          <div className="report-container">
            <div style={{ textAlign: "center", padding: "60px 20px" }}>
              <div style={{
                background: "rgba(255,100,100,0.1)",
                border: "1px solid rgba(255,100,100,0.3)",
                borderRadius: "12px",
                padding: "30px",
                maxWidth: "400px",
                margin: "0 auto"
              }}>
                <p style={{ color: "#ff9999", marginBottom: "20px" }}>
                  Error rendering report: {this.state.error?.message || String(this.state.error)}
                </p>
                <button onClick={() => window.location.reload()} style={{
                  background: "rgba(255,255,255,0.1)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  color: "#fff",
                  padding: "12px 24px",
                  borderRadius: "8px",
                  cursor: "pointer"
                }}>
                  Reload Page
                </button>
              </div>
            </div>
          </div>
        </main>
      );
    }
    return this.props.children;
  }
}


/**
 * Extract gene arrays for Section B and C from any shape of analysisResult.
 * It first tries known paths (report/result/sample),
 * then recursively scans the whole object for gene arrays.
 */
function extractGeneArrays(analysisResult) {
  if (!analysisResult || typeof analysisResult !== "object") {
    console.warn("extractGeneArrays: invalid analysisResult:", analysisResult);
    return { safeGenesB: [], safeGenesC: [] };
  }

  const report = analysisResult.report || {};
  const result = analysisResult.result || {};
  const sample = analysisResult.sample || analysisResult.sample_details || {};

  // ---------- 1. Known direct paths ----------
  const bCandidates = [
    report.top_genes,
    report.high_impact_genes,
    report.highImpactGenes,
    result.top_genes,
    result.high_impact_genes,
    sample.top_genes,
    sample.high_impact_genes,
    analysisResult.top_genes,
    analysisResult.high_impact_genes,
  ].filter((arr) => Array.isArray(arr) && arr.length > 0);

  const cCandidates = [
    report.bottom_genes,
    report.low_expression_genes,
    report.lowExpressionGenes,
    result.bottom_genes,
    result.low_expression_genes,
    sample.bottom_genes,
    sample.low_expression_genes,
    analysisResult.bottom_genes,
    analysisResult.low_expression_genes,
  ].filter((arr) => Array.isArray(arr) && arr.length > 0);

  let genesB = bCandidates[0] || null;
  let genesC = cCandidates[0] || null;

  // ---------- 2. Recursive auto-detection ----------
  function scanForGeneArrays(node, path = "") {
    if (!node || typeof node !== "object") return;

    if (Array.isArray(node)) {
      if (!node.length || typeof node[0] !== "object") return;

      const first = node[0];
      const hasGene = "gene" in first || "gene_name" in first;
      const hasExpr = "expression" in first || "expressionValue" in first;

      if (!hasGene || !hasExpr) return;

      const lowerPath = path.toLowerCase();

      if (!genesB && (lowerPath.includes("top") || lowerPath.includes("high"))) {
        genesB = node;
      } else if (!genesC && (lowerPath.includes("bottom") || lowerPath.includes("low"))) {
        genesC = node;
      } else if (!genesB) {
        genesB = node;
      } else if (!genesC && genesB !== node) {
        genesC = node;
      }

      return;
    }

    for (const [key, value] of Object.entries(node)) {
      scanForGeneArrays(value, path ? `${path}.${key}` : key);
      if (genesB && genesC) return;
    }
  }

  if (!genesB || !genesC) {
    scanForGeneArrays(analysisResult);
  }

  // ---------- 3. Final safe arrays + logs ----------
  const safeGenesB = Array.isArray(genesB) ? genesB : [];
  const safeGenesC = Array.isArray(genesC) ? genesC : [];

  console.log("Section B genes length:", safeGenesB.length);
  console.log("Section C genes length:", safeGenesC.length);

  return { safeGenesB, safeGenesC };
}

/**
 * ViewReport - Professional Laboratory Genetics Report
 * Displays a clinical-style genetic risk analysis report with white background
 */
export default function ViewReport() {
  const navigate = useNavigate();
  const location = useLocation();
  const [analysisResult, setAnalysisResult] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Load data on mount
  useEffect(() => {
    try {
    if (!DEMO_MODE) {
      const isLoggedIn =
        localStorage.getItem("genoLoggedIn") === "true" ||
        sessionStorage.getItem("genoLoggedIn") === "true";
      if (!isLoggedIn) {
        navigate("/login");
        return;
      }
    }

      // Try to get data from navigation state first, then sessionStorage
      let dataToUse = null;
      
      if (location.state?.analysisResult) {
        dataToUse = location.state.analysisResult;
      } else {
        const storedResult = sessionStorage.getItem("analysisResult");
        if (storedResult) {
          try {
            dataToUse = JSON.parse(storedResult);
          } catch (e) {
            console.error("Failed to parse analysisResult from sessionStorage:", e);
            setError("Failed to load analysis results");
            setIsLoading(false);
            return;
          }
        } else {
          const viewData = sessionStorage.getItem("viewReportData");
          if (viewData) {
            try {
              dataToUse = JSON.parse(viewData);
            } catch (e) {
              console.error("Failed to parse viewReportData from sessionStorage:", e);
              setError("Failed to load analysis results");
              setIsLoading(false);
              return;
            }
          } else {
            setError("No analysis results found. Please upload a file first.");
            setIsLoading(false);
            return;
          }
        }
      }

      // Normalize shape if coming from Dashboard (DB record)
      if (
        dataToUse &&
        dataToUse.analysis_result &&
        !dataToUse.report &&
        !dataToUse.result
      ) {
        dataToUse = {
          ...dataToUse.analysis_result,  // the actual AI report
          meta: {
            sequence_id: dataToUse.sequence_id,
            accuracy: dataToUse.accuracy,
            variant_info: dataToUse.variant_info,
            fullname: dataToUse.fullname,
            patientInfo: dataToUse.patientInfo,
            age: dataToUse.age,
            gender: dataToUse.gender,
          },
        };
      }

      if (dataToUse) {
        setAnalysisResult(dataToUse);
      } else {
        setError("No analysis results found. Please upload a file first.");
      }
    } catch (err) {
      console.error("Error loading analysis result:", err);
      setError("Failed to load analysis results");
    } finally {
      setIsLoading(false);
    }
  }, [navigate, location.state]);

  const handleUploadNew = () => {
    sessionStorage.removeItem("analysisResult");
    sessionStorage.removeItem("viewReportData");
    navigate("/load");
  };

  // Format date from ISO string
  const formatDateTime = (isoString) => {
    if (!isoString) {
      return new Date().toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true
      });
    }
    try {
      return new Date(isoString).toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true
      });
    } catch (e) {
      return "Invalid date";
    }
  };

  // Error state
  if (error) {
    return (
      <main className="report-page">
        <div className="report-container">
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <div style={{
              background: "rgba(255,100,100,0.1)",
              border: "1px solid rgba(255,100,100,0.3)",
              borderRadius: "12px",
              padding: "30px",
              maxWidth: "400px",
              margin: "0 auto"
            }}>
              <p style={{ color: "#ff9999", marginBottom: "20px" }}>{error}</p>
              <button onClick={handleUploadNew} style={{
                background: "rgba(255,255,255,0.1)",
                border: "1px solid rgba(255,255,255,0.2)",
                color: "#fff",
                padding: "12px 24px",
                borderRadius: "8px",
                cursor: "pointer"
              }}>
                Upload New File
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Loading state
  if (isLoading || !analysisResult) {
    return (
      <main className="report-page">
        <div className="report-container">
          <div style={{ textAlign: "center", padding: "60px" }}>
            <div style={{
              width: "50px", height: "50px",
              border: "3px solid rgba(0,0,0,0.1)",
              borderTopColor: "#008B8B",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
              margin: "0 auto"
            }} />
            <p style={{ color: "#666", marginTop: "20px" }}>Loading report...</p>
          </div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </main>
    );
  }

  // Validate analysisResult structure
  if (!analysisResult || typeof analysisResult !== 'object') {
    return (
      <main className="report-page">
        <div className="report-container">
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <p style={{ color: "#ff9999" }}>Invalid analysis data structure</p>
            <button onClick={handleUploadNew} style={{
              marginTop: "20px",
              background: "rgba(255,255,255,0.1)",
              border: "1px solid rgba(255,255,255,0.2)",
              color: "#fff",
              padding: "12px 24px",
              borderRadius: "8px",
              cursor: "pointer"
            }}>
              Upload New File
            </button>
          </div>
        </div>
      </main>
    );
  }

  // Safely extract nested objects with fallbacks
  const report = (analysisResult && typeof analysisResult === 'object' && analysisResult.report) 
    ? analysisResult.report 
    : {};
  const result = (analysisResult && typeof analysisResult === 'object' && analysisResult.result) 
    ? (analysisResult.result || {})
    : {};
  const fileInfo = (analysisResult && typeof analysisResult === 'object' && analysisResult.file_info) 
    ? analysisResult.file_info 
    : {};

  // Extract real risk level - only use fallback if truly missing
  const rawRiskLevel = report?.risk_level || result?.risk_level;
  const riskLevel = rawRiskLevel && typeof rawRiskLevel === 'string' 
    ? rawRiskLevel.toUpperCase() 
    : (rawRiskLevel ? String(rawRiskLevel).toUpperCase() : "LOW");
  const isHighRisk = riskLevel === "HIGH";
  
  // Safely convert scorePercent to number
  const rawScorePercent = report?.risk_score_percent ?? result?.score_percent;
  const scorePercent = rawScorePercent !== undefined && rawScorePercent !== null
    ? (typeof rawScorePercent === 'number' 
        ? rawScorePercent 
        : (typeof rawScorePercent === 'string' ? parseFloat(rawScorePercent) : 0))
    : 0;
  
  // Real DB sequence id (used for API calls)
  const dbSequenceId =
    analysisResult.sequence_id ||
    (analysisResult.meta && analysisResult.meta.sequence_id) ||
    (report && report.sequence_id) ||
    (result && result.sequence_id) ||
    "N/A";

  // What we actually show as "Sample ID" in the header
  const displaySampleId =
    (report && report.sample_id) ||
    (result && result.sequence_id) ||
    dbSequenceId ||
    "N/A";

  const labUserId = report?.laboratory_user_id || result?.laboratory_user_id || "LAB-DEMO-001";
  const modelName = report?.model_name || result?.model_used || "geno_enet_pipeline.pkl";
  const rawTotalGenes = report?.total_genes_in_model || result?.genes_used;
  const totalGenes = rawTotalGenes !== undefined && rawTotalGenes !== null
    ? (typeof rawTotalGenes === 'number' ? rawTotalGenes : (typeof rawTotalGenes === 'string' ? parseInt(rawTotalGenes) : 237))
    : 237;
  const generatedAt = report?.generated_at || result?.generated_at || new Date().toISOString();

  // If analysisResult is of the form { sequence_id, ..., analysis_result: {...} }
  // (as sent from Dashboard/DB), unwrap it before extracting genes.
  const analysisCore =
    analysisResult &&
    analysisResult.analysis_result &&
    !analysisResult.report &&
    !analysisResult.result
      ? analysisResult.analysis_result
      : analysisResult;

  const { safeGenesB, safeGenesC } = extractGeneArrays(analysisCore);

  // Filter genes based on risk score: only show genes if risk score > 1%
  // Low risk scores (< 1%) indicate no meaningful addiction-related risk
  const shouldShowGenes = scorePercent > 1.0;
  const filteredGenesB = shouldShowGenes ? safeGenesB : [];

  // Debug log (safe, no JSON.stringify)
  console.log("ViewReport rendered. Risk score:", scorePercent, "Should show genes:", shouldShowGenes, "genesB length:", filteredGenesB.length);

  // Safely format scorePercent for summary text
  const formattedScorePercent = typeof scorePercent === 'number' && !isNaN(scorePercent)
    ? scorePercent.toFixed(1)
    : String(scorePercent || 0);
  
  // Generate summary text
  const summaryText = report?.summary_text || (isHighRisk
    ? `The genetic analysis indicates an ELEVATED risk profile with gene expression patterns consistent with increased addiction susceptibility. The calculated risk score of ${formattedScorePercent}% exceeds the 75% threshold for high-risk classification.`
    : `The genetic analysis indicates a LOW risk profile. Gene expression patterns are within normal ranges with minimal addiction-related markers detected. The calculated risk score of ${formattedScorePercent}% is below the 75% threshold.`
  );

  // Generate threshold sentence
  const thresholdSentence = isHighRisk
    ? "This score exceeds the 75% threshold used by GENO, indicating elevated genetic susceptibility."
    : "This score is below the 75% threshold used by GENO, indicating lower genetic susceptibility.";

  // Safe helper to format numbers
  const safeToFixed = (value, decimals = 1) => {
    const num = typeof value === 'number' ? value : (typeof value === 'string' ? parseFloat(value) : 0);
    if (typeof num === 'number' && !isNaN(num) && isFinite(num)) {
      return num.toFixed(decimals);
    }
    return '0.0';
  };

  // Safe helper to get gene property
  const getGeneProperty = (gene, prop, fallback = 'N/A') => {
    if (!gene || typeof gene !== 'object') return fallback;
    return gene[prop] !== undefined && gene[prop] !== null ? gene[prop] : fallback;
  };

  // Safe helper to format expression value
  const formatExpression = (gene) => {
    if (!gene || typeof gene !== 'object') return 'N/A';
    const exp = gene.expression;
    if (typeof exp === 'number' && !isNaN(exp) && isFinite(exp)) {
      return exp.toFixed(4);
    }
    if (typeof exp === 'string') {
      const parsed = parseFloat(exp);
      if (!isNaN(parsed) && isFinite(parsed)) {
        return parsed.toFixed(4);
      }
    }
    return gene.expressionValue || gene.expression || 'N/A';
  };

  // Final safety check - ensure report object exists
  if (!report || typeof report !== 'object') {
    return (
      <main className="report-page">
        <div className="report-container">
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <p style={{ color: "#ff9999" }}>Report data is missing or invalid</p>
            <button onClick={handleUploadNew} style={{
              marginTop: "20px",
              background: "rgba(255,255,255,0.1)",
              border: "1px solid rgba(255,255,255,0.2)",
              color: "#fff",
              padding: "12px 24px",
              borderRadius: "8px",
              cursor: "pointer"
            }}>
              Upload New File
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="report-page">
      <ErrorBoundary>
        <div className="report-container">
          <div className="report-card" id="report-container">
          
          {/* Header Section */}
          <div className="report-header">
            {/* CENTERED TITLE AT TOP */}
            <div className="lab-subtitle">
              GENETIC ANALYSIS LABORATORY
            </div>
            
            {/* HEADER CONTENT: LOGO + RISK BOXES */}
            <div className="header-content-row">
              {/* LEFT: LOGO */}
              <div className="header-left">
                <img
                  src="/BlackLogo.png"
                  alt="GENO logo"
                  className="report-logo"
                />
              </div>

              {/* RIGHT: RISK BOXES */}
              <div className="header-right">
                <div className={`risk-level-box ${(riskLevel && typeof riskLevel === 'string' ? riskLevel : "LOW").toLowerCase()}`}>
                  {riskLevel && typeof riskLevel === 'string' ? riskLevel : "LOW"}
                  <div className="risk-level-caption">RISK LEVEL</div>
                </div>
                <div className="risk-score-box">
                  <div className="risk-score-value">
                    {typeof scorePercent === 'number' && !isNaN(scorePercent) && isFinite(scorePercent)
                      ? formatPercentEn(scorePercent, 1)
                      : formatPercentEn(0, 1)}
                  </div>
                  <div className="risk-score-caption">RISK SCORE</div>
                </div>
              </div>
            </div>
          </div>

          {/* Sample Summary Card */}
          <div className="sample-summary-card">
            <div className="sample-summary-row">
              <div className="sample-summary-item">
                <div className="sample-summary-label">SAMPLE ID</div>
                <div className="sample-summary-value">{displaySampleId}</div>
              </div>
              <div className="sample-summary-item">
                <div className="sample-summary-label">LABORATORY ID</div>
                <div className="sample-summary-value">{labUserId}</div>
              </div>
              <div className="sample-summary-item">
                <div className="sample-summary-label">GENERATED AT</div>
                <div className="sample-summary-value">{formatDateTime(generatedAt)}</div>
              </div>
            </div>
          </div>

          {/* A. Risk Summary */}
          <div className="report-section">
            <div className="report-section-label">Section A</div>
            <h2 className="report-section-title">Risk Summary</h2>
            <p className="report-summary-text">
              {summaryText} {thresholdSentence}
            </p>
          </div>

          {/* SECTION B – ADDICTION-RELATED GENES */}
          <div className="report-section">
            <div className="report-section-label">Section B</div>
            <h2 className="report-section-title">
              {isHighRisk ? "HIGH-IMPACT ADDICTION-RELATED GENES" : "ADDICTION-RELATED GENES"}
            </h2>
            <table className="report-table">
              <thead>
                <tr>
                  <th>GENE</th>
                  <th style={{ textAlign: "right" }}>EXPRESSION VALUE</th>
                  <th>IMPACT / NOTES</th>
                </tr>
              </thead>
              <tbody>
                {Array.isArray(filteredGenesB) && filteredGenesB.length > 0 ? (
                  filteredGenesB.slice(0, 10).map((gene, index) => {
                    if (!gene || typeof gene !== 'object') {
                      return (
                        <tr key={`invalid-b-${index}`}>
                          <td colSpan="3" style={{ fontStyle: "italic", color: "#666666", textAlign: "center", padding: "10px" }}>
                            Invalid gene data
                          </td>
                        </tr>
                      );
                    }
                    const geneName = getGeneProperty(gene, 'gene') || getGeneProperty(gene, 'gene_name') || "N/A";
                    const expressionText = formatExpression(gene);
                    const impact = getGeneProperty(gene, 'impact', isHighRisk ? "Elevated expression marker" : "Expression marker");
                    
                    return (
                      <tr key={`gene-b-${index}`}>
                        <td className="report-table-gene">{geneName}</td>
                        <td className="report-table-expression">{expressionText}</td>
                        <td className="report-table-impact">{impact}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="3" style={{ fontStyle: "italic", color: "#666666", textAlign: "center", padding: "20px" }}>
                      {scorePercent <= 1.0 
                        ? "No addiction-related risk detected. No genes to display."
                        : "No significant genes identified."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* C. Clinical Interpretation */}
          <div className="report-section">
            <div className="report-section-label">Section C</div>
            <h2 className="report-section-title">Clinical Interpretation</h2>
            <ul className="report-bullet-list">
              {report?.clinical_interpretation && Array.isArray(report.clinical_interpretation) && report.clinical_interpretation.length > 0 ? (
                report.clinical_interpretation.map((item, index) => (
                  <li key={`clinical-${index}`} className="report-bullet-item">
                    {typeof item === 'string' ? item : (item.text || item.content || String(item))}
                  </li>
                ))
              ) : (
                <>
                  <li className="report-bullet-item">
                    <strong>Overall Risk Assessment:</strong> {riskLevel} genetic susceptibility based on analyzed gene expression markers.
                  </li>
                  <li className="report-bullet-item">
                    <strong>Important Note:</strong> This analysis provides a genetic susceptibility assessment, not a clinical diagnosis.
                  </li>
                  <li className="report-bullet-item">
                    <strong>Clinical Context:</strong> Results should be interpreted with clinical evaluation, family history, environment, and lifestyle.
                  </li>
                </>
              )}
            </ul>
          </div>

          {/* D. Methodology */}
          <div className="report-section">
            <div className="report-section-label">Section D</div>
            <h2 className="report-section-title">Methodology</h2>
            <ul className="report-bullet-list">
              {report.methodology ? (
                <>
                  <li className="report-bullet-item">
                    <strong>Algorithm:</strong> {report.methodology.algorithm || "Elastic Net Logistic Regression"}
                  </li>
                  <li className="report-bullet-item">
                    <strong>Preprocessing:</strong> {report.methodology.preprocessing || "StandardScaler normalization"}
                  </li>
                  <li className="report-bullet-item">
                    <strong>Feature Selection:</strong> {report.methodology.feature_selection || "SelectKBest (F-test)"}
                  </li>
                  <li className="report-bullet-item">
                    <strong>Validation:</strong> {report.methodology.validation || "k-fold cross-validation with performance benchmarking"}
                  </li>
                  <li className="report-bullet-item">
                    <strong>Model Version:</strong> {report.methodology.model_version || "GENO AI v2.0 (geno_enet_pipeline.pkl)"}
                  </li>
                </>
              ) : (
                <>
                  <li className="report-bullet-item">
                    <strong>Algorithm:</strong> Elastic Net Logistic Regression
                  </li>
                  <li className="report-bullet-item">
                    <strong>Preprocessing:</strong> StandardScaler normalization
                  </li>
                  <li className="report-bullet-item">
                    <strong>Feature Selection:</strong> SelectKBest (F-test)
                  </li>
                  <li className="report-bullet-item">
                    <strong>Validation:</strong> k-fold cross-validation with performance benchmarking
                  </li>
                  <li className="report-bullet-item">
                    <strong>Model Version:</strong> GENO AI v2.0 (geno_enet_pipeline.pkl)
                  </li>
                </>
              )}
            </ul>
          </div>

          {/* Footer */}
          <div className="report-footer">
            <p className="report-footer-text">
              This report was generated by the <strong>GENO AI Analysis System</strong>. 
              It provides genetic susceptibility information only and does not constitute a medical diagnosis.
        </p>
      </div>

          {/* Download PDF — same client-side GENO report as Result page */}
          <div className="report-download-container">
            <ReportPdfDownloadButton
              analysisResult={analysisResult}
              className="pdf-btn"
              variant="report"
            />
          </div>
        </div>
      </div>
      </ErrorBoundary>
    </main>
  );
}
