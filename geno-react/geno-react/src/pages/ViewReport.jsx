import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function ViewReport() {
  const navigate = useNavigate();

  useEffect(() => {
    const isLoggedIn =
      localStorage.getItem("genoLoggedIn") === "true" ||
      sessionStorage.getItem("genoLoggedIn") === "true";
    if (!isLoggedIn) {
      navigate("/login");
    }
  }, [navigate]);

  const handleDownload = () => {
    // Here in the future you will link it with the back end
    alert("Download PDF from backend will be implemented here.");
  };

  return (
    <main className="view-content">
      <h1 className="view-title">Analysis Report</h1>
      <p className="view-subtitle">Genetic addiction analysis results</p>

      <div className="report-container">
        <p className="report-line">Report data will be displayed here</p>
        <p className="report-line">
          Connect this page to your backend to display analysis results
        </p>
      </div>

      <button
        type="button"
        class="btn-download-pdf"
        onClick={handleDownload}
      >
        Download PDF
      </button>
    </main>
  );
}