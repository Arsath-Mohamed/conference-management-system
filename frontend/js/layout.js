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
  
  window.Layout = { showToast };
  window.logout = logout;
})();