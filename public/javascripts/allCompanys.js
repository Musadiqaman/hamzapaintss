document.addEventListener("DOMContentLoaded", () => {

    // =============================================
    // 1. ELEMENTS
    // =============================================
    const filterForm     = document.getElementById("filterForm");
    const filterSelect   = document.getElementById("filter");
    const fromInput      = document.getElementById("from");
    const toInput        = document.getElementById("to");
    const applyBtn       = document.getElementById("apply");
    const searchBtn      = document.getElementById("searchBillBtn");
    const searchInput    = document.getElementById("billSearchInput");
    const tbody          = document.getElementById("companyTableBody");
    const tableContainer = document.getElementById("tableContainer");
    const loader         = document.getElementById("table-loader");
    const prevBtn        = document.getElementById("prevPage");
    const nextBtn        = document.getElementById("nextPage");
    const limitSelect    = document.getElementById("limitSelect");

    const provider = document.getElementById("db-data-provider");

    let currentPage  = parseInt(provider?.dataset.page)       || 1;
    let currentLimit = parseInt(provider?.dataset.limit)      || 25;
    let totalPages   = parseInt(provider?.dataset.totalPages) || 1;

    // =============================================
    // 2. PAGINATION UI UPDATE
    // =============================================
    function updatePaginationUI(pagination) {
        const from = pagination.totalCount === 0 ? 0 : ((pagination.page - 1) * pagination.limit) + 1;
        const to   = Math.min(pagination.page * pagination.limit, pagination.totalCount);

        document.getElementById("showingFrom").textContent = from;
        document.getElementById("showingTo").textContent   = to;
        document.getElementById("totalCount").textContent  = pagination.totalCount;
        document.getElementById("pageInfo").textContent    = `Page ${pagination.page} of ${pagination.totalPages}`;

        prevBtn.disabled = !pagination.hasPrev;
        nextBtn.disabled = !pagination.hasNext;

        currentPage  = pagination.page;
        currentLimit = pagination.limit;
        totalPages   = pagination.totalPages;

        if (provider) {
            provider.dataset.page       = pagination.page;
            provider.dataset.limit      = pagination.limit;
            provider.dataset.totalPages = pagination.totalPages;
            provider.dataset.totalCount = pagination.totalCount;
        }
    }

    // =============================================
    // 3. DATE INPUTS TOGGLE
    // =============================================
    function toggleDateInputs(value) {
        const isCustom = value === "custom";
        if (fromInput) fromInput.style.display = isCustom ? "inline-block" : "none";
        if (toInput)   toInput.style.display   = isCustom ? "inline-block" : "none";
    }

    // =============================================
    // 4. MAIN DATA FETCH
    // =============================================
    const runFilter = async (customParams = null) => {
        let queryString;

        if (customParams) {
            const params = new URLSearchParams(customParams);
            params.set("page",  currentPage);
            params.set("limit", currentLimit);
            queryString = params.toString();
        } else {
            const params = new URLSearchParams(new FormData(filterForm));
            params.set("page",  currentPage);
            params.set("limit", currentLimit);
            if (searchInput && searchInput.value.trim() !== "") {
                params.set("search", searchInput.value.trim());
            }
            queryString = params.toString();
        }

        if (loader)         loader.style.display = "flex";
        if (tableContainer) tableContainer.classList.add("loading-active");
        if (tbody)          tbody.style.opacity  = "0.3";

        try {
            const res  = await fetch(`/company/all?${queryString}`, {
                headers: {
                    "X-Requested-With": "XMLHttpRequest",
                    "Accept": "application/json"
                }
            });
            const data = await res.json();

            if (data.success) {
                // Update Stats
                const statsPs = document.querySelectorAll(".stat-box p");
                if (statsPs.length >= 4) {
                    statsPs[0].innerText = data.stats.totalCompanies;
                    statsPs[1].innerText = `Rs ${Number(data.stats.totalOutstandingAmount      || 0).toFixed(2)}`;
                    statsPs[2].innerText = `Rs ${Number(data.stats.totalOutstandingAmountGiven || 0).toFixed(2)}`;
                    statsPs[3].innerText = `Rs ${Number(data.stats.totalOutstandingAmountLeft  || 0).toFixed(2)}`;
                }

                // Update Pagination
                if (data.pagination) updatePaginationUI(data.pagination);

                // Build Table Rows
                let html = "";

                if (!data.companies || data.companies.length === 0) {
                    html = `<tr><td colspan="5" class="no-data" style="text-align:center; padding:20px;">No records found.</td></tr>`;
                } else {
                    data.companies.forEach(c => {
                        const dateObj = new Date(c.createdAt);
                        const dateStr = dateObj.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Karachi" });
                        const timeStr = dateObj.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "Asia/Karachi" });

                        const balance = c.calculatedLeft !== undefined ? c.calculatedLeft : 0;

                        html += `
                            <tr>
                                <td>${c.name}</td>
                                <td>${c.phone}</td>
                                <td style="color:red; font-weight:bold;">${balance.toLocaleString()}</td>
                                <td>
                                    ${dateStr}<br>
                                    <small style="color:#007bff; font-weight:bold;">${timeStr}</small>
                                </td>
                                <td class="action-buttons">
                                    <button id="view">
                                        <a href="/company/view/${c._id}" style="text-decoration:none; color:inherit;">View</a>
                                    </button>
                                    ${data.role === "admin"
                                        ? `<button type="button" class="delete-btn" data-id="${c._id}" id="delete" >Delete</button>`
                                        : ""}
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
            if (loader)         loader.style.display = "none";
            if (tableContainer) tableContainer.classList.remove("loading-active");
            if (tbody)          tbody.style.opacity  = "1";
        }
    };

    // =============================================
    // 5. DELETE LISTENERS
    // =============================================
    function attachDeleteListeners() {
        document.querySelectorAll(".delete-btn").forEach(btn => {
            btn.onclick = async (e) => {
                e.preventDefault();
                if (!confirm("Are you sure?")) return;
                const id = btn.getAttribute("data-id");
                try {
                    const res  = await fetch(`/company/delete-company/${id}`, { method: "DELETE" });
                    const data = await res.json();
                    if (data.success) {
                        alert("✅ " + data.message);
                        runFilter();
                    } else {
                        alert("❌ " + data.message);
                    }
                } catch (err) {
                    alert("❌ Error deleting company.");
                }
            };
        });
    }

    // =============================================
    // 6. SEARCH LOGIC
    // =============================================
    const handleSearch = () => {
        const val = searchInput.value.trim();
        currentPage = 1;
        if (val !== "") {
            const params = new URLSearchParams();
            params.append("search", val);
            params.append("filter", "all");
            runFilter(params.toString());
        } else {
            runFilter();
        }
    };

    // =============================================
    // 7. PAGINATION EVENTS
    // =============================================
    if (prevBtn) {
        prevBtn.onclick = () => {
            if (currentPage > 1) { currentPage--; runFilter(); }
        };
    }

    if (nextBtn) {
        nextBtn.onclick = () => {
            if (currentPage < totalPages) { currentPage++; runFilter(); }
        };
    }

    if (limitSelect) {
        limitSelect.addEventListener("change", () => {
            currentLimit = parseInt(limitSelect.value);
            currentPage  = 1;
            runFilter();
        });
    }

    // =============================================
    // 8. FILTER + SEARCH EVENTS
    // =============================================
    if (applyBtn) {
        applyBtn.addEventListener("click", (e) => {
            e.preventDefault();
            currentPage = 1;
            runFilter();
        });
    }

    if (searchBtn)  searchBtn.addEventListener("click", handleSearch);

    if (searchInput) {
        searchInput.addEventListener("keypress", (e) => {
            if (e.key === "Enter") { e.preventDefault(); handleSearch(); }
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
    // 9. INIT
    // =============================================
    toggleDateInputs(filterSelect ? filterSelect.value : "month");
    attachDeleteListeners();
});

