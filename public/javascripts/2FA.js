// ===============================
// 2FA Page JS - Modular Version
// ===============================

document.addEventListener('DOMContentLoaded', () => {
  initOTPInputs();      // Auto-focus, backspace & paste handling
  initOTPForm();        // OTP form submit with loader
  initLogoutButton();   // Logout functionality
});


// ===== OTP Inputs Auto-Focus =====
function initOTPInputs() {
  const otpInputs = document.querySelectorAll('.otp-container input');

  otpInputs.forEach((input, idx) => {

    // Sirf numbers allow karo + next field pe focus
    input.addEventListener('input', (e) => {
      e.target.value = e.target.value.replace(/[^0-9]/g, '');
      if (e.target.value.length === 1 && idx < otpInputs.length - 1) {
        otpInputs[idx + 1].focus();
      }
    });

    // Backspace pe prev field pe wapis jao
    input.addEventListener('keydown', (e) => {
      if (e.key === "Backspace" && !e.target.value && idx > 0) {
        otpInputs[idx - 1].focus();
      }
    });

    // Mobile SMS paste support — sara OTP ek baar mein
    input.addEventListener('paste', (e) => {
      e.preventDefault();
      const pasted = (e.clipboardData || window.clipboardData)
        .getData('text')
        .replace(/[^0-9]/g, '')
        .slice(0, 6);

      pasted.split('').forEach((char, i) => {
        if (otpInputs[i]) otpInputs[i].value = char;
      });

      const nextEmpty = [...otpInputs].findIndex(inp => !inp.value);
      if (nextEmpty !== -1) otpInputs[nextEmpty].focus();
      else otpInputs[otpInputs.length - 1].focus();
    });

  });
}


// ===== OTP Form Submit =====
function initOTPForm() {
  const loginForm = document.getElementById('loginForm');
  const otpInputs = document.querySelectorAll('.otp-container input');
  const messageEl = document.getElementById('message');
  const loader    = document.getElementById('loader');
  const submitBtn = document.getElementById('login');

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    messageEl.textContent = "";

    let otp = '';
    otpInputs.forEach(input => otp += input.value.trim());

    if (otp.length < otpInputs.length) {
      showMessage("Please enter complete OTP!", "red");
      return;
    }

    // Loader ON
    loader.style.display = "flex";
    submitBtn.disabled   = true;

    try {
      const res  = await fetch('/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otp })
      });
      const data = await res.json();

      // Loader OFF
      loader.style.display = "none";
      submitBtn.disabled   = false;

      if (!data.success) {
        showMessage(data.message, "red");
        otpInputs.forEach(input => input.value = "");
        otpInputs[0].focus();
        return;
      }

      showMessage("OTP Verified! Redirecting...", "#06A56C");
      otpInputs.forEach(input => input.value = "");
      setTimeout(() => { window.location.href = "/home"; }, 1000);

    } catch (err) {
      console.error(err);
      loader.style.display = "none";
      submitBtn.disabled   = false;
      showMessage("Server error. Try again!", "red");
    }
  });

  function showMessage(msg, color) {
    messageEl.style.color  = color;
    messageEl.textContent  = msg;
  }
}


// ===== Logout Button =====
function initLogoutButton() {
  const logoutBtn = document.getElementById('logout');
  if (!logoutBtn) return;

  logoutBtn.addEventListener('click', async () => {
    try {
      const res  = await fetch('/auth/logout-2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (data.success) window.location.href = '/auth/login';
    } catch (err) {
      console.error(err);
    }
  });
}