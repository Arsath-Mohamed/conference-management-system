// ================= LAYOUT MANAGER (FIXED) =================

(function() {
  // Theme Management
  function initTheme() {
    const savedTheme = localStorage.getItem("theme") || "dark";
    document.documentElement.setAttribute("data-theme", savedTheme);
    updateThemeIcons(savedTheme);
  }

  function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute("data-theme");
    const newTheme = currentTheme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", newTheme);
    localStorage.setItem("theme", newTheme);
    updateThemeIcons(newTheme);
  }

  function updateThemeIcons(theme) {
    const sunIcon = document.getElementById("theme-icon-sun");
    const moonIcon = document.getElementById("theme-icon-moon");
    if (!sunIcon || !moonIcon) return;

    if (theme === "light") {
      sunIcon.style.display = "none";
      moonIcon.style.display = "block";
    } else {
      sunIcon.style.display = "block";
      moonIcon.style.display = "none";
    }
  }

  // Component Injection (if containers exist)
  async function loadComponents() {
    const headerContainer = document.getElementById("header-container");
    const sidebarContainer = document.getElementById("sidebar-container");

    if (headerContainer) {
      const resp = await fetch("../layout/header.html");
      headerContainer.innerHTML = await resp.text();
    }

    if (sidebarContainer) {
      const resp = await fetch("../layout/sidebar.html");
      sidebarContainer.innerHTML = await resp.text();
    }

    // Re-initialize UI details after injection
    loadUserInfo();
    setupNavigation();
    initTheme();
    
    // Add theme toggle listener
    const themeBtn = document.getElementById("theme-toggle");
    if (themeBtn) {
      themeBtn.addEventListener("click", toggleTheme);
    }
    
    // Notification Init
    const bell = document.getElementById("notification-trigger");
    const dropdown = document.getElementById("notification-dropdown");
    if (bell && dropdown) {
      bell.addEventListener("click", (e) => {
        e.stopPropagation();
        dropdown.classList.toggle("active");
      });
      document.addEventListener("click", () => dropdown.classList.remove("active"));
    }
    
    fetchNotifications();
    setInterval(fetchNotifications, 60000); // Check every minute
  }

  function loadUserInfo() {
    const user = JSON.parse(localStorage.getItem("user"));
    if (user) {
      document.querySelectorAll(".user-name").forEach(el => {
        el.innerText = user.name || "User";
      });
      document.querySelectorAll(".user-role").forEach(el => {
        el.innerText = formatRole(user.role);
      });
      const initial = user.name ? user.name.charAt(0).toUpperCase() : "U";
      document.querySelectorAll(".user-initial").forEach(el => {
        el.innerText = initial;
      });
    }
  }
  
  function formatRole(role) {
    const roles = {
      author: "Author",
      reviewer: "Reviewer",
      chair: "Conference Chair",
      admin: "Administrator"
    };
    return roles[role] || role;
  }
  
  function setupNavigation() {
    const currentPage = window.location.pathname.split("/").pop().replace(".html", "");
    document.querySelectorAll(".nav-item").forEach(item => {
      const href = item.getAttribute("href");
      if (href && href.includes(currentPage)) {
        item.classList.add("active");
      } else {
        item.classList.remove("active");
      }
    });
    
    const user = JSON.parse(localStorage.getItem("user"));
    const role = user?.role;
    
    // Role-based visibility
    const usersNav = document.querySelector('a[href="users.html"]');
    if (usersNav) {
      usersNav.style.display = role === "admin" ? "flex" : "none";
    }
    
    const reviewsNav = document.querySelector('a[href="reviews.html"]');
    if (reviewsNav) {
      reviewsNav.style.display = role === "reviewer" ? "flex" : "none";
    }
  }
  
  function showToast(message, type = "success") {
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.innerText = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }

  function openPdfPreview(url, title = "Document Preview") {
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.id = "pdf-preview-modal";
    
    overlay.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h4 style="margin:0;">${title}</h4>
          <button class="btn btn-outline btn-sm" onclick="Layout.closePdfPreview()">✕ Close</button>
        </div>
        <div class="modal-body">
          <iframe src="${url}" width="100%" height="100%" style="border:none;"></iframe>
        </div>
      </div>
    `;
    
    document.body.appendChild(overlay);
    document.body.style.overflow = "hidden";
    
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closePdfPreview();
    });
  }

  function closePdfPreview() {
    const modal = document.getElementById("pdf-preview-modal");
    if (modal) modal.remove();
    document.body.style.overflow = "auto";
  }

  async function fetchNotifications() {
    try {
      const notes = await apiCall("/notifications");
      const badge = document.getElementById("notification-badge");
      const list = document.getElementById("notification-list");
      
      const unreadCount = notes.filter(n => !n.read).length;
      if (unreadCount > 0) {
        badge.style.display = "flex";
        badge.innerText = unreadCount;
      } else {
        badge.style.display = "none";
      }

      if (!list) return;
      if (notes.length === 0) {
        list.innerHTML = `<div style="padding: 20px; text-align: center; color: var(--text-muted); font-size: 12px;">No notifications yet</div>`;
        return;
      }

      list.innerHTML = notes.map(n => `
        <div class="notification-item ${n.read ? '' : 'unread'}" onclick="Layout.markAsRead('${n._id}', '${n.link}')">
          <div style="margin-bottom: 4px;">${escapeHtml(n.message)}</div>
          <div style="font-size: 10px; color: var(--text-muted);">${new Date(n.createdAt).toLocaleString()}</div>
        </div>
      `).join('');
    } catch (err) { console.error("Notes fetch error:", err); }
  }

  async function markAsRead(id, link) {
    try {
      await apiCall(`/notifications/${id}/read`, { method: 'PUT' });
      if (link) {
        const isInsidePages = window.location.pathname.includes("/pages/");
        // If the link starts with /pages/ and we are ALREADY in /pages/, strip it
        const finalLink = (isInsidePages && link.startsWith("/pages/")) 
          ? link.replace("/pages/", "") 
          : link;
        window.location.href = finalLink;
      } else {
        fetchNotifications();
      }
    } catch (err) {}
  }

  async function clearNotifications(e) {
    e.stopPropagation();
    if (!confirm("Clear all alerts?")) return;
    try {
      await apiCall("/notifications", { method: 'DELETE' });
      fetchNotifications();
    } catch (err) {}
  }
  
  function escapeHtml(str) {
    if (!str) return "";
    return String(str).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));
  }
  
  // Start the layout process
  document.addEventListener("DOMContentLoaded", () => {
    // If we have containers, load them; otherwise just init theme/info
    if (document.getElementById("header-container") || document.getElementById("sidebar-container")) {
      loadComponents();
    } else {
      loadUserInfo();
      setupNavigation();
      initTheme();
      const themeBtn = document.getElementById("theme-toggle");
      if (themeBtn) {
        themeBtn.addEventListener("click", toggleTheme);
      }
    }
  });
  
  function logout() {
    localStorage.clear();
    const isInsidePages = window.location.pathname.includes("/pages/");
    window.location.href = isInsidePages ? "../login.html" : "login.html";
  }
  
  window.Layout = { showToast, openPdfPreview, closePdfPreview, fetchNotifications, markAsRead, clearNotifications };
  window.logout = logout;
})();