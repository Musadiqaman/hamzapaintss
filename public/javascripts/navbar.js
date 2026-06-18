const sidebar = document.getElementById("sidebar");
const hamburger = document.getElementById("hamburger");
const overlay = document.getElementById("overlay");
const globalLoader = document.getElementById('global-page-loader');

/* 🔄 SMART SIDEBAR TOGGLE (MOBILE & DESKTOP) */
function toggleSidebar(e) {
    if (e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    // Screen width check karein
    if (window.innerWidth <= 768) {
        // 📱 Mobile Logic: Drawer style toggle with background overlay shadow
        sidebar.classList.toggle("mobile-open");
        if (overlay) overlay.classList.toggle("show");
        // Safe check taake desktop structure conflict na kare
        sidebar.classList.remove("desktop-closed");
        document.body.classList.remove("sidebar-hidden");
    } else {
        // 💻 Desktop Logic: Main content layout expand or collapse layout smoothly
        sidebar.classList.toggle("desktop-closed");
        document.body.classList.toggle("sidebar-hidden");
        // Safe check for mobile elements
        sidebar.classList.remove("mobile-open");
        if (overlay) overlay.classList.remove("show");
    }
}

// Click and Touch friendly response handling
if (hamburger) {
    hamburger.addEventListener("pointerdown", toggleSidebar);
}

if (overlay) {
    overlay.addEventListener("click", toggleSidebar);
}

/* 📦 SUBMENU ACCORDION TOGGLE */
document.querySelectorAll(".menu-group").forEach(group => {
    const dropdown = group.querySelector(".dropdown");
    const submenu = group.querySelector(".submenu");
    const arrow = group.querySelector(".arrow");

    if (dropdown && submenu) {
        dropdown.addEventListener("click", (e) => {
            if (dropdown.getAttribute('href') === '#') e.preventDefault();
            
            submenu.classList.toggle("open");
            if (arrow) {
                arrow.textContent = submenu.classList.contains("open") ? "▼" : "▶";
            }
        });
    }
});

/* 🔓 LOGOUT CONFIRMATION */
const logoutBtn = document.querySelector(".logout");

if (logoutBtn) {
    logoutBtn.addEventListener("click", (e) => {
        const confirmLogout = confirm("Are you sure you want to logout?");
        
        if (!confirmLogout) {
            e.preventDefault();
            if (globalLoader) globalLoader.style.display = 'none';
        }
    });
}


