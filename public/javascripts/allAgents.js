document.addEventListener("DOMContentLoaded", () => {
    // --- 1. Elements Selection ---
    const filterForm = document.getElementById("filterForm");
    const filterSelect = document.getElementById("filter");
    const fromInput = document.getElementById("from");
    const toInput = document.getElementById("to");
    const applyBtn = document.getElementById("apply");
    const tbody = document.querySelector('tbody');

    /**
     * 2. TOGGLE DATE INPUTS
     * Sirf inputs dikhayega jab 'custom' select ho.
     */
    function toggleDateInputs(value) {
        if (value === "custom") {
            if (fromInput) fromInput.style.display = "inline-block";
            if (toInput) toInput.style.display = "inline-block";
        } else {
            if (fromInput) fromInput.style.display = "none";
            if (toInput) toInput.style.display = "none";
        }
    }

    /**
     * 3. CORE FILTER FUNCTION (SPA STYLE)
     * Backend se data layega aur table/stats ko update karega.
     */
    const runFilter = async () => {
        // Form data pick karna
        const formData = new URLSearchParams(new FormData(filterForm)).toString();
        
        // Table loading state
        tbody.style.opacity = '0.5';

        try {
            const res = await fetch(`/agents/all?${formData}`, {
                headers: { 
                    'X-Requested-With': 'XMLHttpRequest',
                    'Accept': 'application/json'
                }
            });
            const data = await res.json();

            if (data.success) {
                // --- A. Stats Update (With Number Formatting) ---
                const statsPs = document.querySelectorAll('.stat-box p');
                if (statsPs.length >= 4) {
                    statsPs[0].innerText = data.stats.totalAgents;
                    statsPs[1].innerText = `Rs ${Number(data.stats.totalPercentageAmount || 0).toFixed(2)}`;
                    statsPs[2].innerText = `Rs ${Number(data.stats.totalPercentageAmountGiven || 0).toFixed(2)}`;
                    statsPs[3].innerText = `Rs ${Number(data.stats.totalPercentageAmountLeft || 0).toFixed(2)}`;
                }

                // --- B. Table Rebuild (With Strict PKT Timezone) ---
                let html = '';
                if (!data.agents || data.agents.length === 0) {
                    html = `<tr><td colspan="5" class="no-data" style="text-align:center; padding:20px;">No records found.</td></tr>`;
                } else {
                    data.agents.forEach(a => {
                        const dateObj = new Date(a.createdAt);
                        
                        // 🟢 PKT Timezone Fix: Taake date shift na ho
                        const dateStr = dateObj.toLocaleDateString('en-GB', { 
                            day: '2-digit', month: 'short', year: 'numeric', 
                            timeZone: 'Asia/Karachi' 
                        });
                        const timeStr = dateObj.toLocaleTimeString('en-GB', { 
                            hour: '2-digit', minute: '2-digit', hour12: true, 
                            timeZone: 'Asia/Karachi' 
                        });

                        html += `
                        <tr>
                            <td>${a.name || 'N/A'}</td>
                            <td>${a.phone || 'N/A'}</td>
                            <td>${a.cnic || 'N/A'}</td>
                            <td>
                                ${dateStr}<br>
                                <small style="color: #007bff; font-weight: bold;">${timeStr}</small>
                            </td>
                            <td class="action-buttons">
                                <button id="view">
                                    <a href="/agents/view-agent/${a._id}" style="text-decoration: none; color: inherit;">View</a>
                                </button>
                                ${data.role === "admin" ? `
                                <button type="button" id="delete" class="delete-btn" data-id="${a._id}">Delete</button>
                                ` : ''}
                            </td>
                        </tr>`;
                    });
                }

                tbody.innerHTML = html;

                // Browser URL update (bina reload ke)
                window.history.pushState({}, '', `/agents/all?${formData}`);

                // Re-attach delete listeners to new buttons
                attachDeleteListeners();
            }
        } catch (err) {
            console.error("Fetch Error:", err);
        } finally {
            tbody.style.opacity = '1';
        }
    };

    /**
     * 4. DELETE LOGIC
     */
    function attachDeleteListeners() {
        document.querySelectorAll(".delete-btn").forEach(btn => {
            btn.onclick = async (e) => {
                e.preventDefault();
                const id = btn.getAttribute("data-id");
                if (confirm("Are you sure you want to delete this agent?")) {
                    try {
                        const res = await fetch(`/agents/delete-agent/${id}`, { method: 'DELETE' });
                        const data = await res.json();
                        if (data.success) {
                            runFilter(); // Table refresh bina reload ke
                        }
                    } catch (err) {
                        console.error("Delete failed:", err);
                    }
                }
            };
        });
    }

    // --- 5. Event Listeners ---

    // Apply Button click
    if (applyBtn) {
        applyBtn.addEventListener("click", (e) => {
            e.preventDefault();
            runFilter();
        });
    }

    // Dropdown change
    if (filterSelect) {
        filterSelect.addEventListener("change", () => {
            toggleDateInputs(filterSelect.value);
        });
        // Run initial check
        toggleDateInputs(filterSelect.value);
    }

    // Enter key support in form
    if (filterForm) {
        filterForm.onsubmit = (e) => {
            e.preventDefault();
            runFilter();
            return false;
        };
    }

    // Initial attachment
    attachDeleteListeners();
});