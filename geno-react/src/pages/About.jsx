// src/pages/About.jsx
import React, { useEffect, useState } from "react";
import CountUp from "../components/CountUp";

export default function About() {
  // Keys we use to restart the hover animation
  const [samplesKey, setSamplesKey] = useState(0);
  const [geneticKey, setGeneticKey] = useState(0);
  const [accuracyKey, setAccuracyKey] = useState(0);

  // Animation of the appearance of cards when entering the screen
  useEffect(() => {
    const statCards = document.querySelectorAll(".stat-card");
    if (!statCards.length) return;

    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.style.opacity = "0";
            entry.target.style.transform = "translateY(30px)";

            setTimeout(() => {
              entry.target.style.transition = "all 0.6s ease";
              entry.target.style.opacity = "1";
              entry.target.style.transform = "translateY(0)";
            }, 100);

            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.2 }
    );

    statCards.forEach((card, index) => {
      setTimeout(() => observer.observe(card), index * 100);
    });

    return () => observer.disconnect();
  }, []);

  // Accuracy bar animation
  useEffect(() => {
    const accuracyFill = document.querySelector(".accuracy-fill");
    if (!accuracyFill) return;

    accuracyFill.style.width = "0%";
    setTimeout(() => {
      accuracyFill.style.transition = "width 1.5s ease";
      accuracyFill.style.width = "89%";
    }, 500);
  }, []);

  return (
    <main className="about-content">
      <h1 className="about-title">About Us</h1>

      <p className="about-description">
        GENO is a platform dedicated to laboratory <br />
        experts to analyze genes and assess addiction <br />
        susceptibility with the help of artificial intelligence
      </p>

      <div className="stats-container-new">
        <div className="stats-left">
          {/* 30,000+ */}
          <div
            className="stat-card"
            onMouseEnter={() => setSamplesKey((k) => k + 1)}
          >
            <h3 className="stat-number">
              <CountUp key={samplesKey} from={0} to={30} duration={2} />K
            </h3>
            <p className="stat-label">Tested Samples</p>
          </div>

          {/* 40% */}
          <div
            className="stat-card"
            onMouseEnter={() => setGeneticKey((k) => k + 1)}
          >
            <h3 className="stat-number">
              <CountUp key={geneticKey} from={0} to={40} duration={2} />%
            </h3>
            <p className="stat-label">Genetic Addiction Discovered</p>
          </div>

          {/* 89% + progress bar */}
          <div
            className="stat-card"
            onMouseEnter={() => setAccuracyKey((k) => k + 1)}
          >
            <h3 className="stat-number">
              <CountUp key={accuracyKey} from={0} to={89} duration={2} />%
            </h3>
            <p className="stat-label">Accuracy</p>

            <div className="accuracy-bar">
              <div className="accuracy-fill" />
            </div>
          </div>
        </div>

        <div className="stats-right">
          <div className="stat-card stat-card-large">
            <p className="ai-description">
              Our AI has been trained to analyze genetic patterns <br />
              related to addiction and estimate their risk with <br />
              high reliability.
              <br />
              <br />
              Our advanced algorithms identify genetic patterns <br />
              to generate reliable predictions, helping <br />
              laboratories make informed decisions for early evaluation.
            </p>
          </div>
        </div>
      </div>

      {/* ===== Footer (About page ) ===== */}
      <footer className="footer">
        <div className="footer-wrapper">
          <div className="footer-item">
            <p className="footer-label">Location</p>
            <p className="footer-text">Jeddah, KSA</p>
          </div>

          <div className="footer-item">
            <p className="footer-label">Contact</p>
            <p className="footer-text">GENO@gmail.com</p>
          </div>
        </div>

        <p className="footer-bottom">© 2025 GENO. All rights reserved.</p>
      </footer>
    </main>
  );
}