async function login() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  try {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, roleGroup: "user" })
    });

    const json = await response.json();
    console.log("LOGIN RESPONSE:", json);

    if (!response.ok || !json.success) {
      alert(json.message || "Login failed");
      return;
    }

    const data = json.data;
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
    window.location.href = "pages/dashboard.html";
  } catch (error) {
    console.error("Login error:", error);
    alert("Server error. Please try again.");
  }
}

async function adminLogin() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const submitBtn = document.getElementById("login-btn-text");

  try {
    if (submitBtn) submitBtn.innerText = "Verifying admin...";
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, roleGroup: "admin" })
    });

    const json = await response.json();
    console.log("ADMIN LOGIN RESPONSE:", json);

    if (!response.ok || !json.success) {
      alert(json.message || "Login failed");
      if (submitBtn) submitBtn.innerText = "Sign in to Dashboard";
      return;
    }

    const data = json.data;
    if (data.user.role !== "admin" && data.user.role !== "chair") {
      alert("Access Denied: You are not authorized for the Admin Portal.");
      if (submitBtn) submitBtn.innerText = "Sign in to Dashboard";
      return;
    }

    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
    window.location.href = "pages/dashboard.html";
  } catch (error) {
    console.error("Admin Login error:", error);
    alert("Server error. Please try again.");
    if (submitBtn) submitBtn.innerText = "Sign in to Dashboard";
  }
}

async function register() {
  const name = document.getElementById("name").value;
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const role = document.getElementById("role").value;

  if (!name || !email || !password) {
    alert("Please fill all fields");
    return;
  }

  try {
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, role })
    });

    const json = await response.json();
    console.log("REGISTER RESPONSE:", json);

    if (!response.ok || !json.success) {
      alert(json.message || "Registration failed");
      return;
    }

    alert("Registration successful! Please login.");
    window.location.href = "login.html";
  } catch (error) {
    console.error("Register error:", error);
    alert("Server error. Please try again.");
  }
}

function togglePassword() {
  const pass = document.getElementById("password");
  const btn = event.target;
  if (pass.type === "password") {
    pass.type = "text";
    btn.textContent = "Hide";
  } else {
    pass.type = "password";
    btn.textContent = "Show";
  }
}
