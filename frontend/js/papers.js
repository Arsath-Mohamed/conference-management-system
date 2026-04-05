// ================= PAPERS PAGE =================
const token = localStorage.getItem("token");
const user = window.getUser();

if (!token) window.location.href = "../login.html";

let allPapers = [];
let allConferences = [];
let allReviewers = [];
let assigningPaperId = null;

// ---- LOAD CONFERENCES for submit form ----
async function loadConferences() {
  try {
    const data = await apiCall("/conferences");
    allConferences = Array.isArray(data) ? data : [];
    const select = document.getElementById("conferenceId");
    if (!select) return;
    select.innerHTML = '<option value="">-- Select Conference --</option>';
    allConferences.forEach(c => {
      const opt = document.createElement("option");
      opt.value = c._id;
      opt.innerText = c.name;
      select.appendChild(opt);
    });
  } catch (err) {
    console.error("Load conferences error:", err);
  }
}

// ---- LOAD REVIEWERS for assign modal ----
async function loadReviewers() {
  try {
    const data = await apiCall("/users/reviewers");
    allReviewers = Array.isArray(data) ? data : [];
  } catch (err) {
    console.error("Load reviewers error:", err);
  }
}

function updateConferenceTopics() {
  const confId = document.getElementById("conferenceId").value;
  const container = document.getElementById("topics-container");
  if (!container) return;
  container.innerHTML = "";
  const conf = allConferences.find(c => c._id === confId);
  if (conf && conf.topics) {
    conf.topics.forEach(topic => {
      const label = document.createElement("label");
      label.style.cssText = "display:flex;align-items:center;gap:4px;background:#1e293b;padding:4px 8px;border-radius:4px;font-size:12px;cursor:pointer;color:var(--text-primary);";
      label.innerHTML = `<input type="checkbox" name="topics" value="${topic}"> ${topic}`;
      container.appendChild(label);
    });
  }
}

// ---- INIT ----
async function initPapers() {
  const isEditor = user.role === "admin" || user.role === "chair";

  if (user.role === "author") {
    const section = document.getElementById("submit-section");
    if (section) section.style.display = "block";
  }

  if (isEditor) {
    const bulk = document.getElementById("bulk-actions");
    if (bulk) bulk.style.display = "block";
  }

  await loadConferences();
  if (isEditor) await loadReviewers();

  try {
    const data = await apiCall("/papers");
    allPapers = Array.isArray(data) ? data : [];
    displayPapers(allPapers);
  } catch (error) {
    console.error("Load papers error:", error);
  }
}

// ---- FILTER ----
function filterPapers() {
  const search = document.getElementById("paper-search")?.value.toLowerCase() || "";
  const status = document.getElementById("status-filter")?.value || "all";

  const filtered = allPapers.filter(p => {
    const matchSearch = p.title.toLowerCase().includes(search) ||
      (p.authorName || "").toLowerCase().includes(search);
    const matchStatus = status === "all" || p.status === status;
    return matchSearch && matchStatus;
  });

  displayPapers(filtered);
}

// ---- DISPLAY ----
function displayPapers(papers) {
  const container = document.getElementById("papers-list");
  if (!container) return;
  container.innerHTML = "";

  const isEditor = user.role === "admin" || user.role === "chair";

  if (papers.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📭</div>
        <div class="empty-title">No papers found</div>
        <div class="empty-description">No papers match your current filters</div>
      </div>`;
    return;
  }

  let html = `<div class="table-container"><table class="table">
    <thead><tr>
      <th>Title & Abstract</th>
      <th>Conference</th>
      <th>Author</th>
      <th>Status</th>
      <th>Date</th>
      <th>Actions</th>
    </tr></thead><tbody>`;

  papers.forEach(p => {
    const statusClass =
      p.status === "accepted" ? "badge-accepted" :
      p.status === "rejected" ? "badge-rejected" :
      p.status === "revision" ? "badge-revision" :
      p.status === "under_review" ? "badge-warning" : "badge-pending";

    html += `<tr>
      <td>
        <div style="font-weight:600;color:var(--text-primary);margin-bottom:2px;">${escapeHtml(p.title)}</div>
        <div style="font-size:11px;color:var(--text-muted);">${escapeHtml((p.abstract || '').substring(0, 80))}...</div>
        <div style="margin-top:4px;display:flex;flex-wrap:wrap;gap:4px;">
          ${(p.topics || []).map(t => `<span class="topic-tag">${escapeHtml(t)}</span>`).join('')}
        </div>
      </td>
      <td style="font-size:13px;">${escapeHtml(p.conferenceId?.name || 'N/A')}</td>
      <td style="font-size:13px;">${escapeHtml(p.authorName || 'Anonymous')}</td>
      <td><span class="badge ${statusClass}">${(p.status || 'pending').replace('_', ' ').toUpperCase()}</span></td>
      <td style="font-size:12px;">${p.createdAt ? new Date(p.createdAt).toLocaleDateString() : 'N/A'}</td>
      <td>
        <div style="display:flex;gap:6px;flex-wrap:wrap;">
          <a href="paper-detail.html?id=${p._id}" class="btn btn-sm btn-primary">View</a>
          ${p.file ? `<button onclick="Layout.openPdfPreview('${UPLOAD_BASE_URL}/${p.file}','${escapeHtml(p.title)}')" class="btn btn-sm btn-secondary">📄 PDF</button>` : ''}
          ${isEditor ? `
            <button class="btn btn-sm btn-warning" onclick="openAssign('${p._id}','${escapeHtml(p.title)}')">👤 Assign</button>
            <button class="btn btn-sm btn-success" onclick="openDecision('${p._id}','${escapeHtml(p.title)}')">⚖️ Decide</button>
            <button class="btn btn-sm btn-danger" onclick="deletePaper('${p._id}')">🗑️</button>
          ` : ''}
        </div>
      </td>
    </tr>`;
  });

  html += "</tbody></table></div>";
  container.innerHTML = html;
}

// ---- ASSIGN REVIEWER MODAL ----
function openAssign(paperId, paperTitle) {
  assigningPaperId = paperId;
  document.getElementById("assign-paper-title").innerText = paperTitle;

  const select = document.getElementById("reviewer-select");
  select.innerHTML = '<option value="">-- Select Reviewer --</option>';
  allReviewers.forEach(r => {
    const opt = document.createElement("option");
    opt.value = r._id;
    opt.innerText = `${r.name} (${r.email})`;
    select.appendChild(opt);
  });

  document.getElementById("assign-modal").style.display = "flex";
}

function closeAssign() {
  assigningPaperId = null;
  document.getElementById("assign-modal").style.display = "none";
}

async function confirmAssign() {
  const reviewerId = document.getElementById("reviewer-select").value;
  if (!reviewerId) {
    window.Layout.showToast("Please select a reviewer.", "error");
    return;
  }

  try {
    const btn = document.getElementById("confirm-assign-btn");
    btn.disabled = true; btn.innerText = "Assigning...";

    await apiCall(`/papers/${assigningPaperId}/assign`, {
      method: "PUT",
      body: JSON.stringify({ reviewerId })
    });

    window.Layout.showToast("Reviewer assigned successfully!", "success");
    closeAssign();
    initPapers();
  } catch (err) {
    window.Layout.showToast(err.message, "error");
  } finally {
    const btn = document.getElementById("confirm-assign-btn");
    if (btn) { btn.disabled = false; btn.innerText = "Assign Reviewer"; }
  }
}

// ---- DECISION MODAL ----
let decidingPaperId = null;

function openDecision(paperId, paperTitle) {
  decidingPaperId = paperId;
  document.getElementById("decision-paper-title").innerText = paperTitle;
  document.getElementById("decision-modal").style.display = "flex";
}

function closeDecision() {
  decidingPaperId = null;
  document.getElementById("decision-modal").style.display = "none";
}

async function confirmDecision(decision) {
  if (!decidingPaperId) return;
  try {
    const btn = document.getElementById(`btn-${decision}`);
    if (btn) { btn.disabled = true; }

    await apiCall(`/papers/${decidingPaperId}/decision`, {
      method: "PUT",
      body: JSON.stringify({ decision })
    });

    window.Layout.showToast(`Decision recorded: ${decision.toUpperCase()}`, "success");
    closeDecision();
    initPapers();
  } catch (err) {
    window.Layout.showToast(err.message, "error");
    const btn = document.getElementById(`btn-${decision}`);
    if (btn) btn.disabled = false;
  }
}

// ---- SUBMIT PAPER ----
async function submitPaper() {
  const title = document.getElementById("title").value.trim();
  const abstract = document.getElementById("abstract").value.trim();
  const conferenceId = document.getElementById("conferenceId").value;
  const fileInput = document.getElementById("file");
  const selectedTopics = Array.from(document.querySelectorAll('input[name="topics"]:checked')).map(cb => cb.value);

  if (!title || abstract.length < 50 || !conferenceId) {
    window.Layout.showToast("Title, conference, and a detailed abstract (50+ chars) are required.", "error");
    return;
  }

  const formData = new FormData();
  formData.append("title", title);
  formData.append("abstract", abstract);
  formData.append("conferenceId", conferenceId);
  formData.append("topics", selectedTopics.join(','));
  if (fileInput.files[0]) formData.append("file", fileInput.files[0]);

  try {
    const btn = document.getElementById("submit-btn");
    btn.disabled = true; btn.innerText = "Submitting...";
    await apiCall("/papers", { method: "POST", body: formData });
    window.Layout.showToast("Paper submitted successfully!", "success");
    location.reload();
  } catch (err) {
    window.Layout.showToast(err.message, "error");
    const btn = document.getElementById("submit-btn");
    btn.disabled = false; btn.innerText = "Submit Paper";
  }
}

// ---- DELETE ----
async function deletePaper(id) {
  if (!confirm("Permanently delete this paper and all its reviews?")) return;
  try {
    await apiCall(`/papers/${id}`, { method: "DELETE" });
    window.Layout.showToast("Paper deleted.", "success");
    initPapers();
  } catch (err) {
    window.Layout.showToast(err.message, "error");
  }
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));
}

window.filterPapers = filterPapers;
window.submitPaper = submitPaper;
window.deletePaper = deletePaper;
window.openAssign = openAssign;
window.closeAssign = closeAssign;
window.confirmAssign = confirmAssign;
window.openDecision = openDecision;
window.closeDecision = closeDecision;
window.confirmDecision = confirmDecision;
window.updateConferenceTopics = updateConferenceTopics;

document.addEventListener("DOMContentLoaded", initPapers);
