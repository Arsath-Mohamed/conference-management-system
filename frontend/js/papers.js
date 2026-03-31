// ================= PAPERS PAGE =================
// config.js and layout.js must be loaded before this file

const token = window.localStorage.getItem("token");
const user = JSON.parse(window.localStorage.getItem("user") || "{}");

if (!token) {
  window.location.href = "../login.html";
}

async function loadPapers() {
  try {
    // Show sections based on role
    if (user.role === "author") {
      document.getElementById("submit-section").style.display = "block";
    }

    if (user.role === "admin" || user.role === "chair") {
      const bulkActions = document.getElementById("bulk-actions");
      if (bulkActions) bulkActions.style.display = "block";
    }

    const papers = await apiCall("/papers");
    displayPapers(papers);
  } catch (error) {
    console.error("Load papers error:", error);
    window.Layout.showToast("Failed to load papers", "error");
    document.getElementById("papers-list").innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">⚠️</div>
        <div class="empty-title">Error loading papers</div>
        <div class="empty-description">${error.message}</div>
      </div>
    `;
  }
}

function displayPapers(papers) {
  const container = document.getElementById("papers-list");
  if (!container) return;

  if (papers.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📄</div>
        <div class="empty-title">No papers found</div>
        <div class="empty-description">There are no papers submitted yet.</div>
      </div>
    `;
    return;
  }

  let html = `
    <div class="table-container">
      <table class="table">
        <thead>
          <tr>
            <th>Title</th>
            <th>Author</th>
            <th>Status</th>
            <th>Submitted</th>
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
          <strong>${escapeHtml(p.title)}</strong><br>
          <small class="text-muted">${escapeHtml(p.abstract ? p.abstract.substring(0, 60) : '')}...</small>
        </td>
        <td>${escapeHtml(p.authorName || 'Unknown')}</td>
        <td><span class="badge ${statusClass}">${p.status}</span></td>
        <td>${new Date(p.createdAt).toLocaleDateString()}</td>
        <td>
          <a href="paper-detail.html?id=${p._id}" class="btn btn-sm btn-primary">View</a>
        </td>
      </tr>
    `;
  });

  html += `</tbody></table></div>`;
  container.innerHTML = html;
}

async function submitPaper() {
  const title = document.getElementById("title").value;
  const abstract = document.getElementById("abstract").value;
  const fileInput = document.getElementById("file");

  if (!title || !abstract) {
    window.Layout.showToast("Please provide title and abstract", "error");
    return;
  }

  const formData = new FormData();
  formData.append("title", title);
  formData.append("abstract", abstract);

  if (fileInput.files.length > 0) {
    formData.append("file", fileInput.files[0]);
  }

  try {
    const submitBtn = document.getElementById("submit-btn");
    submitBtn.disabled = true;
    submitBtn.innerText = "Submitting...";

    await apiCall("/papers", {
      method: "POST",
      body: formData
    });

    window.Layout.showToast("Paper submitted successfully", "success");

    // Clear form
    document.getElementById("title").value = "";
    document.getElementById("abstract").value = "";
    document.getElementById("file").value = "";

    // Reload
    loadPapers();
  } catch (error) {
    window.Layout.showToast(error.message, "error");
  } finally {
    const submitBtn = document.getElementById("submit-btn");
    submitBtn.disabled = false;
    submitBtn.innerText = "Submit Paper";
  }
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str).replace(/[&<>]/g, function (m) {
    if (m === "&") return "&amp;";
    if (m === "<") return "&lt;";
    if (m === ">") return "&gt;";
    return m;
  });
}

// Bulk exports (dummies for now unless API implements them)
window.deleteAllPapers = () => alert('Bulk Delete All not implemented in API');
window.deleteAcceptedPapers = () => alert('Bulk Delete Accepted not implemented');
window.deleteRejectedPapers = () => alert('Bulk Delete Rejected not implemented');
window.exportPapersCSV = () => alert('Export CSV not implemented in API');

window.loadPapers = loadPapers;
window.submitPaper = submitPaper;

document.addEventListener("DOMContentLoaded", loadPapers);
