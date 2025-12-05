/**
 * API Service for Geno React Frontend
 * Handles all communication with the Flask backend
 * Backend runs on: http://127.0.0.1:5000
 */

const API_BASE_URL = 'http://127.0.0.1:5000';

// Log the API URL for debugging
console.log('API Service initialized with BASE_URL:', API_BASE_URL);

/**
 * Get the auth token from storage
 */
const getAuthToken = () => {
  return localStorage.getItem('genoToken') || sessionStorage.getItem('genoToken');
};

/**
 * Get default headers for API requests
 */
const getHeaders = (includeAuth = true) => {
  const headers = {};
  
  if (includeAuth) {
    const token = getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }
  
  return headers;
};

/**
 * Handle API response and errors
 */
const handleResponse = async (response) => {
  if (!response.ok) {
      let errorMessage = `HTTP error ${response.status}`;
    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorData.detail || errorMessage;
    } catch (e) {
      // Response wasn't JSON, use status text
      errorMessage = response.statusText || errorMessage;
    }
    throw new Error(errorMessage);
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
      
      // Store token
      if (data.token) {
        localStorage.setItem('genoToken', data.token);
        localStorage.setItem('genoUser', JSON.stringify(data.user));
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
    localStorage.removeItem('genoToken');
    localStorage.removeItem('genoUser');
    localStorage.removeItem('genoLoggedIn');
    localStorage.removeItem('genoCompanyId');
    sessionStorage.removeItem('genoToken');
    sessionStorage.removeItem('genoUser');
    sessionStorage.removeItem('genoLoggedIn');
    sessionStorage.removeItem('genoCompanyId');
  },

  /**
   * Check if user is authenticated
   */
  isAuthenticated: () => {
    return !!(getAuthToken() || 
      localStorage.getItem('genoLoggedIn') === 'true' ||
      sessionStorage.getItem('genoLoggedIn') === 'true');
  },

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
      const token = localStorage.getItem('genoToken') || sessionStorage.getItem('genoToken');
      if (!token) {
        throw new Error('Authentication required');
      }

      // Step 1: Upload file
      if (onProgress) onProgress(10);
      
      const formData = new FormData();
      formData.append('file', file);
      
      const uploadResponse = await fetch(`${API_BASE_URL}/api/files/upload`, {
        method: 'POST',
        mode: 'cors',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData,
      });
      
      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json().catch(() => ({}));
        throw new Error(errorData.error || `Upload failed: ${uploadResponse.status}`);
      }
      
      const uploadData = await uploadResponse.json();
      const fileId = uploadData.file?.file_id;
      
      if (!fileId) {
        throw new Error('File upload succeeded but no file_id returned');
      }
      
      if (onProgress) onProgress(50);
      
      // Step 2: Process file
      const processResponse = await fetch(`${API_BASE_URL}/api/reports/process/${fileId}`, {
        method: 'POST',
        mode: 'cors',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!processResponse.ok) {
        const errorData = await processResponse.json().catch(() => ({}));
        throw new Error(errorData.error || `Processing failed: ${processResponse.status}`);
      }
      
      if (onProgress) onProgress(90);
      
      const processData = await processResponse.json();
      
      // Get the full report data
      const sequenceId = processData.report?.sequence_id;
      if (!sequenceId) {
        throw new Error('Processing succeeded but no sequence_id returned');
      }
      
      const reportResponse = await fetch(`${API_BASE_URL}/api/reports/${sequenceId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!reportResponse.ok) {
        throw new Error('Failed to retrieve report data');
      }
      
      const reportData = await reportResponse.json();
      
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
      const response = await fetch(`${API_BASE_URL}/api/reports/${sequenceId}`, {
        method: 'GET',
        headers: getHeaders(true),
      });
      
      return handleResponse(response);
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
      const response = await fetch(`${API_BASE_URL}/api/reports/${sequenceId}/pdf`, {
        method: 'GET',
        headers: getHeaders(true),
      });
      
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
      // Get all reports to calculate summary
      const response = await fetch(`${API_BASE_URL}/api/reports`, {
        method: 'GET',
        mode: 'cors',
        headers: getHeaders(true),
      });
      
      const data = await handleResponse(response);
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
      const response = await fetch(`${API_BASE_URL}/api/reports`, {
        method: 'GET',
        mode: 'cors',
        headers: getHeaders(true),
      });
      
      const data = await handleResponse(response);
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
  const token = localStorage.getItem('genoToken') || sessionStorage.getItem('genoToken');
  if (!token) {
    throw new Error('Authentication required');
  }
  
  const res = await fetch(`${API_BASE_URL}/api/reports`, {
    method: 'GET',
    mode: 'cors',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  
  if (!res.ok) {
    throw new Error(`Dashboard request failed with status ${res.status}`);
  }
  
  const data = await res.json();
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
  
  const res = await fetch(`${API_BASE_URL}/history?${params.toString()}`, {
    method: 'GET',
    mode: 'cors',
  });
  if (!res.ok) {
    throw new Error(`History request failed with status ${res.status}`);
  }
  return res.json();
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
