import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import CountUp from "../components/CountUp";
import DashboardAnalytics from "../components/DashboardAnalytics";
import apiService, { fetchDashboard } from "../services/api";
import { DEMO_MODE } from "../config/demo";
import { formatPercentEn } from "../utils/formatNumber";

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
  const [stats, setStats] = useState({
    total_analyses: 0,
    high_risk_samples: 0,
    high_risk_rate: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Sorting and filtering state
  const [sortField, setSortField] = useState("created_at");
  const [sortOrder, setSortOrder] = useState("desc");
  const [filterRisk, setFilterRisk] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");

  // Auth check
  useEffect(() => {
    if (!DEMO_MODE && !apiService.isAuthenticated()) {
      navigate("/login");
    }
  }, [navigate]);

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
        const msg = err.message || "Failed to load dashboard data";
        setError(msg);
        if (!DEMO_MODE && (msg.includes("log in") || msg.includes("Authentication"))) {
          navigate("/login");
        }
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

  const getRiskBadgeClass = (riskLevel) => {
    const level = (riskLevel || "").toLowerCase();
    if (level === "high") return "db-risk-badge db-risk-badge--high";
    return "db-risk-badge db-risk-badge--low";
  };

  // KPI stats from fetchDashboard — derived from AI score_percent (75% threshold), not model accuracy
  const totalAnalyses = stats.total_analyses;
  const highRiskSamples = stats.high_risk_samples;
  const highRiskRate = Number(stats.high_risk_rate ?? 0);

  return (
    <main className="dashboard-content dashboard-modern">
      <header className="db-header">
        <div>
          <h1 className="db-header__title">Laboratory Dashboard</h1>
          <p className="db-header__subtitle">
            Manage and browse all your genetic analysis history
          </p>
        </div>
        <Link to="/load" className="db-btn-primary">
          + New Analysis
        </Link>
      </header>

      <section className="db-stats" aria-label="Overview statistics">
        <article className="db-stat-card">
          <span className="db-stat-card__label">Total Analyses</span>
          <span className="db-stat-card__value">
            <CountUp to={totalAnalyses} />
          </span>
          <span className="db-stat-card__hint">All processed samples</span>
        </article>
        <article className="db-stat-card">
          <span className="db-stat-card__label">High-Risk Samples</span>
          <span className={`db-stat-card__value${highRiskSamples > 0 ? " db-stat-card__value--danger" : ""}`}>
            <CountUp to={highRiskSamples} />
          </span>
          <span className="db-stat-card__hint">Marked as high-risk</span>
        </article>
        <article className="db-stat-card">
          <span className="db-stat-card__label">High-Risk Rate</span>
          <span className="db-stat-card__value">{formatPercentEn(highRiskRate, 1)}</span>
          <div className="db-stat-card__bar">
            <div
              className="db-stat-card__bar-fill"
              style={{ width: `${Math.min(highRiskRate, 100)}%` }}
            />
          </div>
        </article>
      </section>

      <DashboardAnalytics samples={samples} loading={loading} />

      <div className="db-toolbar" role="search">
        <div className="db-toolbar__search">
          <input
            type="text"
            className="db-input"
            placeholder="Search by file name or sequence ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            aria-label="Search analyses"
          />
        </div>
        <select
          className="db-select"
          value={filterRisk}
          onChange={(e) => setFilterRisk(e.target.value)}
          aria-label="Filter by risk level"
        >
          <option value="ALL">All Risk Levels</option>
          <option value="LOW">Low Risk</option>
          <option value="HIGH">High Risk</option>
        </select>
        <span className="db-toolbar__count">
          Showing {filteredSamples.length} of {samples.length} analyses
        </span>
      </div>

      <section className="db-panel">
        <h2 className="db-panel__title">Analysis History</h2>

        {loading ? (
          <div className="db-state">
            <div className="db-spinner" aria-hidden="true" />
            <p className="db-state__title">Loading analysis history...</p>
          </div>
        ) : error ? (
          <div className="db-state db-state--error">
            <p className="db-state__title">{error}</p>
            <button type="button" className="db-btn-secondary" onClick={() => window.location.reload()}>
              Retry
            </button>
          </div>
        ) : filteredSamples.length === 0 ? (
          <div className="db-state">
            {samples.length === 0 ? (
              <>
                <p className="db-state__title">No analyses found</p>
                <p>Upload your first DNA file to get started!</p>
                <Link to="/load" className="db-btn-primary" style={{ marginTop: "20px" }}>
                  Upload DNA File
                </Link>
              </>
            ) : (
              <p className="db-state__title">No results match your search or filters</p>
            )}
          </div>
        ) : (
          <div className="db-table-wrap">
            <table className="db-table">
              <thead>
                <tr>
                  <th className="db-th--sortable" onClick={() => handleSort("file_name")}>
                    File Name{getSortIndicator("file_name")}
                  </th>
                  <th>Sequence ID</th>
                  <th className="db-th--sortable db-th--center" onClick={() => handleSort("accuracy")}>
                    Risk Score{getSortIndicator("accuracy")}
                  </th>
                  <th className="db-th--sortable db-th--center" onClick={() => handleSort("risk_level")}>
                    Risk Level{getSortIndicator("risk_level")}
                  </th>
                  <th className="db-th--sortable" onClick={() => handleSort("created_at")}>
                    Date{getSortIndicator("created_at")}
                  </th>
                  <th className="db-th--center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSamples.map((sample) => (
                  <tr key={sample.sequence_id}>
                    <td className="db-td--file">{sample.file_name}</td>
                    <td className="db-td--mono">{sample.sequence_id}</td>
                    <td className="db-td--score db-td--center">
                      {sample.score_percent != null ? formatPercentEn(sample.score_percent, 1) : "--"}
                    </td>
                    <td className="db-td--center">
                      <span className={getRiskBadgeClass(sample.risk_level)}>
                        {sample.risk_level}
                      </span>
                    </td>
                    <td className="db-td--date">{formatDate(sample.created_at)}</td>
                    <td className="db-td--center">
                      <button type="button" className="db-btn-secondary" onClick={() => handleViewReport(sample)}>
                        View Report
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
