const sidebar = document.getElementById("sidebar");
const hamburger = document.getElementById("hamburger");
const overlay = document.getElementById("overlay");

/* HAMBURGER FIX (REAL MOBILE SAFE) */
function toggleSidebar() {
  sidebar.classList.toggle("mobile-open");
  overlay.classList.toggle("show");
}

hamburger.addEventListener("click", toggleSidebar);
hamburger.addEventListener("touchstart", toggleSidebar);

overlay.addEventListener("click", toggleSidebar);
overlay.addEventListener("touchstart", toggleSidebar);

/* SUBMENU */
document.querySelectorAll(".menu-group").forEach(group => {
  const dropdown = group.querySelector(".dropdown");
  const submenu = group.querySelector(".submenu");
  const arrow = group.querySelector(".arrow");

  dropdown.addEventListener("click", () => {
    submenu.classList.toggle("open");
    arrow.textContent = submenu.classList.contains("open") ? "▼" : "▶";
  });
});
