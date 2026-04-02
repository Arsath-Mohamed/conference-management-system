// ================= DASHBOARD PAGE =================
// config.js and layout.js must be loaded before this file

const token = localStorage.getItem("token");

if (!token) {
  window.location.href = "../login.html";
}

let currentSettings = null;

async function loadDashboard() {
  try {
    const user = JSON.parse(localStorage.getItem("user"));
    
    // Fetch papers using the shared apiCall function
    const papers = await apiCall("/papers");
    
    // Calculate stats
    const total = papers.length;
    const accepted = papers.filter(p => p.status === "accepted").length;
    const pending = papers.filter(p => p.status === "pending").length;
    
    document.getElementById("total-papers").innerText = total;
    document.getElementById("accepted-papers").innerText = accepted;
    document.getElementById("pending-papers").innerText = pending;
    
    // Load users count (admin only)
    if (user.role === "admin") {
      const users = await apiCall("/users");
      document.getElementById("total-users").innerText = users.length;
    } else {
      const usersCard = document.querySelector(".stat-card:last-child");
      if (usersCard) usersCard.style.display = "none";
    }
    
    // Load Settings if Admin or Chair
    if (user.role === "admin" || user.role === "chair") {
      const settingsCard = document.getElementById("conference-settings-card");
      if (settingsCard) {
        settingsCard.style.display = "block";
        currentSettings = await apiCall("/settings");
        updateSettingsUI();
      }
    }
    
    // Display recent papers
    displayRecentPapers(papers.slice(0, 5));
    
  } catch (error) {
    console.error("Dashboard error:", error);
    window.Layout.showToast(error.message, "error");
  }
}

function updateSettingsUI() {
  const btn = document.getElementById("toggle-conference-btn");
  if (!btn || !currentSettings) return;
  
  // Populate form
  if (document.getElementById("conf-name")) {
    document.getElementById("conf-name").value = currentSettings.name || "";
    document.getElementById("conf-desc").value = currentSettings.description || "";
    document.getElementById("conf-location").value = currentSettings.location || "";
    
    if (currentSettings.submissionDeadline) {
      document.getElementById("conf-deadline").value = currentSettings.submissionDeadline.split('T')[0];
    }
    if (currentSettings.eventDate) {
      document.getElementById("conf-eventdate").value = currentSettings.eventDate.split('T')[0];
    }
  }

  if (currentSettings.isConferenceAnnounced) {
    btn.innerText = "Close Conference";
    btn.className = "btn btn-danger";
  } else {
    btn.innerText = "Save & Announce";
    btn.className = "btn btn-primary";
  }
}

async function saveConferenceSettings() {
  if (!currentSettings) return;
  
  const newState = !currentSettings.isConferenceAnnounced;
  const btn = document.getElementById("toggle-conference-btn");
  btn.disabled = true;
  btn.innerText = "Saving...";
  
  const payload = {
    isConferenceAnnounced: newState,
    name: document.getElementById("conf-name")?.value || "Annual Conference",
    description: document.getElementById("conf-desc")?.value || "",
    submissionDeadline: document.getElementById("conf-deadline")?.value ? new Date(document.getElementById("conf-deadline").value).toISOString() : null,
    eventDate: document.getElementById("conf-eventdate")?.value ? new Date(document.getElementById("conf-eventdate").value).toISOString() : null,
    location: document.getElementById("conf-location")?.value || ""
  };
  
  try {
    const updatedSettings = await apiCall("/settings", {
      method: "PUT",
      body: JSON.stringify(payload)
    });
    currentSettings = updatedSettings;
    window.Layout.showToast(newState ? "Conference Announced successfully!" : "Conference Closed!", "success");
    updateSettingsUI();
  } catch (error) {
    console.error("Settings error:", error);
    window.Layout.showToast(error.message, "error");
    updateSettingsUI(); // reset UI
  } finally {
    btn.disabled = false;
  }
}

function displayRecentPapers(papers) {
  const container = document.getElementById("recent-activity");
  if (!container) return;
  
  if (papers.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📭</div>
        <div class="empty-title">No papers yet</div>
        <div class="empty-description">Submit your first paper to get started</div>
      </div>
    `;
    return;
  }
  
  let html = '<div class="table-container"><table class="table"><thead><tr><th>Title</th><th>Status</th><th>Submitted</th></tr></thead><tbody>';
  
  papers.forEach(paper => {
    const statusClass = paper.status === "pending" ? "badge-pending" : 
                        paper.status === "accepted" ? "badge-accepted" : "badge-rejected";
    html += `
      <tr>
        <td><strong>${escapeHtml(paper.title)}</strong><br><small class="text-muted">${escapeHtml(paper.abstract.substring(0, 60))}...</small></td>
        <td><span class="badge ${statusClass}">${paper.status}</span></td>
        <td>${new Date(paper.createdAt).toLocaleDateString()}</td>
      </tr>
    `;
  });
  
  html += '</tbody><table></div>';
  container.innerHTML = html;
}

function escapeHtml(str) {
  if (!str) return "";
  return str.replace(/[&<>]/g, function(m) {
    if (m === "&") return "&amp;";
    if (m === "<") return "&lt;";
    if (m === ">") return "&gt;";
    return m;
  });
}

// Make functions globally available
window.loadDashboard = loadDashboard;
window.saveConferenceSettings = saveConferenceSettings;

// Auto-load when DOM is ready
document.addEventListener("DOMContentLoaded", loadDashboard);