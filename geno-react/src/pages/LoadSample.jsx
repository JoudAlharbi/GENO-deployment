import React, { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import apiService from "../services/api";

export default function LoadSample() {
  const fileInputRef = useRef(null);
  const [fileName, setFileName] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const isLoggedIn =
      localStorage.getItem("genoLoggedIn") === "true" ||
      sessionStorage.getItem("genoLoggedIn") === "true";
    if (!isLoggedIn) {
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
      
      // Validate file type
      const extension = file.name.split('.').pop().toLowerCase();
      if (!['csv', 'txt'].includes(extension)) {
        setError("Please select a CSV or TXT file");
        setFileName("");
        setSelectedFile(null);
        return;
      }
      
      // Validate file size (max 16MB)
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
    // Validation
    if (!selectedFile) {
      setError("Please select a CSV file first!");
      return;
    }

    setError("");
    setIsLoading(true);
    setUploadProgress(0);

    try {
      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      // Check token
  const token =
    localStorage.getItem("token") ||
    sessionStorage.getItem("token") ||
    localStorage.getItem("genoToken") ||
    sessionStorage.getItem("genoToken");

  if (!token) {
    throw new Error("Authentication required");
  }

  // Call API
  const result = await apiService.analyzeCSV(selectedFile);
      
      clearInterval(progressInterval);
      setUploadProgress(100);

      // Store the result in sessionStorage for the Result page
      sessionStorage.setItem("analysisResult", JSON.stringify(result));
      
      // Small delay to show 100% completion
      setTimeout(() => {
        navigate("/result");
      }, 500);

    } catch (err) {
      console.error("Analysis error:", err);
      setError(err.message || "Analysis failed. Please check if the backend is running.");
      setIsLoading(false);
      setUploadProgress(0);
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
      const extension = file.name.split('.').pop().toLowerCase();
      
      if (!['csv', 'txt'].includes(extension)) {
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

  return (
    <main className="load-content">
      <h1 className="load-title">Load your CSV file</h1>
      <p className="load-description">and leave the analysis on us</p>

      {/* Error Message */}
      {error && (
        <div className="error-message" style={{
          backgroundColor: "rgba(220, 53, 69, 0.1)",
          border: "1px solid #dc3545",
          color: "#dc3545",
          padding: "12px 20px",
          borderRadius: "8px",
          marginBottom: "20px",
          textAlign: "center"
        }}>
          {error}
        </div>
      )}

      <div 
        className="file-upload-section"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        style={{
          border: isLoading ? "none" : "2px dashed rgba(200, 200, 200, 0.3)",
          borderRadius: "12px",
          padding: "20px",
          transition: "all 0.3s ease"
        }}
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
              <div style={{
                marginTop: "10px",
                fontSize: "0.9rem",
                color: "#888"
              }}>
                File size: {(selectedFile.size / 1024).toFixed(2)} KB
              </div>
            )}
          </>
        ) : (
          /* Loading State */
          <div className="loading-state" style={{
            textAlign: "center",
            padding: "30px"
          }}>
            <div className="loading-spinner" style={{
              width: "60px",
              height: "60px",
              border: "4px solid rgba(76, 175, 80, 0.2)",
              borderTopColor: "#4CAF50",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
              margin: "0 auto 20px"
            }}></div>
            
            <p style={{ 
              color: "#4CAF50", 
              marginBottom: "15px",
              fontSize: "1.1rem",
              fontWeight: "500"
            }}>
              Analyzing your genetic data...
            </p>
            
            {/* Progress Bar */}
            <div style={{
              width: "100%",
              maxWidth: "300px",
              height: "8px",
              backgroundColor: "rgba(76, 175, 80, 0.2)",
              borderRadius: "4px",
              margin: "0 auto",
              overflow: "hidden"
            }}>
              <div style={{
                width: `${uploadProgress}%`,
                height: "100%",
                backgroundColor: "#4CAF50",
                borderRadius: "4px",
                transition: "width 0.3s ease"
              }}></div>
            </div>
            
            <p style={{ 
              color: "#888", 
              fontSize: "0.85rem",
              marginTop: "10px"
            }}>
              {uploadProgress < 30 && "Uploading file..."}
              {uploadProgress >= 30 && uploadProgress < 60 && "Processing data..."}
              {uploadProgress >= 60 && uploadProgress < 90 && "Running AI analysis..."}
              {uploadProgress >= 90 && "Generating report..."}
            </p>
          </div>
        )}
      </div>

      <button 
        type="button" 
        className="btn-analyze" 
        onClick={handleAnalyze}
        disabled={isLoading || !selectedFile}
        style={{
          opacity: (isLoading || !selectedFile) ? 0.6 : 1,
          cursor: (isLoading || !selectedFile) ? "not-allowed" : "pointer"
        }}
      >
        {isLoading ? "Analyzing..." : "Analyze"}
      </button>

      {/* CSS Animation */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </main>
  );
}
