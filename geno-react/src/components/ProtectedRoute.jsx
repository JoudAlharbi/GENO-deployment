import React from 'react';
import { Navigate } from 'react-router-dom';
import { DEMO_MODE } from '../config/demo';

function isLoggedIn() {
  return (
    localStorage.getItem('genoLoggedIn') === 'true' ||
    sessionStorage.getItem('genoLoggedIn') === 'true'
  );
}

export default function ProtectedRoute({ children }) {
  if (DEMO_MODE) {
    return children;
  }
  if (!isLoggedIn()) {
    return <Navigate to="/login" replace />;
  }
  return children;
}
