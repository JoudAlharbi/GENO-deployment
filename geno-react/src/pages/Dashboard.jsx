import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import CountUp from "../components/CountUp";
import { fetchDashboard } from "../services/api";
import { formatPercentEn, formatDecimalEn } from "../utils/formatNumber";

// API Base URL for direct fetch calls
const API_BASE_URL = "http://127.0.0.1:5000";

/**
 * Dashboard Page - Main view for lab analysis history
 * According to SRS: Dashboard = History (shows all analyzed DNA files + overview)
 * 
 * Features:
 * - Overview stats (total analyses, high-risk count, high-risk rate)
 * - Full analysis history with search, filter, and sort
 * - Quick access to upload new samples
 */
export default function Dashboard() {
  const navigate = useNavigate();
  
  // State for dashboard data
  const [samples, setSamples] = useState([]);
  const [filteredSamples, setFilteredSamples] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Separate state for KPI summary (fetched independently)
  const [summary, setSummary] = useState({
    total_analyses: 0,
    high_risk_samples: 0,
    high_risk_rate: 0,
  });

  // Sorting and filtering state
  const [sortField, setSortField] = useState("created_at");
  const [sortOrder, setSortOrder] = useState("desc");
  const [filterRisk, setFilterRisk] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");

  // Auth check
  useEffect(() => {
    const isLoggedIn =
      localStorage.getItem("genoLoggedIn") === "true" ||
      sessionStorage.getItem("genoLoggedIn") === "true";

    if (!isLoggedIn) {
      navigate("/login");
    }
  }, [navigate]);

  // Fetch KPI summary data (separate from table data)
  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const token = localStorage.getItem('genoToken') || sessionStorage.getItem('genoToken');
        if (!token) return;
        
        // Get all reports to calculate summary
        const res = await fetch(`${API_BASE_URL}/api/reports`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        
        if (!res.ok) throw new Error("Failed to fetch dashboard summary");
        const data = await res.json();
        const reports = data.reports || [];
        
        // Calculate statistics
        const totalAnalyses = reports.length;
        const highRiskSamples = reports.filter(r => {
          const accuracy = r.accuracy || 0;
          return accuracy >= 0.75; // High risk threshold
        }).length;
        const highRiskRate = totalAnalyses > 0 ? (highRiskSamples / totalAnalyses) * 100 : 0;
        
        setSummary({
          total_analyses: totalAnalyses,
          high_risk_samples: highRiskSamples,
          high_risk_rate: highRiskRate
        });
      } catch (err) {
        console.error("Error loading dashboard summary:", err);
      }
    };

    fetchSummary();
  }, []);

  // Fetch dashboard data
  useEffect(() => {
    let isMounted = true;

    async function loadDashboard() {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchDashboard();
        if (!isMounted) return;
        setSamples(data.samples || []);
        setStats(data.stats || { total_analyses: 0, high_risk_samples: 0, high_risk_rate: 0 });
      } catch (err) {
        console.error("Dashboard load error:", err);
        if (!isMounted) return;
        setError("Failed to load dashboard data");
        setSamples([]);
        setStats({ total_analyses: 0, high_risk_samples: 0, high_risk_rate: 0 });
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadDashboard();
    return () => { isMounted = false; };
  }, []);

  // Apply sorting and filtering
  useEffect(() => {
    let result = [...samples];

    // Filter by risk level (only LOW and HIGH supported)
    if (filterRisk !== "ALL") {
      result = result.filter(s => s.risk_level === filterRisk);
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(s => 
        s.file_name.toLowerCase().includes(term) ||
        s.sequence_id.toLowerCase().includes(term)
      );
    }

    // Sort
    result.sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];
      
      if (sortField === "accuracy") {
        valA = parseFloat(valA) || 0;
        valB = parseFloat(valB) || 0;
      }
      
      if (sortOrder === "asc") {
        return valA > valB ? 1 : -1;
      } else {
        return valA < valB ? 1 : -1;
      }
    });

    setFilteredSamples(result);
  }, [samples, sortField, sortOrder, filterRisk, searchTerm]);

  // Handle sort click
  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  // Get sort indicator
  const getSortIndicator = (field) => {
    if (sortField !== field) return "";
    return sortOrder === "asc" ? " ↑" : " ↓";
  };

  // Handle View Report button click - passes specific analysis data
  const handleViewReport = (sample) => {
    // Extract analysis_result from sample if it exists (from API response)
    const analysisResult = sample.analysis_result || {};
    const reportFromAnalysis = analysisResult.report || {};
    const resultFromAnalysis = analysisResult.result || {};
    
    // Construct full report structure from sample data
    const reportData = {
      report: {
        sample_id: sample.sequence_id,
        laboratory_user_id: sample.laboratory_user_id || "LAB-DEMO-001",
        generated_at: sample.created_at,
        model_name: sample.model_name || "geno_enet_pipeline.pkl",
        total_genes_in_model: sample.total_genes || 237,
        risk_level: sample.risk_level,
        risk_score_percent: sample.score_percent || sample.accuracy || 0,
        summary_text: sample.risk_level === "HIGH"
          ? `The genetic analysis indicates an ELEVATED risk profile with gene expression patterns consistent with increased addiction susceptibility. The calculated risk score of ${(sample.score_percent || sample.accuracy || 0).toFixed(1)}% exceeds the 75% threshold for high-risk classification.`
          : `The genetic analysis indicates a LOW risk profile. Gene expression patterns are within normal ranges with minimal addiction-related markers detected. The calculated risk score of ${(sample.score_percent || sample.accuracy || 0).toFixed(1)}% is below the 75% threshold.`,
        // Extract genes from nested analysis_result structure or from direct sample properties
        top_genes: reportFromAnalysis.top_genes || sample.top_genes || [],
        bottom_genes: reportFromAnalysis.bottom_genes || sample.bottom_genes || [],
        clinical_interpretation: reportFromAnalysis.clinical_interpretation || sample.clinical_interpretation || [],
        methodology: reportFromAnalysis.methodology || sample.methodology || {}
      },
      result: {
        sequence_id: sample.sequence_id,
        risk_level: sample.risk_level,
        score_percent: sample.score_percent || sample.accuracy || 0,
        model_used: sample.model_name || "geno_enet_pipeline.pkl",
        genes_used: sample.total_genes || 237,
        created_at: sample.created_at
      },
      file_info: {
        original_name: sample.file_name,
        filename: sample.file_name
      },
      // Include the full analysis_result for proper extraction in ViewReport
      analysis_result: analysisResult
    };
    
    // Store in sessionStorage as fallback and navigate with state
    sessionStorage.setItem("viewReportData", JSON.stringify(reportData));
    navigate("/view", { state: { analysisResult: reportData } });
  };

  // Format date nicely
  const formatDate = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get risk badge style
  const getRiskBadgeStyle = (riskLevel) => {
    const level = (riskLevel || "").toLowerCase();
    const baseStyle = {
      padding: "4px 12px",
      borderRadius: "8px",
      fontSize: "0.8rem",
      fontWeight: "600",
      textTransform: "uppercase",
      letterSpacing: "0.3px"
    };
    
    if (level === "high") {
      return { ...baseStyle, background: "rgba(255, 100, 100, 0.15)", color: "#ff9999", border: "1px solid rgba(255, 100, 100, 0.3)" };
    } else if (level === "medium") {
      return { ...baseStyle, background: "rgba(255, 200, 100, 0.15)", color: "#ffd699", border: "1px solid rgba(255, 200, 100, 0.3)" };
    } else {
      return { ...baseStyle, background: "rgba(100, 255, 150, 0.15)", color: "#99ffbb", border: "1px solid rgba(100, 255, 150, 0.3)" };
    }
  };

  // Card style
  const cardStyle = {
    background: "radial-gradient(circle at top, rgba(255,255,255,0.06), rgba(255,255,255,0.01))",
    backdropFilter: "blur(6px)",
    WebkitBackdropFilter: "blur(6px)",
    borderRadius: "16px",
    border: "1px solid rgba(255,255,255,0.08)",
    boxShadow: "0px 0px 25px rgba(0,0,0,0.45)",
    padding: "20px"
  };

  // Use summary state for KPI cards (fetched from /dashboard/summary)
  const totalAnalyses = summary.total_analyses;
  const highRiskSamples = summary.high_risk_samples;
  const highRiskRate = Number(summary.high_risk_rate ?? 0);

  return (
    <main className="dashboard-content" style={{ padding: "30px", maxWidth: "1400px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center",
        marginBottom: "30px",
        flexWrap: "wrap",
        gap: "15px"
      }}>
        <div>
          <h1 style={{ 
            color: "#ffffff", 
            margin: 0,
            fontSize: "2rem",
            fontWeight: "600",
            textShadow: "0px 0px 10px rgba(255,255,255,0.15)"
          }}>
            Laboratory Dashboard
          </h1>
          <p style={{ color: "#888", margin: "8px 0 0" }}>
            Manage and browse all your genetic analysis history
          </p>
        </div>
        
        <Link 
          to="/load" 
          style={{
            background: "rgba(255,255,255,0.1)",
            border: "1px solid rgba(255,255,255,0.2)",
            color: "#ffffff",
            padding: "12px 24px",
            borderRadius: "8px",
            textDecoration: "none",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            transition: "all 0.3s ease",
            fontWeight: "500"
          }}
        >
          + New Analysis
        </Link>
      </div>

      {/* Overview Stats Row */}
      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", 
        gap: "20px",
        marginBottom: "30px"
      }}>
        {/* Total analyses */}
        <div style={{
          ...cardStyle,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center"
        }}>
          <span style={{ color: "#888", fontSize: "0.85rem", marginBottom: "8px" }}>
            Total Analyses
          </span>
          <span style={{ 
            color: "#ffffff", 
            fontSize: "2.2rem",
            fontWeight: "bold",
            textShadow: "0px 0px 10px rgba(255,255,255,0.2)"
          }}>
            <CountUp to={totalAnalyses} />
          </span>
          <span style={{ color: "#666", fontSize: "0.8rem", marginTop: "5px" }}>
            All processed samples
          </span>
        </div>

        {/* High-risk samples */}
        <div style={{
          ...cardStyle,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center"
        }}>
          <span style={{ color: "#888", fontSize: "0.85rem", marginBottom: "8px" }}>
            High-Risk Samples
          </span>
          <span style={{ 
            color: highRiskSamples > 0 ? "#ff9999" : "#ffffff", 
            fontSize: "2.2rem",
            fontWeight: "bold"
          }}>
            <CountUp to={highRiskSamples} />
          </span>
          <span style={{ color: "#666", fontSize: "0.8rem", marginTop: "5px" }}>
            Marked as high-risk
          </span>
        </div>

        {/* High-risk rate */}
        <div style={{
          ...cardStyle,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center"
        }}>
          <span style={{ color: "#888", fontSize: "0.85rem", marginBottom: "8px" }}>
            High-Risk Rate
          </span>
          <span style={{ 
            color: "#ffffff", 
            fontSize: "2.2rem",
            fontWeight: "bold"
          }}>
            {formatPercentEn(highRiskRate, 1)}
          </span>
          <div style={{
            width: "80%",
            height: "6px",
            background: "rgba(255,255,255,0.1)",
            borderRadius: "3px",
            overflow: "hidden",
            marginTop: "10px"
          }}>
            <div style={{
              width: `${Math.min(highRiskRate, 100)}%`,
              height: "100%",
              background: "rgba(255, 100, 100, 0.6)",
              borderRadius: "3px",
              transition: "width 1s ease"
            }}></div>
          </div>
        </div>
      </div>

      {/* Filter Row - Search, Risk Level, and Count as separate elements */}
      <div 
        className="filter-row"
        style={{
          marginBottom: "20px",
          display: "flex",
          alignItems: "center",
          gap: "16px",
          flexWrap: "nowrap"
        }}
      >
        {/* Search - separate box */}
        <div 
          className="filter-search"
          style={{ 
            flex: "1",
            maxWidth: "500px"
          }}
        >
          <input
            type="text"
            placeholder="Search by file name or sequence ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: "100%",
              padding: "12px 16px",
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: "10px",
              color: "#ffffff",
              fontSize: "0.9rem",
              outline: "none",
              boxSizing: "border-box"
            }}
          />
        </div>

        {/* Risk Level Filter - separate box */}
        <div 
          className="filter-risk"
          style={{ 
            width: "auto",
            flexShrink: 0
          }}
        >
          <select
            value={filterRisk}
            onChange={(e) => setFilterRisk(e.target.value)}
            style={{
              padding: "12px 16px",
              paddingRight: "36px",
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: "10px",
              color: "#ffffff",
              fontSize: "0.9rem",
              cursor: "pointer",
              outline: "none",
              appearance: "none",
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23888' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
              backgroundRepeat: "no-repeat",
              backgroundPosition: "right 12px center"
            }}
          >
            <option value="ALL" style={{ background: "#1a1a1a" }}>All Risk Levels</option>
            <option value="LOW" style={{ background: "#1a1a1a" }}>Low Risk</option>
            <option value="HIGH" style={{ background: "#1a1a1a" }}>High Risk</option>
          </select>
        </div>

        {/* Results Count */}
        <div 
          className="filter-count"
          style={{ 
            color: "#888", 
            fontSize: "0.85rem",
            whiteSpace: "nowrap",
            flexShrink: 0,
            marginLeft: "auto"
          }}
        >
          Showing {filteredSamples.length} of {samples.length} analyses
        </div>
      </div>

      {/* Analysis History Table */}
      <div style={cardStyle}>
        <h2 style={{ 
          color: "#ffffff", 
          margin: "0 0 20px",
          fontSize: "1.3rem",
          fontWeight: "600",
          textShadow: "0px 0px 8px rgba(255,255,255,0.2)"
        }}>
          Analysis History
        </h2>

        {loading ? (
          <div style={{ textAlign: "center", padding: "60px", color: "#888" }}>
            <div style={{
              width: "40px",
              height: "40px",
              border: "3px solid rgba(255,255,255,0.1)",
              borderTopColor: "#ffffff",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
              margin: "0 auto 20px"
            }}></div>
            Loading analysis history...
          </div>
        ) : error ? (
          <div style={{ textAlign: "center", padding: "60px", color: "#ff9999" }}>
            {error}
            <br />
            <button
              onClick={() => window.location.reload()}
              style={{
                marginTop: "15px",
                padding: "10px 20px",
                background: "rgba(255,255,255,0.1)",
                border: "1px solid rgba(255,255,255,0.2)",
                color: "#fff",
                borderRadius: "8px",
                cursor: "pointer"
              }}
            >
              Retry
            </button>
          </div>
        ) : filteredSamples.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px", color: "#888" }}>
            {samples.length === 0 ? (
              <>
                <p style={{ fontSize: "1.1rem", marginBottom: "15px" }}>No analyses found</p>
                <p>Upload your first DNA file to get started!</p>
                <Link
                  to="/load"
                  style={{
                    display: "inline-block",
                    marginTop: "20px",
                    padding: "12px 24px",
                    background: "rgba(255,255,255,0.1)",
                    border: "1px solid rgba(255,255,255,0.2)",
                    color: "#fff",
                    borderRadius: "8px",
                    textDecoration: "none"
                  }}
                >
                  Upload DNA File
                </Link>
              </>
            ) : (
              <p>No results match your search or filters</p>
            )}
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ 
              width: "100%", 
              borderCollapse: "collapse",
              fontSize: "0.9rem"
            }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                  <th 
                    onClick={() => handleSort("file_name")}
                    style={{ 
                      padding: "14px 10px", 
                      textAlign: "left", 
                      color: "#888",
                      fontWeight: "500",
                      fontSize: "0.8rem",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      cursor: "pointer",
                      userSelect: "none"
                    }}
                  >
                    File Name{getSortIndicator("file_name")}
                  </th>
                  <th style={{ 
                    padding: "14px 10px", 
                    textAlign: "left", 
                    color: "#888",
                    fontWeight: "500",
                    fontSize: "0.8rem",
                    textTransform: "uppercase"
                  }}>
                    Sequence ID
                  </th>
                  <th 
                    onClick={() => handleSort("accuracy")}
                    style={{ 
                      padding: "14px 10px", 
                      textAlign: "center", 
                      color: "#888",
                      fontWeight: "500",
                      fontSize: "0.8rem",
                      textTransform: "uppercase",
                      cursor: "pointer",
                      userSelect: "none"
                    }}
                  >
                    Risk Score{getSortIndicator("accuracy")}
                  </th>
                  <th 
                    onClick={() => handleSort("risk_level")}
                    style={{ 
                      padding: "14px 10px", 
                      textAlign: "center", 
                      color: "#888",
                      fontWeight: "500",
                      fontSize: "0.8rem",
                      textTransform: "uppercase",
                      cursor: "pointer",
                      userSelect: "none"
                    }}
                  >
                    Risk Level{getSortIndicator("risk_level")}
                  </th>
                  <th 
                    onClick={() => handleSort("created_at")}
                    style={{ 
                      padding: "14px 10px", 
                      textAlign: "left", 
                      color: "#888",
                      fontWeight: "500",
                      fontSize: "0.8rem",
                      textTransform: "uppercase",
                      cursor: "pointer",
                      userSelect: "none"
                    }}
                  >
                    Date{getSortIndicator("created_at")}
                  </th>
                  <th style={{ 
                    padding: "14px 10px", 
                    textAlign: "center", 
                    color: "#888",
                    fontWeight: "500",
                    fontSize: "0.8rem",
                    textTransform: "uppercase"
                  }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredSamples.map((sample, index) => (
                  <tr 
                    key={sample.sequence_id}
                    style={{ 
                      borderBottom: index < filteredSamples.length - 1 
                        ? "1px solid rgba(255,255,255,0.05)" 
                        : "none"
                    }}
                  >
                    <td style={{ 
                      padding: "16px 10px", 
                      color: "#e7e7e7",
                      maxWidth: "200px",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap"
                    }}>
                      {sample.file_name}
                    </td>
                    <td style={{ 
                      padding: "16px 10px", 
                      color: "#ffffff",
                      fontFamily: "monospace",
                      fontSize: "0.85rem"
                    }}>
                      {sample.sequence_id}
                    </td>
                    <td style={{ 
                      padding: "16px 10px", 
                      textAlign: "center",
                      color: "#ffffff",
                      fontWeight: "600"
                    }}>
                      {/* Use score_percent from backend - English digits only */}
                      {sample.score_percent != null ? formatPercentEn(sample.score_percent, 1) : "--"}
                    </td>
                    <td style={{ padding: "16px 10px", textAlign: "center" }}>
                      <span style={getRiskBadgeStyle(sample.risk_level)}>
                        {sample.risk_level}
                      </span>
                    </td>
                    <td style={{ 
                      padding: "16px 10px", 
                      color: "#888",
                      fontSize: "0.85rem"
                    }}>
                      {formatDate(sample.created_at)}
                    </td>
                    <td style={{ padding: "16px 10px", textAlign: "center" }}>
                      <button
                        onClick={() => handleViewReport(sample)}
                        style={{
                          padding: "6px 14px",
                          background: "rgba(255,255,255,0.08)",
                          border: "1px solid rgba(255,255,255,0.15)",
                          color: "#ffffff",
                          borderRadius: "6px",
                          cursor: "pointer",
                          fontSize: "0.8rem",
                          transition: "all 0.2s ease"
                        }}
                      >
                        View Report
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CSS Animation */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </main>
  );
}
