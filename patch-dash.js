const fs = require('fs');

let c = fs.readFileSync('frontend/js/dashboard.js', 'utf8');

c = c.replace(/function updateSettingsUI\(\) \{[\s\S]*?async function toggleConferenceStatus\(\) \{[\s\S]*?btn\.disabled = false;\s*\n\s*\}/, `function updateSettingsUI() {
  const btn = document.getElementById("toggle-conference-btn");
  if (!btn || !currentSettings) return;
  
  // Populate form
  if (document.getElementById("conf-name")) {
    document.getElementById("conf-name").value = currentSettings.name || "";
    document.getElementById("conf-desc").value = currentSettings.description || "";
    document.getElementById("conf-location").value = currentSettings.location || "";
    
    if (currentSettings.submissionDeadline) {
      document.getElementById("conf-deadline").value = currentSettings.submissionDeadline.split('T')[0];
    }
    if (currentSettings.eventDate) {
      document.getElementById("conf-eventdate").value = currentSettings.eventDate.split('T')[0];
    }
  }

  if (currentSettings.isConferenceAnnounced) {
    btn.innerText = "Close Conference";
    btn.className = "btn btn-danger";
  } else {
    btn.innerText = "Save & Announce";
    btn.className = "btn btn-primary";
  }
}

async function saveConferenceSettings() {
  if (!currentSettings) return;
  
  const newState = !currentSettings.isConferenceAnnounced;
  const btn = document.getElementById("toggle-conference-btn");
  btn.disabled = true;
  btn.innerText = "Saving...";
  
  const payload = {
    isConferenceAnnounced: newState,
    name: document.getElementById("conf-name")?.value || "Annual Conference",
    description: document.getElementById("conf-desc")?.value || "",
    submissionDeadline: document.getElementById("conf-deadline")?.value ? new Date(document.getElementById("conf-deadline").value).toISOString() : null,
    eventDate: document.getElementById("conf-eventdate")?.value ? new Date(document.getElementById("conf-eventdate").value).toISOString() : null,
    location: document.getElementById("conf-location")?.value || ""
  };
  
  try {
    currentSettings = await apiCall("/settings", {
      method: "PUT",
      body: JSON.stringify(payload)
    });
    window.Layout.showToast(newState ? "Conference Announced successfully!" : "Conference Closed!", "success");
    updateSettingsUI();
  } catch (error) {
    console.error("Settings error:", error);
    window.Layout.showToast(error.message, "error");
    updateSettingsUI(); // reset UI
  } finally {
    btn.disabled = false;
  }
}`);

// Also fix the global export name at the bottom
c = c.replace('window.toggleConferenceStatus = toggleConferenceStatus;', 'window.saveConferenceSettings = saveConferenceSettings;');

fs.writeFileSync('frontend/js/dashboard.js', c);
console.log('dashboard.js updated');
