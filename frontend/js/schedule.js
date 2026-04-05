// ================= SCHEDULE PAGE =================
// config.js and layout.js must be loaded before this file

const token = localStorage.getItem("token");
const user = JSON.parse(localStorage.getItem("user"));

if (!token) {
  window.location.href = "../login.html";
}

async function loadSchedule() {
  try {
    const data = await apiCall("/schedule");
    if (!data) return;
    displaySchedule(data);
  } catch (error) {
    console.error("Load schedule error:", error);
    window.Layout.showToast("Failed to load schedule", "error");
  }
}

function displaySchedule(scheduledPapers) {
  const container = document.getElementById("schedule-list");
  if (!container) return;
  container.innerHTML = ""; // Clear existing
  
  if (scheduledPapers.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📅</div>
        <div class="empty-title">No scheduled presentations</div>
        <div class="empty-description">Scheduled presentations will appear here</div>
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
            <th>Date</th>
            <th>Time</th>
            <th>Room</th>
          </tr>
        </thead>
        <tbody>
  `;
  
  scheduledPapers.forEach(paper => {
    html += `
      <tr>
        <td><strong>${escapeHtml(paper.paperTitle)}</strong></td>
        <td>${escapeHtml(paper.authorName)}</td>
        <td>${paper.date || "TBD"}</td>
        <td>${paper.time || "TBD"}</td>
        <td>${paper.room || "TBD"}</td>
      </tr>
    `;
  });
  
  html += `
        </tbody>
      </table>
    </div>
  `;
  
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

// Make function global
window.loadSchedule = loadSchedule;

document.addEventListener("DOMContentLoaded", loadSchedule);