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
    const json = await response.json();

    console.log("API RESPONSE:", json);

    if (!response.ok || !json.success) {
      const errorMsg = json.message || `HTTP ${response.status}`;
      throw new Error(errorMsg);
    }

    return json.data || [];
  } catch (error) {
    console.error(`[API ERROR] ${endpoint}:`, error);
    alert(`Failed to load data: ${error.message}`); // Show specific error
    throw error;
  }
}

// Safe User Parsing (Updated)
function getUser() {
  try {
    const raw = localStorage.getItem("user");
    if (!raw) return { name: "User", role: "" };
    const user = JSON.parse(raw) || {};
    return {
      ...user,
      name: user.name || "User"
    };
  } catch (e) {
    return { name: "User", role: "" };
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
