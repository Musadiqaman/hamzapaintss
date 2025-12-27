// Submenu toggle
function toggleSidebar() {
    document.getElementById("sidebar").classList.toggle("mobile-open");
}
    document.querySelectorAll(".menu-group").forEach(group => {
      const dropdown = group.querySelector(".dropdown");
      const submenu = group.querySelector(".submenu");
      const arrow = group.querySelector(".arrow");

      dropdown.addEventListener("click", () => {
        document.querySelectorAll(".submenu").forEach(s => { if (s !== submenu) s.classList.remove("open"); });
        document.querySelectorAll(".arrow").forEach(a => { if (a !== arrow) a.textContent = '▶'; });
        submenu.classList.toggle("open");
        arrow.textContent = submenu.classList.contains("open") ? '▼' : '▶';
      });
    });


    