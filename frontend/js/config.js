// ================= SHARED CONFIGURATION =================

// Use absolute URLs for local development, relative for production
const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

const API_BASE_URL = isLocal 
  ? 'http://localhost:5000/api' 
  : `${window.location.origin}/api`;

const UPLOAD_BASE_URL = isLocal
  ? 'http://localhost:5000/uploads'
  : `${window.location.origin}/uploads`;

// Helper function
async function apiCall(endpoint, options = {}) {
  const token = localStorage.getItem("token");

  const defaultOptions = {
    headers: {
      "Content-Type": "application/json",
      ...(token && { "Authorization": `Bearer ${token}` })
    }
  };

  const mergedOptions = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers
    }
  };

  if (options.body instanceof FormData) {
    delete mergedOptions.headers["Content-Type"];
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, mergedOptions);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: "Request failed" }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`[API ERROR] ${endpoint}:`, error);
    throw error;
  }
}

// Safe User Parsing
function getUser() {
  try {
    const raw = localStorage.getItem("user");
    if (!raw) return {};
    return JSON.parse(raw) || {};
  } catch (e) {
    console.error("User parsing failed:", e);
    return {};
  }
}

window.getUser = getUser;

// Global layout extensions
window.Layout = window.Layout || {};
if (!window.Layout.showToast) {
  window.Layout.showToast = (message, type = "success") => {
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.innerText = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  };
}
