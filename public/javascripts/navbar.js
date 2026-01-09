const sidebar = document.getElementById("sidebar");
const hamburger = document.getElementById("hamburger");
const overlay = document.getElementById("overlay");
const globalLoader = document.getElementById('global-page-loader');

/* HAMBURGER & SIDEBAR LOGIC */
function toggleSidebar(e) {
    if (e) {
        e.preventDefault();
        e.stopPropagation();
    }
    sidebar.classList.toggle("mobile-open");
    if (overlay) overlay.classList.toggle("show");
}

// Mobile par instant response ke liye 'pointerdown' behtar hai
if (hamburger) {
    hamburger.addEventListener("pointerdown", toggleSidebar);
}

if (overlay) {
    overlay.addEventListener("click", toggleSidebar);
}

/* SUBMENU */
document.querySelectorAll(".menu-group").forEach(group => {
    const dropdown = group.querySelector(".dropdown");
    const submenu = group.querySelector(".submenu");
    const arrow = group.querySelector(".arrow");

    if (dropdown && submenu) {
        dropdown.addEventListener("click", (e) => {
            // Agar link hai to navigate karein, agar dropdown hai to toggle
            if (dropdown.getAttribute('href') === '#') e.preventDefault();
            
            submenu.classList.toggle("open");
            if (arrow) {
                arrow.textContent = submenu.classList.contains("open") ? "▼" : "▶";
            }
        });
    }
});






/* LOGOUT CONFIRMATION */
const logoutBtn = document.querySelector(".logout");

if (logoutBtn) {
    logoutBtn.addEventListener("click", (e) => {
        // Confirmation box dikhayein
        const confirmLogout = confirm("Are you sure you want to logout?");
        
        if (!confirmLogout) {
            // Agar user 'Cancel' karde to click ko rok dein
            e.preventDefault();
            
            // Agar aapka loader chal gaya ho to usay wapis band kar dein
            if (globalLoader) globalLoader.style.display = 'none';
        }
    });
}

