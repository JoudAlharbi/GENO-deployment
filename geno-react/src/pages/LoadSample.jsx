import React, { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import apiService from "../services/api";
import { DEMO_MODE } from "../config/demo";

export default function LoadSample() {
  const fileInputRef = useRef(null);
  const [fileName, setFileName] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    if (!DEMO_MODE && !apiService.isAuthenticated()) {
      navigate("/login");
    }
  }, [navigate]);

  const handleBrowse = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    setError("");
    if (e.target.files?.length > 0) {
      const file = e.target.files[0];

      const extension = file.name.split(".").pop().toLowerCase();
      if (!["csv", "txt"].includes(extension)) {
        setError("Please select a CSV or TXT file");
        setFileName("");
        setSelectedFile(null);
        return;
      }

      if (file.size > 16 * 1024 * 1024) {
        setError("File size exceeds 16MB limit");
        setFileName("");
        setSelectedFile(null);
        return;
      }

      setFileName(file.name);
      setSelectedFile(file);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedFile) {
      setError("Please select a CSV file first!");
      return;
    }

    setError("");
    setIsLoading(true);
    setUploadProgress(0);

    try {
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      const result = await apiService.analyzeCSV(selectedFile);

      clearInterval(progressInterval);
      setUploadProgress(100);

      sessionStorage.setItem("analysisResult", JSON.stringify(result));

      setTimeout(() => {
        navigate("/result");
      }, 500);
    } catch (err) {
      console.error("Analysis error:", err);
      const msg =
        err.message || "Analysis failed. Please check if the backend is running.";
      setError(msg);
      setIsLoading(false);
      setUploadProgress(0);
      if (
        msg.includes("log in") ||
        msg.includes("Authentication") ||
        msg.includes("invalid token")
      ) {
        setTimeout(() => navigate("/login"), 2000);
      }
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();

    const files = e.dataTransfer.files;
    if (files?.length > 0) {
      const file = files[0];
      const extension = file.name.split(".").pop().toLowerCase();

      if (!["csv", "txt"].includes(extension)) {
        setError("Please drop a CSV or TXT file");
        return;
      }

      if (file.size > 16 * 1024 * 1024) {
        setError("File size exceeds 16MB limit");
        return;
      }

      setFileName(file.name);
      setSelectedFile(file);
      setError("");
    }
  };

  const progressLabel =
    uploadProgress < 30
      ? "Uploading file..."
      : uploadProgress < 60
        ? "Processing data..."
        : uploadProgress < 90
          ? "Running AI analysis..."
          : "Generating report...";

  return (
    <main className="load-content">
      <h1 className="load-title">Load your CSV file</h1>
      <p className="load-description">and leave the analysis on us</p>

      {error && <div className="load-error">{error}</div>}

      <div
        className={`file-upload-section${isLoading ? " file-upload-section--loading" : ""}`}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {!isLoading ? (
          <>
            <div className="file-input-wrapper">
              <input
                type="text"
                className="file-path"
                placeholder="No file selected (drag & drop or click Browse)"
                value={fileName}
                readOnly
              />
              <input
                type="file"
                accept=".csv,.txt"
                ref={fileInputRef}
                style={{ display: "none" }}
                onChange={handleFileChange}
              />
              <button type="button" className="btn-browse" onClick={handleBrowse}>
                Browse
              </button>
            </div>

            {selectedFile && (
              <p className="file-size-hint">
                File size: {(selectedFile.size / 1024).toFixed(2)} KB
              </p>
            )}
          </>
        ) : (
          <div className="load-analyzing">
            <div className="load-analyzing__spinner" aria-hidden="true" />
            <p className="load-analyzing__title">Analyzing your genetic data...</p>
            <div className="load-analyzing__bar-track">
              <div
                className="load-analyzing__bar-fill"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <p className="load-analyzing__status">{progressLabel}</p>
          </div>
        )}
      </div>

      <button
        type="button"
        className="btn-analyze"
        onClick={handleAnalyze}
        disabled={isLoading || !selectedFile}
        style={{
          opacity: isLoading || !selectedFile ? 0.6 : 1,
          cursor: isLoading || !selectedFile ? "not-allowed" : "pointer",
        }}
      >
        {isLoading ? "Analyzing..." : "Analyze"}
      </button>
    </main>
  );
}
