// ================= REVIEWS PAGE =================
// config.js and layout.js must be loaded before this file

const token = localStorage.getItem("token");
const user = JSON.parse(localStorage.getItem("user"));

if (!token) {
  window.location.href = "../login.html";
}

// Reviewer only page
if (user.role !== "reviewer") {
  window.location.href = "dashboard.html";
}

async function loadReviews() {
  try {
    const papers = await apiCall("/papers");
    displayReviews(papers);
  } catch (error) {
    console.error("Load reviews error:", error);
    window.Layout.showToast("Failed to load reviews", "error");
  }
}

function displayReviews(papers) {
  const container = document.getElementById("reviews-list");
  if (!container) return;
  
  if (papers.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📭</div>
        <div class="empty-title">No assigned papers</div>
        <div class="empty-description">Papers assigned to you will appear here</div>
      </div>
    `;
    return;
  }
  
  let html = '';
  
  papers.forEach(paper => {
    const isReviewed = !!paper.reviewComment;
    const statusClass = paper.status === "pending" ? "badge-pending" : 
                        paper.status === "accepted" ? "badge-accepted" : "badge-rejected";
    
    html += `
      <div class="card" id="paper-${paper._id}" style="margin-bottom: 20px;">
        <div class="card-header" style="padding-bottom: 0;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; width: 100%;">
            <h3 class="card-title" style="margin-bottom: 4px;">${escapeHtml(paper.title)}</h3>
            <span class="badge ${statusClass}">${paper.status}</span>
          </div>
        </div>
        <div class="card-body">
          <div style="font-size: 14px; color: var(--text-secondary); margin-bottom: 12px;">Submitted by: <strong>${escapeHtml(paper.authorName)}</strong></div>
          <p style="margin-bottom: 20px; line-height: 1.5; color: var(--text-secondary);">${escapeHtml(paper.abstract.substring(0, 200))}...</p>
          
          <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border-light); padding-top: 16px;">
            ${isReviewed ? `
              <div>
                <span class="badge badge-success" style="background: rgba(16, 185, 129, 0.1); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.2);">
                  ✓ Review Submitted
                </span>
                <span style="font-size: 14px; color: var(--text-secondary); margin-left: 12px;">Recommendation: <strong>${paper.reviewDecision}</strong></span>
              </div>
            ` : `
              <div>
                <span class="badge badge-pending" style="background: rgba(59, 130, 246, 0.1); color: var(--primary); border: 1px solid rgba(59, 130, 246, 0.2);">
                  ! Awaiting Your Review
                </span>
              </div>
            `}
            
            <a href="paper-detail.html?id=${paper._id}" class="btn btn-primary btn-sm">
              ${isReviewed ? "View My Review" : "Open Paper & Start Review"}
            </a>
          </div>
        </div>
      </div>
    `;
  });
  
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
window.loadReviews = loadReviews;

document.addEventListener("DOMContentLoaded", loadReviews);