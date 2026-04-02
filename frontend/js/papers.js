// ================= PAPERS PAGE (UPDATED) =================
// Includes search, filtering, and in-app PDF preview.

const token = window.localStorage.getItem("token");
const user = JSON.parse(window.localStorage.getItem("user") || "{}");

if (!token) {
  window.location.href = "../login.html";
}

let allPapers = []; // Global cache for filtering

async function loadPapers() {
  try {
    const settings = await apiCall("/settings");
    
    // Conference metadata display
    if (settings.isConferenceAnnounced && settings.name) {
      document.getElementById("conference-info-card").style.display = "block";
      document.getElementById("info-name").innerText = settings.name;
      document.getElementById("info-desc").innerText = settings.description || "";
      document.getElementById("info-date").innerText = settings.eventDate ? new Date(settings.eventDate).toLocaleDateString() : "TBD";
      document.getElementById("info-loc").innerText = settings.location || "TBD";
      document.getElementById("info-deadline").innerText = settings.submissionDeadline ? new Date(settings.submissionDeadline).toLocaleDateString() : "TBD";
    }

    const isDeadlinePassed = settings.submissionDeadline ? new Date() > new Date(settings.submissionDeadline) : false;
    
    // Author submission guard
    if (user.role === "author") {
      if (settings.isConferenceAnnounced && !isDeadlinePassed) {
        document.getElementById("submit-section").style.display = "block";
      } else {
        const closedMsg = document.getElementById("closed-message");
        if (closedMsg) {
          closedMsg.style.display = "block";
          if (isDeadlinePassed) {
             closedMsg.innerHTML = `<div class="card-body" style="color: #856404; padding: 16px;"><strong>Notice:</strong> The submission deadline (${new Date(settings.submissionDeadline).toLocaleDateString()}) has passed.</div>`;
          }
        }
      }
    }

    if (user.role === "admin" || user.role === "chair") {
      const bulkActions = document.getElementById("bulk-actions");
      if (bulkActions) bulkActions.style.display = "block";
    }

    // Fetch and store
    allPapers = await apiCall("/papers");
    filterPapers(); // Initial display
  } catch (error) {
    console.error("Load papers error:", error);
    window.Layout.showToast("Failed to load dashboard", "error");
  }
}

function filterPapers() {
  const searchTerm = document.getElementById("paper-search")?.value.toLowerCase() || "";
  const statusFilter = document.getElementById("status-filter")?.value || "all";

  const filtered = allPapers.filter(p => {
    const matchesSearch = p.title.toLowerCase().includes(searchTerm) || 
                          p.authorName.toLowerCase().includes(searchTerm);
    const matchesStatus = statusFilter === "all" || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  displayPapers(filtered);
}

function displayPapers(papers) {
  const container = document.getElementById("papers-list");
  if (!container) return;

  if (papers.length === 0) {
    container.innerHTML = `<div class="empty-state">No papers matching your criteria.</div>`;
    return;
  }

  let html = `
    <div class="table-container">
      <table class="table">
        <thead>
          <tr>
            <th>Title & Abstract</th>
            <th>Author</th>
            <th>Status</th>
            <th>Date</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
  `;

  papers.forEach(p => {
    const statusClass = p.status === "pending" ? "badge-pending" :
      p.status === "accepted" ? "badge-accepted" : "badge-rejected";

    html += `
      <tr>
        <td>
          <div style="font-weight: 600; color: var(--text-primary); margin-bottom: 4px;">${escapeHtml(p.title)}</div>
          <div style="font-size: 11px; color: var(--text-muted); line-height: 1.3;">${escapeHtml(p.abstract ? p.abstract.substring(0, 80) : '')}...</div>
        </td>
        <td>${escapeHtml(p.authorName || 'Anonymous')}</td>
        <td><span class="badge ${statusClass}">${p.status.toUpperCase()}</span></td>
        <td>${new Date(p.createdAt).toLocaleDateString()}</td>
        <td>
          <div style="display: flex; gap: 8px;">
            <a href="paper-detail.html?id=${p._id}" class="btn btn-sm btn-primary" title="Full Details">Details</a>
            ${p.file ? `<button onclick="Layout.openPdfPreview('${UPLOAD_BASE_URL}/${p.file}', '${escapeHtml(p.title)}')" class="btn btn-sm btn-secondary" title="Quick Preview">📄</button>` : ''}
            ${(user.role === 'admin' || user.role === 'chair') ? `
              <button class="btn btn-sm btn-danger" onclick="deletePaper('${p._id}')" title="Erase Record">🗑️</button>
            ` : ''}
          </div>
        </td>
      </tr>
    `;
  });

  html += `</tbody></table></div>`;
  container.innerHTML = html;
}

// REST OF THE FUNCTIONS (Submit, Delete remains same but cleanup naming)
async function submitPaper() {
  const title = document.getElementById("title").value;
  const abstract = document.getElementById("abstract").value;
  const fileInput = document.getElementById("file");

  if (!title || abstract.length < 50) {
    window.Layout.showToast("Title and detailed abstract (50 chars+) required.", "error");
    return;
  }

  const formData = new FormData();
  formData.append("title", title);
  formData.append("abstract", abstract);
  if (fileInput.files[0]) formData.append("file", fileInput.files[0]);

  try {
    const btn = document.getElementById("submit-btn");
    btn.disabled = true; btn.innerText = "Submitting...";
    await apiCall("/papers", { method: "POST", body: formData });
    window.Layout.showToast("Paper submitted successfully", "success");
    location.reload(); 
  } catch (err) { window.Layout.showToast(err.message, "error"); }
}

async function deletePaper(id) {
  if (!confirm("Permanently delete this paper?")) return;
  try {
    await apiCall(`/papers/${id}`, { method: "DELETE" });
    window.Layout.showToast("Paper removed", "success");
    loadPapers();
  } catch (err) { window.Layout.showToast(err.message, "error"); }
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));
}

window.filterPapers = filterPapers;
window.submitPaper = submitPaper;
window.deletePaper = deletePaper;

document.addEventListener("DOMContentLoaded", loadPapers);
