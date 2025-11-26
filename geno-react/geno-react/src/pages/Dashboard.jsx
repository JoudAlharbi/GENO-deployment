import React, { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import CountUp from "../components/CountUp";

export default function Dashboard() {
  const navigate = useNavigate();

  // Simple auth check
  useEffect(() => {
    const isLoggedIn =
      localStorage.getItem("genoLoggedIn") === "true" ||
      sessionStorage.getItem("genoLoggedIn") === "true";

    if (!isLoggedIn) {
      navigate("/login");
    }
  }, [navigate]);

  // Placeholder values – تتحدث لاحقاً من الباك إند
  const totalAnalyses = 0;
  const highRiskPercent = 0;
  const highRiskSamples = 0;

  return (
    <main className="dashboard-content">
      {/* Header */}
      <h1 className="dashboard-title">Laboratory Dashboard</h1>
      <p className="dashboard-subtitle">
        Welcome back! Manage your genetic analysis samples
      </p>

      {/* Layout: main card + side card */}
      <div className="dashboard-layout">
        {/* ================= LEFT: RECENT SAMPLES ================= */}
        <section className="dashboard-main-card">
          <header className="samples-header">
            <h2>Recent Samples</h2>
            <p className="samples-caption">
              Latest uploaded gene-expression files
            </p>
          </header>

          <div className="samples-body">
            {/* هنا مستقبلاً نحط جدول حقيقي بعد الربط مع الباك إند */}
            <div className="samples-empty">
              <p>No samples yet.</p>
              <p>Click the + button to add your first sample.</p>
            </div>
          </div>
        </section>

        {/* ================= RIGHT: OVERVIEW CARD ================= */}
        <aside className="dashboard-side-card">
          <div className="overview-header">
            <h2>Overview</h2>
            <span className="overview-pill">Snapshot</span>
          </div>

          <p className="overview-subtitle">
            Quick view of your lab activity
          </p>

                    <div className="overview-grid">
            {/* صف KPIs ثلاثي */}
            <div className="overview-row">
              {/* Total analyses */}
              <div className="overview-kpi">
                <span className="overview-label">Total analyses</span>
                <span className="overview-value">
                  <CountUp end={totalAnalyses} />   {/* 0 الآن، يتحدث لاحقاً من الباك إند */}
                </span>
                <span className="overview-caption">All processed samples</span>
              </div>

              {/* High-risk samples */}
              <div className="overview-kpi">
                <span className="overview-label">High-risk samples</span>
                <span className="overview-value-small">
                  <CountUp end={highRiskSamples} />
                </span>
                <span className="overview-caption">Marked as high-risk</span>
              </div>

              {/* High-risk % with bar */}
              <div className="overview-kpi">
                <span className="overview-label">High-risk rate</span>
                <span className="overview-value-small">
                  <CountUp end={highRiskPercent} />%
                </span>
                <div className="overview-progress-bar">
                  <div
                    className="overview-progress-fill"
                    style={{ width: `${highRiskPercent}%` }}
                  />
                </div>
                <span className="overview-caption">Of total analyses</span>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* Floating + button to go to Load Sample page */}
      <Link to="/load" className="fab-button">
        <span className="fab-icon">+</span>
      </Link>
    </main>
  );
}