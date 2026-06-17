// ===============================
// Login Page JS - 2FA Only
// ===============================

document.addEventListener('DOMContentLoaded', () => {
  initPasswordToggle();
  initLoginForm2FA();
});


// ===== Password Toggle =====
function initPasswordToggle() {
  const togglePassword = document.getElementById("togglePassword");
  const passwordInput  = document.getElementById("password");
  if (!togglePassword || !passwordInput) return;

  togglePassword.addEventListener("click", () => {
    if (passwordInput.type === "password") {
      passwordInput.type      = "text";
      togglePassword.textContent = "🙈";
    } else {
      passwordInput.type      = "password";
      togglePassword.textContent = "👁️";
    }
  });
}


// ===== Login Form Submit (2FA Only) =====
function initLoginForm2FA() {
  const loginForm = document.getElementById("loginForm");
  const messageEl = document.getElementById("message");
  const loader    = document.getElementById("loader");
  const loginBtn  = document.getElementById("login");
  if (!loginForm || !messageEl) return;

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    messageEl.textContent = "";

    // Loader ON
    loader.style.display = "flex";
    loginBtn.disabled    = true;

    const username    = e.target.username.value.trim();
    const passwordVal = e.target.password.value.trim();

    if (!username || !passwordVal) {
      loader.style.display = "none";
      loginBtn.disabled    = false;
      showMessage("All fields are required!", "red");
      return;
    }

    try {
      const res  = await fetch("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password: passwordVal })
      });

      const data = await res.json();

      // Loader OFF
      loader.style.display = "none";
      loginBtn.disabled    = false;

      if (!data.success) {
        showMessage(data.message, "red");
        return;
      }

      showMessage("OTP sent! Redirecting to 2FA...", "#06A56C");
      setTimeout(() => { window.location.href = "/auth/2FA"; }, 1000);

    } catch (err) {
      console.error(err);
      loader.style.display = "none";
      loginBtn.disabled    = false;
      showMessage("Server error occurred. Try again!", "red");
    }
  });

  function showMessage(msg, color) {
    messageEl.style.color  = color;
    messageEl.textContent  = msg;
  }
}