const token = localStorage.getItem("token");
const user = JSON.parse(localStorage.getItem("user") || "{}");

if (!token || (user.role !== "admin" && user.role !== "chair")) {
  window.location.href = "../login.html";
}

async function loadConferences() {
  const container = document.getElementById("conferences-list");
  try {
    const conferences = await apiCall("/conferences");
    if (conferences.length === 0) {
      container.innerHTML = `<div class="empty-state">No conferences created yet.</div>`;
      return;
    }

    let html = `
      <div class="table-container">
        <table class="table">
          <thead>
            <tr>
              <th>Conference Name</th>
              <th>Topics</th>
              <th>Status</th>
              <th>Dates</th>
            </tr>
          </thead>
          <tbody>
    `;

    conferences.forEach(c => {
      html += `
        <tr>
          <td>
            <div style="font-weight: 600; color: var(--text-primary);">${escapeHtml(c.name)}</div>
            <div style="font-size: 11px; color: var(--text-muted);">${escapeHtml(c.description || '')}</div>
          </td>
          <td>
            <div style="display: flex; flex-wrap: wrap; gap: 4px;">
              ${(c.topics || []).map(t => `<span style="font-size: 9px; padding: 2px 4px; background: #e2e8f0; border-radius: 4px;">${escapeHtml(t)}</span>`).join('')}
            </div>
          </td>
          <td><span class="badge ${c.status === 'open' ? 'badge-accepted' : 'badge-pending'}">${c.status.toUpperCase()}</span></td>
          <td>
            <div style="font-size: 11px;">Starts: ${new Date(c.startDate).toLocaleDateString()}</div>
            <div style="font-size: 11px;">Ends: ${new Date(c.endDate).toLocaleDateString()}</div>
          </td>
        </tr>
      `;
    });

    html += `</tbody></table></div>`;
    container.innerHTML = html;
  } catch (err) {
    container.innerHTML = `<div class="error-state">Failed to load conferences: ${err.message}</div>`;
  }
}

async function createConference() {
  const name = document.getElementById("conf-name").value;
  const description = document.getElementById("conf-desc").value;
  const topicsStr = document.getElementById("conf-topics").value;
  const startDate = document.getElementById("conf-start").value;
  const endDate = document.getElementById("conf-end").value;

  if (!name || !description || !startDate || !endDate) {
    window.Layout.showToast("All fields are required.", "error");
    return;
  }

  const topics = topicsStr.split(',').map(t => t.trim()).filter(t => t);

  try {
    await apiCall("/conferences", {
      method: "POST",
      body: JSON.stringify({ name, description, topics, startDate, endDate })
    });
    window.Layout.showToast("Conference created!", "success");
    loadConferences();
    // Clear form
    document.getElementById("conf-name").value = "";
    document.getElementById("conf-desc").value = "";
    document.getElementById("conf-topics").value = "";
    document.getElementById("conf-start").value = "";
    document.getElementById("conf-end").value = "";
  } catch (err) {
    window.Layout.showToast(err.message, "error");
  }
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));
}

document.addEventListener("DOMContentLoaded", loadConferences);
window.createConference = createConference;
