document.addEventListener("DOMContentLoaded", () => {
    // =============================================
    // 1. CORE ELEMENTS INITIALIZATION
    // =============================================
    const filterForm = document.getElementById("filterForm");
    const filterSelect = document.getElementById("filter");
    const fromInput = document.getElementById("from");
    const toInput = document.getElementById("to");
    const applyBtn = document.getElementById("apply");

    const tbody = document.getElementById('agentTableBody');
    const tableContainer = document.getElementById('tableContainer');
    const loader = document.getElementById('table-loader');
    
    const prevBtn = document.getElementById("prevPage");
    const nextBtn = document.getElementById("nextPage");
    const limitSelect = document.getElementById("limitSelect");
    const provider = document.getElementById("db-data-provider");

    // Runtime state tracking initialization variables
    let currentPage  = parseInt(provider?.dataset.page)       || 1;
    let currentLimit = parseInt(provider?.dataset.limit)      || 25;
    let totalPages   = parseInt(provider?.dataset.totalPages) || 1;

    // =============================================
    // 2. DYNAMIC PAGINATION ENGINE SYNC UI
    // =============================================
    function updatePaginationUI(pagination) {
        const from = pagination.totalCount === 0 ? 0 : ((pagination.page - 1) * pagination.limit) + 1;
        const to   = Math.min(pagination.page * pagination.limit, pagination.totalCount);

        document.getElementById("showingFrom").textContent = from;
        document.getElementById("showingTo").textContent   = to;
        document.getElementById("totalCount").textContent  = pagination.totalCount;
        document.getElementById("pageInfo").textContent    = `Page ${pagination.page} of ${pagination.totalPages}`;

        if (prevBtn) prevBtn.disabled = !pagination.hasPrev;
        if (nextBtn) nextBtn.disabled = !pagination.hasNext;

        // Synchronize state memory management values
        currentPage  = pagination.page;
        currentLimit = pagination.limit;
        totalPages   = pagination.totalPages;

        // Sync local dataset bindings node stack parameters
        if (provider) {
            provider.dataset.page = pagination.page;
            provider.dataset.limit = pagination.limit;
            provider.dataset.totalPages = pagination.totalPages;
            provider.dataset.totalCount = pagination.totalCount;
        }
    }

    // =============================================
    // 3. UI VISIBILITY CONTROLLER
    // =============================================
    function toggleDateInputs(value) {
        const isCustom = value === "custom";
        if (fromInput) fromInput.style.display = isCustom ? "inline-block" : "none";
        if (toInput) toInput.style.display = isCustom ? "inline-block" : "none";
    }

    // =============================================
    // 4. DATA ENGINE RUNNER (AJAX ASYNC PROCESSING)
    // =============================================
    const runFilter = async () => {
        const params = new URLSearchParams(new FormData(filterForm));
        params.set("page", currentPage);
        params.set("limit", currentLimit);
        
        if (loader) loader.style.display = 'flex';
        if (tableContainer) tableContainer.classList.add('loading-active');
        if (tbody) tbody.style.opacity = '0.3';

        try {
            const res = await fetch(`/guest/all?${params.toString()}`, {
                headers: { 
                    'X-Requested-With': 'XMLHttpRequest',
                    'Accept': 'application/json'
                }
            });
            const data = await res.json();

            if (data.success || data.guests) {
                const statsPs = document.querySelectorAll('.stats .stat-box p');
                
                // Update dynamic statistical elements
                if (statsPs[0]) statsPs[0].innerText = data.stats.totalGuests || 0;
                if (statsPs[1]) statsPs[1].innerText = `Rs. ${Number(data.stats.totalAmountSum || 0).toLocaleString('en-IN')}`;

                // Process layout compilation loops
                let html = '';
                if (!data.guests || data.guests.length === 0) {
                    html = `<tr><td colspan="6" class="no-data" style="text-align:center; padding:20px;">No guests Expenses found.</td></tr>`;
                } else {
                    data.guests.forEach(g => {
                        const amount = Number(g.amount || 0);
                        const dateObj = new Date(g.createdAt);
                        const dateStr = dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Karachi' });
                        const timeStr = dateObj.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Karachi' });

                        html += `
                            <tr>
                                <td><strong>${g.guestName}</strong></td>
                                <td>${g.title || 'Chai / Cold Drink (Mehman)'}</td>
                                <td style="color: #c0392b; font-weight: bold;">Rs. ${amount.toFixed(0)}</td>
                                <td>${g.remarks || 'N/A'}</td>
                                <td>
                                    ${dateStr}<br>
                                    <small style="color: #007bff; font-weight: bold;">${timeStr}</small>
                                </td>
                              ${window.role === "admin" ? `<td><button type="button" class="delete-btn" data-id="${g._id}">Delete</button></td>` : ''}
                            </tr>`;
                    });
                }

                if (tbody) tbody.innerHTML = html;
                
                // Sync pagination trackers layout 
                if (data.pagination) updatePaginationUI(data.pagination);
                
                attachDeleteListeners();
            }
        } catch (err) {
            console.error("🔴 Live Filter Fetch Error:", err);
        } finally {
            if (loader) loader.style.display = 'none';
            if (tableContainer) tableContainer.classList.remove('loading-active');
            if (tbody) tbody.style.opacity = '1';
        }
    };

    // =============================================
    // 5. ASYNC EVENT BINDERS & OPERATIONS
    // =============================================
    function attachDeleteListeners() {
        document.querySelectorAll(".delete-btn").forEach(btn => {
            btn.onclick = async (e) => {
                e.preventDefault();
                const id = btn.getAttribute("data-id");
                if (confirm("Are you sure you want to delete this guest entry?")) {
                    try {
                        const res = await fetch(`/guest/delete-guest/${id}`, { method: 'DELETE' });
                        const data = await res.json();
                        if (data.success){ 
                            alert(data.message || "Entry deleted!");
                            runFilter(); 
                        }
                    } catch (err) { console.error("🔴 Delete failed:", err); }
                }
            };
        });
    }

    // Pagination Click Observers
    if (prevBtn) {
        prevBtn.onclick = () => {
            if (currentPage > 1) { 
                currentPage--; 
                runFilter(); 
            }
        };
    }

    if (nextBtn) {
        nextBtn.onclick = () => {
            if (currentPage < totalPages) {
                currentPage++;
                runFilter();
            }
        };
    }

    if (limitSelect) {
        limitSelect.addEventListener("change", () => {
            currentLimit = parseInt(limitSelect.value);
            currentPage  = 1;
            runFilter();
        });
    }

    if (applyBtn) {
        applyBtn.addEventListener("click", (e) => {
            e.preventDefault();
            currentPage = 1;
            runFilter(); 
        });
    }

    if (filterSelect) {
        filterSelect.addEventListener("change", () => {
            toggleDateInputs(filterSelect.value);
            if (filterSelect.value !== "custom") {
                currentPage = 1;
                runFilter();
            }
        });
    }

    // =============================================
    // 6. INITIAL PROCESS BOOTSTRAP
    // =============================================
    const entryDataTotal = parseInt(provider?.dataset.totalCount) || 0;
    if (entryDataTotal > 0 && provider) {
        updatePaginationUI({
            page: parseInt(provider.dataset.page),
            limit: parseInt(provider.dataset.limit),
            totalPages: parseInt(provider.dataset.totalPages),
            totalCount: entryDataTotal,
            hasPrev: parseInt(provider.dataset.page) > 1,
            hasNext: parseInt(provider.dataset.page) < parseInt(provider.dataset.totalPages)
        });
    }
    toggleDateInputs(filterSelect ? filterSelect.value : "month");
    attachDeleteListeners();
});