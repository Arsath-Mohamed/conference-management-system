// ================= DASHBOARD PAGE =================
// config.js and layout.js must be loaded before this file

const token = localStorage.getItem("token");

if (!token) {
  window.location.href = "../login.html";
}

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
    
    // Display recent papers
    displayRecentPapers(papers.slice(0, 5));
    
  } catch (error) {
    console.error("Dashboard error:", error);
    window.Layout.showToast(error.message, "error");
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

// Auto-load when DOM is ready
document.addEventListener("DOMContentLoaded", loadDashboard);