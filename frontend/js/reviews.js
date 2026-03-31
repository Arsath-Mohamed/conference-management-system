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
    const isReviewed = paper.reviewDecision !== null;
    const statusClass = paper.status === "pending" ? "badge-pending" : 
                        paper.status === "accepted" ? "badge-accepted" : "badge-rejected";
    
    html += `
      <div class="card" id="paper-${paper._id}">
        <div class="card-header">
          <h3 class="card-title">${escapeHtml(paper.title)}</h3>
          <span class="badge ${statusClass}">${paper.status}</span>
        </div>
        <div class="card-body">
          <p><strong>Author:</strong> ${escapeHtml(paper.authorName)}</p>
          <p><strong>Abstract:</strong> ${escapeHtml(paper.abstract)}</p>
          ${paper.file ? `<a href="/uploads/${paper.file}" target="_blank" class="btn btn-secondary btn-sm">Download PDF</a>` : ""}
          
          ${isReviewed ? `
            <div class="review-complete">
              <div class="review-header">
                <span class="badge badge-success">Review Completed</span>
              </div>
              <div class="review-details">
                <div><strong>Decision:</strong> ${paper.reviewDecision === "accept" ? "Accepted" : "Rejected"}</div>
                <div><strong>Rating:</strong> ${"★".repeat(paper.reviewRating)} (${paper.reviewRating}/5)</div>
                <div><strong>Comment:</strong> ${escapeHtml(paper.reviewComment)}</div>
              </div>
            </div>
          ` : `
            <div class="review-form">
              <h4 class="review-title">Submit Your Review</h4>
              
              <div class="form-group">
                <label class="form-label">Decision *</label>
                <select id="decision-${paper._id}" class="form-select">
                  <option value="accept">Accept</option>
                  <option value="reject">Reject</option>
                </select>
              </div>
              
              <div class="form-group">
                <label class="form-label">Rating *</label>
                <select id="rating-${paper._id}" class="form-select">
                  <option value="1">1 - Poor</option>
                  <option value="2">2 - Fair</option>
                  <option value="3">3 - Good</option>
                  <option value="4">4 - Very Good</option>
                  <option value="5">5 - Excellent</option>
                </select>
              </div>
              
              <div class="form-group">
                <label class="form-label">Comments *</label>
                <textarea id="comment-${paper._id}" class="form-textarea" rows="4" placeholder="Provide detailed feedback..."></textarea>
              </div>
              
              <button class="btn btn-primary" onclick="window.submitReview('${paper._id}')" id="review-btn-${paper._id}">Submit Review</button>
            </div>
          `}
        </div>
      </div>
    `;
  });
  
  container.innerHTML = html;
}

async function submitReview(paperId) {
  const decision = document.getElementById(`decision-${paperId}`).value;
  const rating = document.getElementById(`rating-${paperId}`).value;
  const comment = document.getElementById(`comment-${paperId}`).value.trim();
  const btn = document.getElementById(`review-btn-${paperId}`);
  
  if (!comment) {
    window.Layout.showToast("Please provide review comments", "error");
    return;
  }
  
  btn.disabled = true;
  btn.innerText = "Submitting...";
  
  try {
    await apiCall(`/papers/${paperId}/review`, {
      method: "PUT",
      body: JSON.stringify({ decision, rating, comment })
    });
    
    window.Layout.showToast("Review submitted successfully!", "success");
    setTimeout(() => loadReviews(), 1000);
  } catch (error) {
    window.Layout.showToast(error.message, "error");
    btn.disabled = false;
    btn.innerText = "Submit Review";
  }
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
window.submitReview = submitReview;

document.addEventListener("DOMContentLoaded", loadReviews);