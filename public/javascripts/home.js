document.addEventListener("DOMContentLoaded", () => {
  const filterForm = document.getElementById("filterForm");
  const filterSelect = document.getElementById("filterSelect");
  const fromDate = document.getElementById("fromDate");
  const toDate = document.getElementById("toDate");
  const loader = document.getElementById("loader");
  const calculatorGrid = document.getElementById("calculatorGrid");

  // --- Function to toggle date inputs based on selection ---
  function toggleDateInputs() {
    if (filterSelect.value === "custom") {
      fromDate.style.display = "inline-block";
      toDate.style.display = "inline-block";
      fromDate.required = true;
      toDate.required = true;
    } else {
      fromDate.style.display = "none";
      toDate.style.display = "none";
      fromDate.required = false;
      toDate.required = false;
      // Clear values when not needed to keep data clean
      fromDate.value = "";
      toDate.value = "";
    }
  }

  // --- Initial check on page load ---
  toggleDateInputs();

  // --- Toggle on dropdown change ---
  filterSelect.addEventListener("change", toggleDateInputs);

  // --- Handle Form Submission (AJAX) on button click ---
  filterForm.addEventListener("submit", async (e) => {
    e.preventDefault(); // Stop page reload

    const formData = new FormData(filterForm);
    const params = new URLSearchParams();

    // Only add params to URL if they have values
    for (const [key, value] of formData.entries()) {
      if (value) {
        params.append(key, value);
      }
    }

    loader.style.display = "block";
    calculatorGrid.style.opacity = 0.2;

    try {
      // Fetch with parameters
      const res = await fetch("/home?" + params.toString(), {
        headers: { "X-Requested-With": "XMLHttpRequest" }
      });
      const html = await res.text();
      calculatorGrid.innerHTML = html;
      
      // --- Update URL to keep it clean (/home) ---
      // Refresh karne par default view aayega, lekin AJAX se filter chalta rahega
      window.history.pushState({}, "", "/home"); 
    } catch (err) {
      console.error(err);
    } finally {
      loader.style.display = "none";
      calculatorGrid.style.opacity = 1;
    }
  });
});


