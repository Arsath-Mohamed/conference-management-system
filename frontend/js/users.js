// ================= USERS PAGE =================
// config.js and layout.js must be loaded before this file

const token = localStorage.getItem("token");
const user = JSON.parse(localStorage.getItem("user"));

if (!token) {
  window.location.href = "../login.html";
}

// Admin only page
if (user.role !== "admin") {
  window.location.href = "dashboard.html";
}

async function loadUsers() {
  try {
    const users = await apiCall("/users");
    displayUsers(users);
  } catch (error) {
    console.error("Load users error:", error);
    window.Layout.showToast("Failed to load users", "error");
    document.getElementById("users-list").innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">⚠️</div>
        <div class="empty-title">Error loading users</div>
        <div class="empty-description">${error.message}</div>
      </div>
    `;
  }
}

function displayUsers(users) {
  const container = document.getElementById("users-list");
  if (!container) return;
  
  if (users.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">👥</div>
        <div class="empty-title">No users found</div>
        <div class="empty-description">Users will appear here after registration</div>
      </div>
    `;
    return;
  }
  
  let html = `
    <div class="table-container">
      <table class="table">
        <thead>
          <tr><th>Name</th><th>Email</th><th>Role</th><th>Actions</th></tr>
        </thead>
        <tbody>
  `;
  
  users.forEach(u => {
    const roleClass = u.role === "admin" ? "badge-success" : 
                      u.role === "chair" ? "badge-warning" : 
                      u.role === "reviewer" ? "badge-info" : "badge-pending";
    
    html += `
      <tr>
        <td><strong>${escapeHtml(u.name)}</strong></td>
        <td>${escapeHtml(u.email)}</td>
        <td><span class="badge ${roleClass}">${u.role}</span></td>
        <td>
          <div style="display: flex; gap: 8px;">
            <select class="form-select form-select-sm" onchange="window.changeRole('${u._id}', this.value)" style="width: 120px;">
              <option value="author" ${u.role === "author" ? "selected" : ""}>Author</option>
              <option value="reviewer" ${u.role === "reviewer" ? "selected" : ""}>Reviewer</option>
              <option value="chair" ${u.role === "chair" ? "selected" : ""}>Chair</option>
              <option value="admin" ${u.role === "admin" ? "selected" : ""}>Admin</option>
            </select>
            <button class="btn btn-danger btn-sm" onclick="window.deleteUser('${u._id}')" ${u._id === user.id ? 'disabled' : ''}>Delete</button>
          </div>
        </td>
      </tr>
    `;
  });
  
  html += `</tbody></table></div>`;
  container.innerHTML = html;
}

async function changeRole(userId, newRole) {
  try {
    await apiCall(`/users/${userId}/role`, {
      method: "PUT",
      body: JSON.stringify({ role: newRole })
    });
    
    window.Layout.showToast("Role updated successfully", "success");
    loadUsers();
  } catch (error) {
    window.Layout.showToast(error.message, "error");
  }
}

async function deleteUser(userId) {
  if (!confirm("Delete this user? This will also delete their papers.")) return;
  
  try {
    await apiCall(`/users/${userId}`, {
      method: "DELETE"
    });
    
    window.Layout.showToast("User deleted successfully", "success");
    loadUsers();
  } catch (error) {
    window.Layout.showToast(error.message, "error");
  }
}

function showAddUserModal() {
  document.getElementById("add-user-modal").style.display = "flex";
}

function closeAddUserModal() {
  document.getElementById("add-user-modal").style.display = "none";
}

async function addUser() {
  const name = document.getElementById("new-user-name").value;
  const email = document.getElementById("new-user-email").value;
  const password = document.getElementById("new-user-password").value;
  const role = document.getElementById("new-user-role").value;
  
  if (!name || !email || !password) {
    window.Layout.showToast("Please fill all fields", "error");
    return;
  }
  
  try {
    await apiCall("/users", {
      method: "POST",
      body: JSON.stringify({ name, email, password, role })
    });
    
    window.Layout.showToast("User created successfully", "success");
    closeAddUserModal();
    loadUsers(); // refresh list
  } catch (error) {
    window.Layout.showToast(error.message, "error");
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
window.loadUsers = loadUsers;
window.changeRole = changeRole;
window.deleteUser = deleteUser;
window.showAddUserModal = showAddUserModal;
window.closeAddUserModal = closeAddUserModal;
window.addUser = addUser;

document.addEventListener("DOMContentLoaded", loadUsers);