import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import apiService from "../services/api";

export default function Login() {
  const [companyId, setCompanyId] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    // Validate inputs
    if (!companyId.trim() || !password.trim()) {
      setError("Please enter both Company ID and Password");
      setIsLoading(false);
      return;
    }

    try {
      // Call backend API for authentication
      const response = await apiService.login(companyId.trim(), password);
      
      // API service stores token and user in localStorage by default
      // Adjust storage based on "remember me" preference
      const storage = remember ? localStorage : sessionStorage;
      
      if (remember) {
        // Keep in localStorage (already stored by API service)
        localStorage.setItem("genoLoggedIn", "true");
        localStorage.setItem("genoCompanyId", companyId.trim());
      } else {
        // Move to sessionStorage and remove from localStorage
        sessionStorage.setItem("genoToken", response.token);
        sessionStorage.setItem("genoUser", JSON.stringify(response.user));
        sessionStorage.setItem("genoLoggedIn", "true");
        sessionStorage.setItem("genoCompanyId", companyId.trim());
        
        // Remove from localStorage since user doesn't want to be remembered
        localStorage.removeItem("genoToken");
        localStorage.removeItem("genoUser");
        localStorage.removeItem("genoLoggedIn");
        localStorage.removeItem("genoCompanyId");
      }

      setIsLoading(false);
      navigate("/dashboard");
    } catch (err) {
      // Login failed - show error
      const errorMessage = err.message || "Invalid Company ID or Password";
      setError(errorMessage);
      setIsLoading(false);
    }
  };

  const handleForgot = (e) => {
    e.preventDefault();
    alert("Please contact your administrator for password reset.");
  };

  return (
    <main className="login-content">
      <div className="login-card">
        <h1 className="login-title">Welcome Back</h1>
        <p className="login-subtitle">
          Log in to access your laboratory dashboard
        </p>

        {/* Error Message */}
        {error && (
          <div style={{
            backgroundColor: "rgba(220, 53, 69, 0.1)",
            border: "1px solid #dc3545",
            color: "#dc3545",
            padding: "12px 16px",
            borderRadius: "8px",
            marginBottom: "20px",
            fontSize: "0.9rem",
            whiteSpace: "pre-line",
            textAlign: "left"
          }}>
            {error}
          </div>
        )}

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="companyId">Company ID</label>
            <input
              type="text"
              id="companyId"
              placeholder="Enter your company ID"
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
              disabled={isLoading}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              required
            />
          </div>

          <div className="form-options">
            <div className="remember-section">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                disabled={isLoading}
              />
              <label className="checkbox-label">Remember me</label>
            </div>

            <a href="#" className="forgot-password" onClick={handleForgot}>
              Forgot password?
            </a>
          </div>

          <button 
            type="submit" 
            className="btn-login"
            disabled={isLoading}
            style={{
              opacity: isLoading ? 0.7 : 1,
              cursor: isLoading ? "not-allowed" : "pointer",
              position: "relative"
            }}
          >
            {isLoading ? (
              <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" }}>
                <span style={{
                  width: "18px",
                  height: "18px",
                  border: "2px solid rgba(255,255,255,0.3)",
                  borderTopColor: "#fff",
                  borderRadius: "50%",
                  animation: "spin 1s linear infinite",
                  display: "inline-block"
                }}></span>
                Logging in...
              </span>
            ) : (
              "Log In"
            )}
          </button>
        </form>

        <div className="login-footer">
          <p>Need access? Contact your administrator</p>
          <p style={{ 
            fontSize: "0.8rem", 
            color: "#888", 
            marginTop: "10px" 
          }}>
            Demo: Company ID: 444 | Password: 4444
          </p>
        </div>
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
