const fs = require('fs');

// 1. PATCH papers.html
let pHTML = fs.readFileSync('frontend/pages/papers.html', 'utf8');
pHTML = pHTML.replace('<div class="page-container">', `<div class="page-container">
        <!-- Conference Info Card -->
        <div class="card" id="conference-info-card" style="display: none; margin-bottom: 24px;">
          <div class="card-header"><h3 class="card-title" id="info-name">Conference Name</h3></div>
          <div class="card-body">
            <p id="info-desc" style="margin-bottom: 16px; color: var(--text-secondary);"></p>
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px;">
              <div><strong>Event Date:</strong> <span id="info-date">TBD</span></div>
              <div><strong>Location:</strong> <span id="info-loc">TBD</span></div>
              <div><strong>Submission Deadline:</strong> <span id="info-deadline" style="color: var(--danger); font-weight: 600;">TBD</span></div>
            </div>
          </div>
        </div>`);
fs.writeFileSync('frontend/pages/papers.html', pHTML);

// 2. PATCH papers.js
let pJS = fs.readFileSync('frontend/js/papers.js', 'utf8');

const newLogic = `
    const settings = await apiCall("/settings");
    
    // Inject Info
    if (settings.isConferenceAnnounced && settings.name) {
      document.getElementById("conference-info-card").style.display = "block";
      document.getElementById("info-name").innerText = settings.name;
      document.getElementById("info-desc").innerText = settings.description || "";
      document.getElementById("info-date").innerText = settings.eventDate ? new Date(settings.eventDate).toLocaleDateString() : "TBD";
      document.getElementById("info-loc").innerText = settings.location || "TBD";
      document.getElementById("info-deadline").innerText = settings.submissionDeadline ? new Date(settings.submissionDeadline).toLocaleDateString() : "TBD";
    }

    // Check Deadline
    let isDeadlinePassed = false;
    if (settings.submissionDeadline) {
      isDeadlinePassed = new Date() > new Date(settings.submissionDeadline);
    }
    
    // Show sections based on role
    if (user.role === "author") {
      if (settings.isConferenceAnnounced && !isDeadlinePassed) {
        document.getElementById("submit-section").style.display = "block";
        document.getElementById("closed-message").style.display = "none";
      } else {
        document.getElementById("submit-section").style.display = "none";
        const closedMsg = document.getElementById("closed-message");
        if (closedMsg) {
          closedMsg.style.display = "block";
          if (isDeadlinePassed) {
             closedMsg.innerHTML = '<div class="card-body" style="color: #856404; padding: 16px;"><strong>Notice:</strong> The submission deadline (' + new Date(settings.submissionDeadline).toLocaleDateString() + ') has passed. You cannot submit new papers.</div>';
          }
        }
      }
    }
`;

pJS = pJS.replace(/const settings = await apiCall\("\/settings"\);[\s\S]*?if \(bulkActions\) bulkActions\.style\.display = "block";\n    \}/, newLogic + `\n\n    if (user.role === "admin" || user.role === "chair") {
      const bulkActions = document.getElementById("bulk-actions");
      if (bulkActions) bulkActions.style.display = "block";
    }`);

fs.writeFileSync('frontend/js/papers.js', pJS);

// 3. PATCH index.html
let iHTML = fs.readFileSync('frontend/index.html', 'utf8');
iHTML = iHTML.replace(/if \(settings\.isConferenceAnnounced\) \{[\s\S]*?\} else \{/, `if (settings.isConferenceAnnounced) {
          document.querySelector('h1').innerHTML = settings.name + '<br>with <span>elegance</span>.';
          let dateStr = settings.submissionDeadline ? new Date(settings.submissionDeadline).toLocaleDateString() : 'TBD';
          badge.innerHTML = '<span style="background: rgba(34, 197, 94, 0.1); color: #4ade80; border: 1px solid rgba(34, 197, 94, 0.2);" class="hero-badge">🟢 Submissions Open until ' + dateStr + '</span>';
        } else {`);
fs.writeFileSync('frontend/index.html', iHTML);

console.log("All patches applied.");
