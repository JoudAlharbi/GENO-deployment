import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [companyId, setCompanyId] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();

    //  444 / 4444
    if (companyId === "444" && password === "4444") {
      if (remember) {
        localStorage.setItem("genoLoggedIn", "true");
        localStorage.setItem("genoCompanyId", companyId);
      } else {
        sessionStorage.setItem("genoLoggedIn", "true");
        sessionStorage.setItem("genoCompanyId", companyId);
      }
      navigate("/dashboard");
    } else {
      alert(
        "Invalid Company ID or Password.\n\nDemo Credentials:\nCompany ID: 444\nPassword: 4444"
      );
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

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="companyId">Company ID</label>
            <input
              type="text"
              id="companyId"
              placeholder="Enter your company ID"
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
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
              required
            />
          </div>

          <div className="form-options">
          <div className="remember-section">
           <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
          />
            <label className="checkbox-label">Remember me</label>
         </div>

             <a href="#" className="forgot-password" onClick={handleForgot}>
              Forgot password?
            </a>
        </div>

          <button type="submit" className="btn-login">
            Log In
          </button>
        </form>

        <div className="login-footer">
          <p>Need access? Contact your administrator</p>
        </div>
      </div>
    </main>
  );
}