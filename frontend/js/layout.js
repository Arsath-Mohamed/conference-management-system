// ================= LAYOUT MANAGER (FIXED) =================

(function() {
  function loadUserInfo() {
    const user = JSON.parse(localStorage.getItem("user"));
    console.log("Loading user info:", user);
    
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
    } else {
      console.warn("No user found in localStorage");
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
    
    // Hide Users tab for non‑admin
    const usersNav = document.querySelector('a[href="users.html"]');
    if (usersNav) {
      usersNav.style.display = role === "admin" ? "flex" : "none";
    }
    
    // 🟢 NEW: Hide Reviews tab for non‑reviewer
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
  
  document.addEventListener("DOMContentLoaded", () => {
    loadUserInfo();
    setupNavigation();
  });
  
  window.Layout = { showToast };
})();