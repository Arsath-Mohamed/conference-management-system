// ================= SHARED CONFIGURATION =================

const API_BASE_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:5000/api' 
  : '/api';

const UPLOAD_BASE_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:5000/uploads'
  : '/uploads';

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

  // Fix for FormData
  if (options.body instanceof FormData) {
    delete mergedOptions.headers["Content-Type"];
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, mergedOptions);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Request failed" }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

// Toast
window.Layout = window.Layout || {
  showToast(message, type = "success") {
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.innerText = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }
};
