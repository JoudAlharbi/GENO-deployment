import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Result() {
  const [downloading, setDownloading] = useState(false);
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
    setDownloading(true);
    setTimeout(() => {
      alert(
        "Report downloaded successfully!\n\nThe PDF file has been saved to your downloads folder."
      );
      setDownloading(false);
    }, 1000);
  };

  const handleView = () => {
    navigate("/view");
  };

  return (
    <main className="result-content">
      <h1 className="result-title">RESULT IS READY!</h1>

      <p className="result-description">
        Choose your preferred method to check the report
      </p>

      <div className="result-buttons">
        <button
          className="btn-result btn-download"
          onClick={handleDownload}
          disabled={downloading}
        >
          {downloading ? "Downloading..." : "Download"}
        </button>

        <button className="btn-result btn-view" onClick={handleView}>
          View
        </button>
      </div>
    </main>
  );
}