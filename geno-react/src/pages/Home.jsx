import React from "react";
import { Link } from "react-router-dom";

export default function Home() {
  return (
    <main className="main-content">
      <h1 className="main-title">GENO</h1>

      <p className="main-description">
        offers advanced AI-powered genetic analysis focused<br />
        on addiction risk, helping laboratories with early<br />
        evaluation and informed decision-making
      </p>

      <Link to="/about" className="btn-get-started">
        Get Started
      </Link>
    </main>
  );
}