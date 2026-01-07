document.addEventListener("DOMContentLoaded", () => {
    const filterForm = document.getElementById("filterForm");
    const filterSelect = document.getElementById("filter");
    const fromInput = document.getElementById("from");
    const toInput = document.getElementById("to");
    const applyBtn = document.getElementById("apply");
    const tbody = document.querySelector('tbody');
    const tableContainer = document.getElementById('tableContainer');
    const loader = document.getElementById('table-loader');

    // 1. Sirf Inputs ko show/hide karne ke liye (Data load nahi karega)
    function toggleDateInputs(value) {
        const isCustom = value === "custom";
        if (fromInput) fromInput.style.display = isCustom ? "inline-block" : "none";
        if (toInput) toInput.style.display = isCustom ? "inline-block" : "none";
    }

    // 2. Data load karne wala function
    const runFilter = async () => {
        const formData = new URLSearchParams(new FormData(filterForm)).toString();
        
        // Loader Show
        if (loader) loader.style.display = 'flex';
        if (tableContainer) tableContainer.classList.add('loading-active');
        tbody.style.opacity = '0.3';

        try {
            const res = await fetch(`/agents/all?${formData}`, {
                headers: { 
                    'X-Requested-With': 'XMLHttpRequest',
                    'Accept': 'application/json'
                }
            });
            const data = await res.json();

            if (data.success) {
                // Update Stats
                const statsPs = document.querySelectorAll('.stat-box p');
                if (statsPs.length >= 4) {
                    statsPs[0].innerText = data.stats.totalAgents;
                    statsPs[1].innerText = `Rs ${data.stats.totalPercentageAmount.toFixed(2)}`;
                    statsPs[2].innerText = `Rs ${data.stats.totalPercentageAmountGiven.toFixed(2)}`;
                    statsPs[3].innerText = `Rs ${data.stats.totalPercentageAmountLeft.toFixed(2)}`;
                }

                // Build Table
                let html = '';
                if (!data.agents || data.agents.length === 0) {
                    html = `<tr><td colspan="5" class="no-data" style="text-align:center; padding:20px;">No records found.</td></tr>`;
                } else {
                    data.agents.forEach(a => {
                        const dateObj = new Date(a.createdAt);
                        const dateStr = dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Karachi' });
                        const timeStr = dateObj.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Karachi' });

                        html += `
                        <tr>
                            <td>${a.name }</td>
                            <td>${a.phone }</td>
                            <td>${a.cnic }</td>
                            <td>${dateStr}<br><small style="color: #007bff; font-weight: bold;">${timeStr}</small></td>
                            <td class="action-buttons">
                                <button id="view"><a href="/agents/view-agent/${a._id}" style="text-decoration: none; color: inherit;">View</a></button>
                                ${data.role === "admin" ? `<button type="button" class="delete-btn" data-id="${a._id}" id="delete" >Delete</button>` : ''}
                            </td>
                        </tr>`;
                    });
                }
                tbody.innerHTML = html;
                attachDeleteListeners();
            }
        } catch (err) {
            console.error("Fetch Error:", err);
        } finally {
            // Loader Hide
            if (loader) loader.style.display = 'none';
            if (tableContainer) tableContainer.classList.remove('loading-active');
            tbody.style.opacity = '1';
        }
    };

    function attachDeleteListeners() {
        document.querySelectorAll(".delete-btn").forEach(btn => {
            btn.onclick = async (e) => {
                e.preventDefault();
                const id = btn.getAttribute("data-id");
                if (confirm("Are you sure you want to delete this agent?")) {
                    try {
                        const res = await fetch(`/agents/delete-agent/${id}`, { method: 'DELETE' });
                        const data = await res.json();
                        if (data.success){ 
                            alert(data.message);
                            runFilter();
                        } // Delete ke baad refresh
                    } catch (err) { console.error("Delete failed:", err); }
                }
            };
        });
    }

    // --- EVENT LISTENERS ---

    // 🟢 AB SIRF APPLY BUTTON PAR DATA LOAD HOGA
    if (applyBtn) {
        applyBtn.addEventListener("click", (e) => {
            e.preventDefault();
            runFilter();
        });
    }

    // Dropdown change karne par sirf inputs togggle honge, data load NAHI hoga
    if (filterSelect) {
        filterSelect.addEventListener("change", () => {
            toggleDateInputs(filterSelect.value);
        });
        toggleDateInputs(filterSelect.value); // Initial check
    }

    attachDeleteListeners();
});