/**
 * Production API base URL — set VITE_API_BASE_URL in hosting dashboard or .env.production
 * Local dev default: http://127.0.0.1:5000
 */
const raw = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000';

export const API_BASE_URL = raw.replace(/\/$/, '');
