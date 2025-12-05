import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

/**
 * History Page - Redirects to Dashboard
 * 
 * According to SRS, the Dashboard IS the history view.
 * This route exists for backwards compatibility and redirects to /dashboard.
 */
export default function History() {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to Dashboard - the main history view
    navigate("/dashboard", { replace: true });
  }, [navigate]);

  // Show nothing while redirecting
  return null;
}
