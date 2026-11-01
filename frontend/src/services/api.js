/**
 * Frontend API Client for AI Study Support Agent
 * Automatically connects to backend on Render (https://study-support-ai.onrender.com) or localhost.
 */

const API_BASE = 
  import.meta.env.VITE_API_URL || 
  (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:5000'
    : 'https://study-support-ai.onrender.com');

/**
 * Generic fetch wrapper with JSON error handling and credentials support (HttpOnly cookies)
 */
async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  const response = await fetch(url, {
    credentials: 'include',
    ...options,
    headers
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data.error || data.message || `Request failed with status ${response.status}`;
    const err = new Error(errorMsg);
    err.status = response.status;
    err.data = data;
    throw err;
  }

  return data;
}

// Authentication API
export async function loginApi(credentials) {
  return request('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials)
  });
}

export async function registerApi(userData) {
  return request('/auth/register', {
    method: 'POST',
    body: JSON.stringify(userData)
  });
}

export async function logoutApi() {
  return request('/auth/logout', {
    method: 'POST'
  });
}

export async function getCurrentUser() {
  return request('/auth/me');
}

// Quiz Integrity & Telemetry API
export async function logQuizViolation(attemptId, violationData) {
  return request(`/api/quizzes/${encodeURIComponent(attemptId)}/log-event`, {
    method: 'POST',
    body: JSON.stringify(violationData)
  });
}

export async function getQuizIntegrityReport(attemptId) {
  return request(`/api/quizzes/${encodeURIComponent(attemptId)}/violations`);
}

// Tool 1: Material Search
export async function searchMaterial(query) {
  return request(`/api/materials/search?query=${encodeURIComponent(query)}`);
}

// AI Agent Prompt: Executes Bounded Tool Loop + Grounded 3-MCQ Generation (Gemini 1.5 Flash)
export async function promptAgent(topic) {
  return request('/api/agent/prompt', {
    method: 'POST',
    body: JSON.stringify({ topic })
  });
}

// Tool 2: Knowledge Assessment Evaluation (Application code scoring)
export async function evaluateAssessment(payload) {
  try {
    return await request('/api/assess', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  } catch (err) {
    if (err.status === 404) {
      return await request('/api/assessment/evaluate', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    }
    throw err;
  }
}

// Tool 3: Save Study Plan (Remote PostgreSQL)
export async function saveStudyPlan(payload) {
  return request('/api/study-plans', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

// Retrieve all saved study plans from DB
export async function getStudyPlans() {
  try {
    return await request('/api/study-plans');
  } catch (err) {
    if (err.status === 404 || err.status === 401) {
      return [];
    }
    throw err;
  }
}

// Reopen study plan by ID from DB
export async function getStudyPlanById(id) {
  return request(`/api/study-plans/${encodeURIComponent(id)}`);
}

// Update activity completion status for a study plan
export async function updatePlanActivities(id, activities) {
  return request(`/api/study-plans/${encodeURIComponent(id)}/activities`, {
    method: 'PATCH',
    body: JSON.stringify({ activities })
  });
}

// Get course materials
export async function getMaterials() {
  return request('/api/materials');
}

// Check backend health & database connectivity
export async function checkBackendHealth() {
  return request('/health');
}

export { API_BASE };
