import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { formatPercentEn } from "../utils/formatNumber";
import ReportPdfDownloadButton from "../components/ReportPdfDownloadButton";
import { DEMO_MODE } from "../config/demo";

/**
 * Result Page - "RESULT IS READY!" Summary View
 * Shows a condensed version of the genetic analysis report
 */
export default function Result() {
  const [analysisResult, setAnalysisResult] = useState(null);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    if (!DEMO_MODE) {
      const isLoggedIn =
        localStorage.getItem("genoLoggedIn") === "true" ||
        sessionStorage.getItem("genoLoggedIn") === "true";
      if (!isLoggedIn) {
        navigate("/login");
        return;
      }
    }

    const storedResult = sessionStorage.getItem("analysisResult");
    if (storedResult) {
      try {
        const parsed = JSON.parse(storedResult);
        setAnalysisResult(parsed);
      } catch (e) {
        console.error("Failed to parse analysis result:", e);
        setError("Failed to load analysis results");
      }
    } else {
      setError("No analysis results found. Please upload a file first.");
    }
  }, [navigate]);


  const handleView = () => {
    navigate("/view", { state: { analysisResult } });
  };

  const handleUploadNew = () => {
    sessionStorage.removeItem("analysisResult");
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
    return new Date(isoString).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true
    });
  };

  // Styles
  const pageStyle = {
    padding: "30px",
    maxWidth: "900px",
    margin: "0 auto",
    minHeight: "100vh"
  };

  const mainCardStyle = {
    background: "linear-gradient(180deg, rgba(20,20,22,1) 0%, rgba(15,15,17,1) 100%)",
    borderRadius: "20px",
    border: "1px solid rgba(255,255,255,0.08)",
    boxShadow: "0 8px 40px rgba(0,0,0,0.5)",
    padding: "0",
    overflow: "hidden"
  };

  const sectionStyle = {
    padding: "25px 30px",
    borderBottom: "1px solid rgba(255,255,255,0.06)"
  };

  const sectionTitleStyle = {
    color: "#888",
    fontSize: "0.7rem",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: "1.5px",
    marginBottom: "15px"
  };

  // Error state
  if (error) {
    return (
      <main style={pageStyle}>
        <div style={{ textAlign: "center", marginBottom: "30px" }}>
          <h1 style={{ color: "#ffffff", fontSize: "2rem" }}>RESULT</h1>
        </div>
        <div style={{
          background: "rgba(255,100,100,0.1)",
          border: "1px solid rgba(255,100,100,0.3)",
          borderRadius: "12px",
          padding: "30px",
          textAlign: "center"
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
      </main>
    );
  }

  // Loading state
  if (!analysisResult) {
    return (
      <main style={pageStyle}>
        <div style={{ textAlign: "center", padding: "60px" }}>
          <div style={{
            width: "50px", height: "50px",
            border: "3px solid rgba(255,255,255,0.1)",
            borderTopColor: "#fff",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
            margin: "0 auto"
          }} />
          <p style={{ color: "#888", marginTop: "20px" }}>Loading results...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </main>
    );
  }

  // Extract data with fallbacks
  const report = analysisResult?.report || {};
  const result = analysisResult?.result || {};
  const fileInfo = analysisResult?.file_info || {};

  const riskLevel = (report.risk_level || result.risk_level || "LOW").toUpperCase();
  const isHighRisk = riskLevel === "HIGH";
  const scorePercent = report.risk_score_percent ?? result.score_percent ?? 0;
  const sequenceId = report.sample_id || result.sequence_id || "N/A";
  const labUserId = report.laboratory_user_id || "LAB-DEMO-001";
  const modelName = report.model_name || result.model_used || "GENO Elastic Net Logistic Regression";
  const totalGenes = report.total_genes_in_model || result.genes_used || 237;
  const generatedAt = report.generated_at || result.generated_at;

  // Generate summary text
  const summaryText = report.summary_text || (isHighRisk
    ? `The genetic analysis indicates an ELEVATED risk profile with gene expression patterns consistent with increased addiction susceptibility. The calculated risk score of ${scorePercent.toFixed(1)}% exceeds the 75% threshold for high-risk classification.`
    : `The genetic analysis indicates a LOW risk profile. Gene expression patterns are within normal ranges with minimal addiction-related markers detected. The calculated risk score of ${scorePercent.toFixed(1)}% is below the 75% threshold.`
  );

  return (
    <main style={pageStyle}>
      {/* Success Banner */}
      <div style={{ textAlign: "center", marginBottom: "30px" }}>
        <div style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "12px",
          background: "rgba(100,255,150,0.1)",
          border: "1px solid rgba(100,255,150,0.3)",
          borderRadius: "30px",
          padding: "12px 25px",
          marginBottom: "15px"
        }}>
          <span style={{ color: "#99ffbb", fontSize: "1.2rem" }}>✓</span>
          <span style={{ color: "#99ffbb", fontSize: "1rem", fontWeight: "500" }}>
            RESULT IS READY!
          </span>
        </div>
        <p style={{ color: "#888", fontSize: "0.9rem" }}>
          Your genetic analysis has been completed successfully
        </p>
      </div>

      {/* GENO Logo */}
      <div style={{ textAlign: "center", marginBottom: "25px" }}>
        <h1 style={{
          fontSize: "2rem",
          fontWeight: "700",
          color: "#ffffff",
          margin: 0,
          letterSpacing: "6px",
          textShadow: "0 0 20px rgba(255,255,255,0.1)"
        }}>
          GENO
        </h1>
        <p style={{ 
          color: "#555", 
          fontSize: "0.7rem", 
          letterSpacing: "2px",
          textTransform: "uppercase",
          marginTop: "3px"
        }}>
          Genetic Analysis Laboratory
        </p>
      </div>

      {/* Main Report Card - Captured for PDF */}
      <div id="report-container" style={mainCardStyle}>
        
        {/* Report Header */}
        <div style={{
          ...sectionStyle,
          background: "linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: "20px"
        }}>
          <div style={{ flex: 1, minWidth: "260px" }}>
            <h2 style={{
              margin: 0,
              color: "#ffffff",
              fontSize: "1.2rem",
              fontWeight: "600",
              lineHeight: 1.3
            }}>
              GENETIC RISK ANALYSIS REPORT
              <span style={{ 
                color: isHighRisk ? "#ff9999" : "#99ffbb",
                display: "block",
                marginTop: "5px"
              }}>
                — {riskLevel} RISK
              </span>
            </h2>
            <p style={{ 
              color: "#888", 
              fontSize: "0.8rem", 
              marginTop: "10px",
              marginBottom: 0
            }}>
              Generated: {formatDateTime(generatedAt)}
            </p>
          </div>
          
          {/* Risk Badges */}
          <div style={{ display: "flex", gap: "10px", flexShrink: 0 }}>
            <div style={{
              background: isHighRisk ? "rgba(255,100,100,0.12)" : "rgba(100,255,150,0.12)",
              border: `1px solid ${isHighRisk ? "rgba(255,100,100,0.3)" : "rgba(100,255,150,0.3)"}`,
              borderRadius: "10px",
              padding: "12px 18px",
              textAlign: "center",
              minWidth: "80px"
            }}>
              <div style={{
                color: isHighRisk ? "#ff9999" : "#99ffbb",
                fontSize: "1rem",
                fontWeight: "700"
              }}>
                {riskLevel}
              </div>
              <div style={{ color: "#888", fontSize: "0.6rem", marginTop: "3px", textTransform: "uppercase" }}>
                Risk Level
              </div>
            </div>
            
            <div style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: "10px",
              padding: "12px 18px",
              textAlign: "center",
              minWidth: "80px"
            }}>
              <div style={{
                color: "#ffffff",
                fontSize: "1.2rem",
                fontWeight: "700"
              }}>
                {formatPercentEn(scorePercent, 1)}
              </div>
              <div style={{ color: "#888", fontSize: "0.6rem", marginTop: "3px", textTransform: "uppercase" }}>
                Risk Score
              </div>
            </div>
          </div>
        </div>

        {/* Identification Section */}
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>Identification</div>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "12px"
          }}>
            <div style={{
              background: "rgba(255,255,255,0.03)",
              borderRadius: "8px",
              padding: "15px",
              border: "1px solid rgba(255,255,255,0.05)"
            }}>
              <div style={{ color: "#666", fontSize: "0.65rem", textTransform: "uppercase", marginBottom: "6px" }}>
                Sequence ID
              </div>
              <div style={{ color: "#fff", fontFamily: "monospace", fontSize: "0.85rem" }}>
                {sequenceId}
              </div>
            </div>
            <div style={{
              background: "rgba(255,255,255,0.03)",
              borderRadius: "8px",
              padding: "15px",
              border: "1px solid rgba(255,255,255,0.05)"
            }}>
              <div style={{ color: "#666", fontSize: "0.65rem", textTransform: "uppercase", marginBottom: "6px" }}>
                Source File
              </div>
              <div style={{ color: "#e0e0e0", fontSize: "0.85rem", wordBreak: "break-all" }}>
                {fileInfo.original_name || fileInfo.filename || "N/A"}
              </div>
            </div>
            <div style={{
              background: "rgba(255,255,255,0.03)",
              borderRadius: "8px",
              padding: "15px",
              border: "1px solid rgba(255,255,255,0.05)"
            }}>
              <div style={{ color: "#666", fontSize: "0.65rem", textTransform: "uppercase", marginBottom: "6px" }}>
                Lab User ID
              </div>
              <div style={{ color: "#e0e0e0", fontSize: "0.85rem" }}>
                {labUserId}
              </div>
            </div>
          </div>
        </div>

        {/* Analysis Summary */}
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>Analysis Summary</div>
          <p style={{
            color: "#d0d0d0",
            fontSize: "0.9rem",
            lineHeight: "1.7",
            margin: 0
          }}>
            {summaryText}
          </p>
        </div>

        {/* Biomarker Summary */}
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>Variant / Biomarker Summary</div>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "10px"
          }}>
            <div style={{ background: "rgba(255,255,255,0.02)", padding: "12px", borderRadius: "8px" }}>
              <div style={{ color: "#666", fontSize: "0.65rem", textTransform: "uppercase" }}>Model</div>
              <div style={{ color: "#e0e0e0", fontSize: "0.8rem", marginTop: "4px" }}>{modelName}</div>
            </div>
            <div style={{ background: "rgba(255,255,255,0.02)", padding: "12px", borderRadius: "8px" }}>
              <div style={{ color: "#666", fontSize: "0.65rem", textTransform: "uppercase" }}>Total Genes</div>
              <div style={{ color: "#e0e0e0", fontSize: "0.8rem", marginTop: "4px" }}>{totalGenes}</div>
            </div>
            <div style={{ background: "rgba(255,255,255,0.02)", padding: "12px", borderRadius: "8px" }}>
              <div style={{ color: "#666", fontSize: "0.65rem", textTransform: "uppercase" }}>Threshold</div>
              <div style={{ color: "#e0e0e0", fontSize: "0.8rem", marginTop: "4px" }}>≥75% High Risk</div>
            </div>
            <div style={{ background: "rgba(255,255,255,0.02)", padding: "12px", borderRadius: "8px" }}>
              <div style={{ color: "#666", fontSize: "0.65rem", textTransform: "uppercase" }}>Result</div>
              <div style={{ color: isHighRisk ? "#ff9999" : "#99ffbb", fontSize: "0.8rem", marginTop: "4px", fontWeight: "600" }}>
                {riskLevel} ({formatPercentEn(scorePercent, 1)})
              </div>
            </div>
          </div>
        </div>

        {/* Clinical Note */}
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>Clinical Note</div>
          <p style={{
            color: "#888",
            fontSize: "0.85rem",
            lineHeight: "1.6",
            margin: 0,
            fontStyle: "italic"
          }}>
            This analysis provides genetic susceptibility information only. Results indicate predisposition, 
            not confirmation of any condition. Please consult with a certified genetic counselor or 
            healthcare provider for clinical interpretation.
          </p>
        </div>

        {/* Footer */}
        <div style={{
          padding: "18px 30px",
          background: "rgba(0,0,0,0.2)",
          textAlign: "center"
        }}>
          <p style={{
            color: "#555",
            fontSize: "0.7rem",
            margin: 0
          }}>
            Generated by <strong style={{ color: "#666" }}>GENO AI Analysis System</strong> • 
            © {new Date().getFullYear()} GENO Genetic Analysis Laboratory
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{
        marginTop: "30px",
        display: "flex",
        justifyContent: "center",
        gap: "15px",
        flexWrap: "wrap"
      }}>
        <ReportPdfDownloadButton analysisResult={analysisResult} variant="result" />
        
        <button
          onClick={handleView}
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.15)",
            color: "#ffffff",
            padding: "14px 30px",
            borderRadius: "10px",
            cursor: "pointer",
            fontSize: "0.9rem",
            fontWeight: "500",
            transition: "all 0.3s ease"
          }}
        >
          View Full Report
        </button>
      </div>
    </main>
  );
}
