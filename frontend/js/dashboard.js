// ================= DASHBOARD PAGE =================
const token = localStorage.getItem("token");
if (!token) window.location.href = "../login.html";

async function loadDashboard() {
  try {
    const user = window.getUser();

    // ---- STATS ----
    const data = await apiCall("/dashboard");
    const stats = (data && !Array.isArray(data)) ? data : { totalPapers: 0, accepted: 0, pending: 0, users: 0 };

    document.getElementById("total-papers").innerText = stats.totalPapers || 0;
    document.getElementById("accepted-papers").innerText = stats.accepted || 0;
    document.getElementById("pending-papers").innerText = stats.pending || 0;

    if (user.role === "admin" || user.role === "chair") {
      document.getElementById("total-users").innerText = stats.users || 0;
    } else {
      const usersCard = document.querySelector(".stat-card:last-child");
      if (usersCard) usersCard.style.display = "none";
    }

    // ---- ACTIVE CONFERENCES ----
    const rawConfs = await apiCall("/conferences");
    const conferences = Array.isArray(rawConfs) ? rawConfs : [];
    displayActiveConferences(conferences);

    // ---- RECENT PAPERS (last 5) ----
    const rawPapers = await apiCall("/papers");
    const papers = Array.isArray(rawPapers) ? rawPapers : [];
    displayRecentPapers(papers.slice(0, 5));

  } catch (error) {
    console.error("Dashboard load error:", error);
  }
}

function displayActiveConferences(conferences) {
  const container = document.getElementById("active-conferences");
  if (!container) return;
  container.innerHTML = "";

  const open = conferences.filter(c => c.status !== "finished");

  if (open.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🏛️</div>
        <div class="empty-title">No active conferences</div>
        <div class="empty-description">Go to the Conferences page to create one</div>
      </div>`;
    return;
  }

  let html = '<div class="conf-grid">';
  open.forEach(conf => {
    const start = conf.startDate ? new Date(conf.startDate).toLocaleDateString() : "TBD";
    const end = conf.endDate ? new Date(conf.endDate).toLocaleDateString() : "TBD";
    const topics = (conf.topics || []).slice(0, 3).join(", ") || "General";
    const statusColor = conf.status === "open" ? "#10b981" : "#f59e0b";
    const statusLabel = conf.status === "open" ? "Open" : conf.status === "closed" ? "Closed" : (conf.status || "Open");

    html += `
      <div class="conf-card">
        <div class="conf-card-header">
          <h3 class="conf-card-title">${escapeHtml(conf.name)}</h3>
          <span style="font-size:11px;font-weight:600;color:${statusColor};background:${statusColor}18;border:1px solid ${statusColor}33;padding:3px 8px;border-radius:99px;">${statusLabel}</span>
        </div>
        <p class="conf-card-desc">${escapeHtml(conf.description || "")}</p>
        <div class="conf-card-meta">
          <span>📅 ${start} – ${end}</span>
          <span>🏷️ ${escapeHtml(topics)}</span>
        </div>
      </div>`;
  });
  html += '</div>';
  container.innerHTML = html;
}

function displayRecentPapers(papers) {
  const container = document.getElementById("recent-activity");
  if (!container) return;
  container.innerHTML = "";

  if (papers.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📭</div>
        <div class="empty-title">No papers yet</div>
        <div class="empty-description">Submit your first paper to get started</div>
      </div>`;
    return;
  }

  let html = '<div class="table-container"><table class="table"><thead><tr><th>Title</th><th>Status</th><th>Date</th></tr></thead><tbody>';

  papers.forEach(paper => {
    const statusClass =
      paper.status === "accepted" ? "badge-accepted" :
      paper.status === "rejected" ? "badge-rejected" :
      paper.status === "revision" ? "badge-revision" :
      paper.status === "under_review" ? "badge-warning" : "badge-pending";

    html += `
      <tr>
        <td>
          <a href="paper-detail.html?id=${paper._id}" style="font-weight:600;color:var(--primary);text-decoration:none;">${escapeHtml(paper.title)}</a>
          <div style="font-size:11px;color:var(--text-muted);">${escapeHtml((paper.abstract || '').substring(0, 60))}...</div>
        </td>
        <td><span class="badge ${statusClass}">${(paper.status || 'pending').replace('_', ' ').toUpperCase()}</span></td>
        <td style="font-size:12px;">${paper.createdAt ? new Date(paper.createdAt).toLocaleDateString() : 'N/A'}</td>
      </tr>`;
  });

  html += '</tbody></table></div>';
  container.innerHTML = html;
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));
}

window.loadDashboard = loadDashboard;
document.addEventListener("DOMContentLoaded", loadDashboard);