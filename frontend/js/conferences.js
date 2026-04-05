// ================= CONFERENCES PAGE =================
const token = localStorage.getItem("token");
const user = window.getUser();

if (!token) window.location.href = "../login.html";

let allConferences = [];
let editingId = null;

// ---- LOAD ----
async function loadConferences() {
  const container = document.getElementById("conferences-list");
  if (!container) return;
  container.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-muted);">Loading...</div>';
  try {
    const data = await apiCall("/conferences");
    allConferences = Array.isArray(data) ? data : [];
    renderConferences(allConferences);
  } catch (err) {
    container.innerHTML = `<div class="empty-state"><div class="empty-title">Failed to load conferences</div><div class="empty-description">${err.message}</div></div>`;
  }
}

function renderConferences(list) {
  const container = document.getElementById("conferences-list");
  if (!container) return;
  container.innerHTML = "";

  if (list.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🏛️</div>
        <div class="empty-title">No conferences yet</div>
        <div class="empty-description">Create your first conference above</div>
      </div>`;
    return;
  }

  const isEditor = user.role === "admin" || user.role === "chair";

  let html = `<div class="table-container"><table class="table">
    <thead><tr>
      <th>Conference</th><th>Topics</th><th>Status</th><th>Dates</th>
      ${isEditor ? "<th>Actions</th>" : ""}
    </tr></thead><tbody>`;

  list.forEach(c => {
    const statusColor = c.status === "open" ? "badge-accepted" : c.status === "closed" ? "badge-rejected" : "badge-pending";
    const start = c.startDate ? new Date(c.startDate).toLocaleDateString() : "TBD";
    const end = c.endDate ? new Date(c.endDate).toLocaleDateString() : "TBD";

    html += `<tr>
      <td>
        <div style="font-weight:600;color:var(--text-primary);">${escapeHtml(c.name)}</div>
        <div style="font-size:11px;color:var(--text-muted);margin-top:2px;">${escapeHtml(c.description || '')}</div>
      </td>
      <td><div style="display:flex;flex-wrap:wrap;gap:4px;">
        ${(c.topics || []).map(t => `<span class="topic-tag">${escapeHtml(t)}</span>`).join('')}
      </div></td>
      <td><span class="badge ${statusColor}">${(c.status || 'open').toUpperCase()}</span></td>
      <td>
        <div style="font-size:11px;">📅 ${start}</div>
        <div style="font-size:11px;">🏁 ${end}</div>
      </td>
      ${isEditor ? `
      <td>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button class="btn btn-sm btn-primary" onclick="openEdit('${c._id}')">Edit</button>
          <button class="btn btn-sm ${c.status === 'open' ? 'btn-warning' : 'btn-success'}" onclick="toggleStatus('${c._id}','${c.status}')">
            ${c.status === 'open' ? 'Close' : 'Re-Open'}
          </button>
          <button class="btn btn-sm btn-danger" onclick="deleteConference('${c._id}','${escapeHtml(c.name)}')">Delete</button>
        </div>
      </td>` : ""}
    </tr>`;
  });

  html += "</tbody></table></div>";
  container.innerHTML = html;
}

// ---- CREATE ----
async function createConference() {
  const name = document.getElementById("conf-name").value.trim();
  const description = document.getElementById("conf-desc").value.trim();
  const topicsStr = document.getElementById("conf-topics").value.trim();
  const startDate = document.getElementById("conf-start").value;
  const endDate = document.getElementById("conf-end").value;

  if (!name || !description || !startDate || !endDate) {
    window.Layout.showToast("All fields are required.", "error");
    return;
  }

  const topics = topicsStr ? topicsStr.split(',').map(t => t.trim()).filter(t => t) : [];

  try {
    const btn = document.getElementById("create-btn");
    if (btn) { btn.disabled = true; btn.innerText = "Creating..."; }

    await apiCall("/conferences", {
      method: "POST",
      body: JSON.stringify({ name, description, topics, startDate, endDate })
    });

    window.Layout.showToast("Conference created!", "success");
    clearCreateForm();
    loadConferences();
  } catch (err) {
    window.Layout.showToast(err.message, "error");
  } finally {
    const btn = document.getElementById("create-btn");
    if (btn) { btn.disabled = false; btn.innerText = "Create Conference"; }
  }
}

function clearCreateForm() {
  ["conf-name", "conf-desc", "conf-topics", "conf-start", "conf-end"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
}

// ---- EDIT ----
function openEdit(id) {
  const conf = allConferences.find(c => c._id === id);
  if (!conf) return;
  editingId = id;

  document.getElementById("edit-name").value = conf.name || "";
  document.getElementById("edit-desc").value = conf.description || "";
  document.getElementById("edit-topics").value = (conf.topics || []).join(", ");
  document.getElementById("edit-start").value = conf.startDate ? conf.startDate.split("T")[0] : "";
  document.getElementById("edit-end").value = conf.endDate ? conf.endDate.split("T")[0] : "";
  document.getElementById("edit-modal").style.display = "flex";
}

function closeEdit() {
  editingId = null;
  document.getElementById("edit-modal").style.display = "none";
}

async function saveEdit() {
  if (!editingId) return;

  const name = document.getElementById("edit-name").value.trim();
  const description = document.getElementById("edit-desc").value.trim();
  const topicsStr = document.getElementById("edit-topics").value.trim();
  const startDate = document.getElementById("edit-start").value;
  const endDate = document.getElementById("edit-end").value;

  if (!name || !description) {
    window.Layout.showToast("Name and description are required.", "error");
    return;
  }

  const topics = topicsStr ? topicsStr.split(',').map(t => t.trim()).filter(t => t) : [];

  try {
    const btn = document.getElementById("save-edit-btn");
    if (btn) { btn.disabled = true; btn.innerText = "Saving..."; }

    await apiCall(`/conferences/${editingId}`, {
      method: "PUT",
      body: JSON.stringify({ name, description, topics, startDate, endDate })
    });

    window.Layout.showToast("Conference updated!", "success");
    closeEdit();
    loadConferences();
  } catch (err) {
    window.Layout.showToast(err.message, "error");
  } finally {
    const btn = document.getElementById("save-edit-btn");
    if (btn) { btn.disabled = false; btn.innerText = "Save Changes"; }
  }
}

// ---- TOGGLE STATUS ----
async function toggleStatus(id, currentStatus) {
  const newStatus = currentStatus === "open" ? "closed" : "open";
  try {
    await apiCall(`/conferences/${id}`, {
      method: "PUT",
      body: JSON.stringify({ status: newStatus })
    });
    window.Layout.showToast(`Conference ${newStatus === "open" ? "re-opened" : "closed"}!`, "success");
    loadConferences();
  } catch (err) {
    window.Layout.showToast(err.message, "error");
  }
}

// ---- DELETE ----
async function deleteConference(id, name) {
  if (!confirm(`Delete conference "${name}"?\n\nNote: Conferences with linked papers cannot be deleted.`)) return;
  try {
    await apiCall(`/conferences/${id}`, { method: "DELETE" });
    window.Layout.showToast("Conference deleted.", "success");
    loadConferences();
  } catch (err) {
    window.Layout.showToast(err.message, "error");
  }
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));
}

window.createConference = createConference;
window.openEdit = openEdit;
window.closeEdit = closeEdit;
window.saveEdit = saveEdit;
window.deleteConference = deleteConference;
window.toggleStatus = toggleStatus;

document.addEventListener("DOMContentLoaded", loadConferences);
