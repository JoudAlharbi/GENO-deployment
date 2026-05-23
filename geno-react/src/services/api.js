/**
 * API Service for Geno React Frontend
 * Handles all communication with the Flask backend
 */

import { API_BASE_URL } from '../config/apiBase';

if (import.meta.env.DEV) {
  console.info('[GENO] API base:', API_BASE_URL);
}

const INVALID_TOKENS = new Set(['demo-token', 'null', 'undefined']);

/**
 * True if value looks like a signed JWT (three base64 segments).
 */
export const isValidJwt = (token) => {
  if (!token || typeof token !== 'string') return false;
  const t = token.trim();
  if (!t || INVALID_TOKENS.has(t)) return false;
  const parts = t.split('.');
  return parts.length === 3 && parts.every((p) => p.length > 0);
};

/**
 * Get a valid JWT from storage.
 * Prefers the storage where the user actually logged in (remember me vs session).
 */
export const getAuthToken = () => {
  const sessionActive = sessionStorage.getItem('genoLoggedIn') === 'true';
  const localActive = localStorage.getItem('genoLoggedIn') === 'true';

  const storages =
    sessionActive && !localActive
      ? [sessionStorage, localStorage]
      : [localStorage, sessionStorage];

  for (const storage of storages) {
    const token = storage.getItem('genoToken');
    if (isValidJwt(token)) {
      return token.trim();
    }
  }
  return null;
};

/** Build headers with Authorization always set last (cannot be overwritten). */
export const buildAuthHeaders = (extraHeaders = {}, { json = false, formData = false } = {}) => {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required. Please log in again.');
  }

  const headers = new Headers(extraHeaders);
  if (json && !formData) {
    headers.set('Content-Type', 'application/json');
  }
  if (formData) {
    headers.delete('Content-Type');
  }
  headers.set('Authorization', `Bearer ${token}`);
  return headers;
};

export const clearAuthStorage = () => {
  ['genoToken', 'genoUser', 'genoLoggedIn', 'genoCompanyId', 'token'].forEach((key) => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  });
};

export const storeAuthSession = (token, user, remember = true) => {
  if (!isValidJwt(token)) {
    throw new Error(
      'Server returned an invalid session token. Please redeploy the backend or contact support.'
    );
  }
  clearAuthStorage();
  const storage = remember ? localStorage : sessionStorage;
  storage.setItem('genoToken', token);
  storage.setItem('genoUser', JSON.stringify(user));
  storage.setItem('genoLoggedIn', 'true');
};

/**
 * Get default headers for API requests
 */
const getHeaders = (includeAuth = true, options = {}) => {
  if (!includeAuth) {
    return {};
  }
  const headerObj = buildAuthHeaders({}, options);
  const plain = {};
  headerObj.forEach((value, key) => {
    plain[key] = value;
  });
  return plain;
};

const parseErrorMessage = async (response) => {
  let errorMessage = `HTTP error ${response.status}`;
  try {
    const errorData = await response.json();
    errorMessage = errorData.error || errorData.detail || errorMessage;
  } catch {
    errorMessage = response.statusText || errorMessage;
  }
  return errorMessage;
};

/**
 * Handle API response and errors
 */
const handleResponse = async (response) => {
  if (!response.ok) {
    const errorMessage = await parseErrorMessage(response);
    if (response.status === 401) {
      clearAuthStorage();
      throw new Error('Session expired or invalid. Please log in again.');
    }
    throw new Error(errorMessage);
  }
  return response.json();
};

/**
 * Authenticated fetch — always attaches Bearer JWT.
 * FormData: never set Content-Type (browser adds multipart boundary).
 */
export const authFetch = async (url, options = {}) => {
  const { method = 'GET', body, headers: extraHeaders, ...rest } = options;
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  const isJsonBody =
    body !== undefined &&
    !isFormData &&
    !(body instanceof Blob) &&
    typeof body === 'string';

  const headers = buildAuthHeaders(extraHeaders, {
    json: isJsonBody,
    formData: isFormData,
  });

  const response = await fetch(url, {
    ...rest,
    method,
    body,
    headers,
    mode: 'cors',
    credentials: 'omit',
  });

  if (response.status === 401) {
    clearAuthStorage();
    const msg = await parseErrorMessage(response);
    throw new Error(msg || 'Authentication required. Please log in again.');
  }

  return response;
};

/** authFetch + parse JSON on success */
const authFetchJson = async (url, options = {}) => {
  const response = await authFetch(url, options);
  if (!response.ok) {
    const msg = await parseErrorMessage(response);
    throw new Error(msg || `Request failed: ${response.status}`);
  }
  return response.json();
};

/**
 * API Service object with all endpoints
 */
const apiService = {
  /**
   * Health check - verify backend is running
   */
  healthCheck: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/health`);
      return handleResponse(response);
    } catch (error) {
      console.error('Health check failed:', error);
      throw error;
    }
  },

  /**
   * User login
   * @param {string} employeeId - Employee/Company ID
   * @param {string} password - User password
   * @returns {Promise<Object>} Login response with token
   */
  login: async (employeeId, password) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          employee_id: employeeId,
          password: password,
        }),
      });
      
      const data = await handleResponse(response);

      if (!data.token || !isValidJwt(data.token)) {
        throw new Error(
          'Login succeeded but the server returned an invalid token. ' +
          'Redeploy the backend with the latest auth fix, then log in again.'
        );
      }

      return data;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  },

  /**
   * Logout - clear stored credentials
   */
  logout: () => {
    clearAuthStorage();
  },

  /**
   * Check if user is authenticated (valid JWT present)
   */
  isAuthenticated: () => !!getAuthToken(),

  /**
   * Upload and analyze CSV file (Flask two-step process)
   * Step 1: Upload file to /api/files/upload
   * Step 2: Process file at /api/reports/process/<file_id>
   * @param {File} file - The CSV file to analyze
   * @param {Function} onProgress - Optional progress callback
   * @returns {Promise<Object>} Analysis results
   */
  analyzeCSV: async (file, onProgress = null) => {
    try {
      if (!getAuthToken()) {
        throw new Error('Authentication required. Please log in again.');
      }

      // Step 1: Upload file (multipart — Authorization only, no Content-Type)
      if (onProgress) onProgress(10);

      const formData = new FormData();
      formData.append('file', file);

      const uploadData = await authFetchJson(`${API_BASE_URL}/api/files/upload`, {
        method: 'POST',
        body: formData,
      });

      const fileId = uploadData.file?.file_id;
      if (!fileId) {
        throw new Error('File upload succeeded but no file_id returned');
      }

      if (onProgress) onProgress(50);

      // Step 2: Run analysis (fresh JWT read; explicit JSON body)
      const processData = await authFetchJson(
        `${API_BASE_URL}/api/reports/process/${encodeURIComponent(fileId)}`,
        {
          method: 'POST',
          body: JSON.stringify({}),
        }
      );

      if (onProgress) onProgress(90);

      const sequenceId = processData.report?.sequence_id;
      if (!sequenceId) {
        throw new Error('Processing succeeded but no sequence_id returned');
      }

      // Step 3: Fetch full report
      const reportData = await authFetchJson(
        `${API_BASE_URL}/api/reports/${encodeURIComponent(sequenceId)}`,
        { method: 'GET' }
      );
      
      // Extract actual risk score from analysis_result (already a percentage 0-100)
      const analysisResult = reportData.analysis_result || {};
      const result = analysisResult.result || {};
      const reportObj = analysisResult.report || {};
      
      // Get the actual risk score (already a percentage 0-100, don't multiply)
      const scorePercent = result.score_percent ?? reportObj.risk_score_percent ?? 0;
      const riskLevel = scorePercent >= 75 ? 'HIGH' : 'LOW';
      
      // Model accuracy is separate (for reference only)
      const accuracy = reportData.accuracy || 0;
      
      const transformedResult = {
        report: {
          sample_id: reportData.sequence_id,
          laboratory_user_id: reportObj.laboratory_user_id || 'LAB-DEMO-001',
          generated_at: reportObj.generated_at || new Date().toISOString(),
          model_name: reportObj.model_name || 'geno_enet_pipeline.pkl',
          total_genes_in_model: reportObj.total_genes_in_model || 237,
          risk_level: reportObj.risk_level || riskLevel,
          risk_score_percent: scorePercent,  // Already a percentage (0-100), don't multiply
          summary_text: reportObj.summary_text || (riskLevel === 'HIGH'
            ? `The genetic analysis indicates an ELEVATED risk profile with gene expression patterns consistent with increased addiction susceptibility. The calculated risk score of ${scorePercent.toFixed(1)}% exceeds the 75% threshold for high-risk classification.`
            : `The genetic analysis indicates a LOW risk profile. Gene expression patterns are within normal ranges with minimal addiction-related markers detected. The calculated risk score of ${scorePercent.toFixed(1)}% is below the 75% threshold.`),
          top_genes: reportObj.top_genes || [],
          bottom_genes: reportObj.bottom_genes || [],
          clinical_interpretation: reportObj.clinical_interpretation || [],
          methodology: reportObj.methodology || {}
        },
        result: {
          sequence_id: reportData.sequence_id,
          risk_level: riskLevel,
          score_percent: scorePercent,  // Already a percentage (0-100), don't multiply
          model_used: result.model_used || 'geno_enet_pipeline.pkl',
          genes_used: result.genes_used || 237,
          created_at: new Date().toISOString()
        },
        file_info: {
          original_name: file.name,
          filename: file.name
        }
      };
      
      if (onProgress) onProgress(100);
      return transformedResult;
      
    } catch (error) {
      console.error('Analysis failed:', error);
      throw error;
    }
  },

  /**
   * Get a specific report by sequence ID
   * @param {string} sequenceId - The report sequence ID
   * @returns {Promise<Object>} Report data
   */
  getReport: async (sequenceId) => {
    try {
      return authFetchJson(
        `${API_BASE_URL}/api/reports/${encodeURIComponent(sequenceId)}`,
        { method: 'GET' }
      );
    } catch (error) {
      console.error('Failed to get report:', error);
      throw error;
    }
  },

  /**
   * Download PDF report
   * @param {string} sequenceId - The report sequence ID
   * @returns {Promise<Blob>} PDF file blob
   */
  downloadReportPDF: async (sequenceId) => {
    try {
      const response = await authFetch(
        `${API_BASE_URL}/api/reports/${encodeURIComponent(sequenceId)}/pdf`,
        { method: 'GET' }
      );

      if (!response.ok) {
        throw new Error(`Failed to download PDF: ${response.status}`);
      }

      return response.blob();
    } catch (error) {
      console.error('Failed to download PDF:', error);
      throw error;
    }
  },

  /**
   * Helper to trigger browser download of a blob
   * @param {Blob} blob - The file blob
   * @param {string} filename - Desired filename
   */
  triggerDownload: (blob, filename) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },

  // ===================== Dashboard Endpoints =====================

  /**
   * Get dashboard summary statistics (calculated from reports)
   * @returns {Promise<Object>} { total_analyses, high_risk_samples, high_risk_rate }
   */
  getDashboardSummary: async () => {
    try {
      const data = await authFetchJson(`${API_BASE_URL}/api/reports`, {
        method: 'GET',
      });
      const reports = data.reports || [];
      
      // Calculate statistics
      const totalAnalyses = reports.length;
      const highRiskSamples = reports.filter(r => {
        // Extract actual risk score from analysis_result JSON
        const analysisResult = r.analysis_result || {};
        const result = analysisResult.result || {};
        const reportObj = analysisResult.report || {};
        const scorePercent = result.score_percent ?? reportObj.risk_score_percent ?? 0;
        return scorePercent >= 75; // High risk threshold (use actual risk score, not accuracy)
      }).length;
      const highRiskRate = totalAnalyses > 0 ? (highRiskSamples / totalAnalyses) * 100 : 0;
      
      return {
        total_analyses: totalAnalyses,
        high_risk_samples: highRiskSamples,
        high_risk_rate: highRiskRate
      };
    } catch (error) {
      console.error('Failed to get dashboard summary:', error);
      throw error;
    }
  },

  /**
   * Get recent analysis samples (from reports)
   * @param {number} limit - Maximum number of samples to return (default 10)
   * @returns {Promise<Object>} { items: AnalysisRecord[] }
   */
  getRecentSamples: async (limit = 10) => {
    try {
      const data = await authFetchJson(`${API_BASE_URL}/api/reports`, {
        method: 'GET',
      });
      const reports = data.reports || [];
      
      // Transform reports to match expected format
      const items = reports.slice(0, limit).map(report => {
        // Extract actual risk score from analysis_result JSON
        const analysisResult = report.analysis_result || {};
        const result = analysisResult.result || {};
        const reportObj = analysisResult.report || {};
        const scorePercent = result.score_percent ?? reportObj.risk_score_percent ?? 0;
        const riskLevel = scorePercent >= 75 ? 'HIGH' : 'LOW';
        
        return {
          sequence_id: report.sequence_id,
          file_name: report.file_count > 0 ? `File ${report.sequence_id}` : 'Unknown',
          risk_score: scorePercent,  // Already a percentage (0-100), don't multiply
          risk_level: riskLevel,
          created_at: new Date().toISOString() // Flask doesn't return created_at, use current time
        };
      });
      
      return { items };
    } catch (error) {
      console.error('Failed to get recent samples:', error);
      throw error;
    }
  },
};

/**
 * Fetch unified dashboard data (samples + stats) from Flask reports endpoint
 * @returns {Promise<Object>} { samples: [], stats: {} }
 */
export async function fetchDashboard() {
  const data = await authFetchJson(`${API_BASE_URL}/api/reports`, { method: 'GET' });
  const reports = data.reports || [];
  
  // Transform reports to match expected dashboard format
  const samples = reports.map(report => {
    // Extract actual risk score from analysis_result JSON
    const analysisResult = report.analysis_result || {};
    const result = analysisResult.result || {};
    const reportObj = analysisResult.report || {};
    
    // Get the actual risk score (already a percentage 0-100)
    const scorePercent = result.score_percent ?? reportObj.risk_score_percent ?? 0;
    
    // Risk level based on actual score (75% threshold)
    const riskLevel = scorePercent >= 75 ? 'HIGH' : 'LOW';
    
    return {
      sequence_id: report.sequence_id,
      file_name: `Analysis ${report.sequence_id}`,
      risk_score: scorePercent,  // Already a percentage (0-100), don't multiply
      score_percent: scorePercent,  // Already a percentage (0-100), don't multiply
      risk_level: riskLevel,
      accuracy: report.accuracy,  // Model accuracy (88-98%), keep as-is for reference
      created_at: new Date().toISOString(), // Flask doesn't return created_at
      model_name: 'geno_enet_pipeline.pkl',
      total_genes: 237,
      // Include the full analysis_result so genes can be extracted
      analysis_result: analysisResult,
      // Also include top_genes and bottom_genes directly for easier access
      top_genes: reportObj.top_genes || [],
      bottom_genes: reportObj.bottom_genes || []
    };
  });
  
  // Calculate stats
  const totalAnalyses = samples.length;
  const highRiskSamples = samples.filter(s => s.risk_level === 'HIGH').length;
  const highRiskRate = totalAnalyses > 0 ? (highRiskSamples / totalAnalyses) * 100 : 0;
  
  return {
    samples,
    stats: {
      total_analyses: totalAnalyses,
      high_risk_samples: highRiskSamples,
      high_risk_rate: highRiskRate
    }
  };
}

/**
 * FR4: Fetch analysis history with sorting and filtering
 * @param {Object} options - Query options
 * @param {number} options.limit - Max number of records
 * @param {string} options.riskLevel - Filter by risk level (low/medium/high)
 * @param {string} options.sortBy - Sort field (created_at, risk_score, file_name)
 * @param {string} options.order - Sort order (asc/desc)
 * @returns {Promise<Object>} { items: [], total: number, filtered: number }
 */
export async function fetchHistory({ limit = 100, riskLevel, sortBy = 'created_at', order = 'desc' } = {}) {
  const params = new URLSearchParams();
  params.append('limit', limit);
  if (riskLevel) params.append('risk_level', riskLevel);
  params.append('sort_by', sortBy);
  params.append('order', order);
  
  return authFetchJson(`${API_BASE_URL}/history?${params.toString()}`, {
    method: 'GET',
  });
}

export default apiService;

// Named exports for convenience
export const {
  healthCheck,
  login,
  logout,
  isAuthenticated,
  analyzeCSV,
  getReport,
  downloadReportPDF,
  triggerDownload,
  getDashboardSummary,
  getRecentSamples,
} = apiService;


