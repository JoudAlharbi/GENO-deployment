import React, { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function LoadSample() {
  const fileInputRef = useRef(null);
  const [fileName, setFileName] = useState("");
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
    if (e.target.files?.length > 0) {
      setFileName(e.target.files[0].name);
    }
  };

  const handleAnalyze = () => {
    if (!fileInputRef.current || !fileInputRef.current.files.length) {
      alert("Please select a CSV file first!");
      return;
    }

    // هنا مستقبلاً نربط بالباك إند
    navigate("/result");
  };

  return (
    <main className="load-content">
      <h1 className="load-title">Load your csv file</h1>
      <p className="load-description">and leave the analysis on us</p>

      <div className="file-upload-section">
        <div className="file-input-wrapper">
          <input
            type="text"
            className="file-path"
            placeholder="No file selected"
            value={fileName}
            readOnly
          />
          <input
            type="file"
            accept=".csv"
            ref={fileInputRef}
            style={{ display: "none" }}
            onChange={handleFileChange}
          />
          <button type="button" className="btn-browse" onClick={handleBrowse}>
            Browse
          </button>
        </div>
      </div>

      <button type="button" className="btn-analyze" onClick={handleAnalyze}>
        Analyze
      </button>
    </main>
  );
}