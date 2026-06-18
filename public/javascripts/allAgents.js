document.addEventListener("DOMContentLoaded", () => {

    // =========================================
    // 1. ELEMENTS
    // =========================================

    const filterForm     = document.getElementById("filterForm");
    const filterSelect   = document.getElementById("filter");
    const fromInput      = document.getElementById("from");
    const toInput        = document.getElementById("to");
    const applyBtn       = document.getElementById("apply");
    const searchBtn      = document.getElementById("searchBillBtn");
    const searchInput    = document.getElementById("billSearchInput");
    const tbody          = document.getElementById("agentTableBody");
    const tableContainer = document.getElementById("tableContainer");
    const loader         = document.getElementById("table-loader");
    const prevBtn        = document.getElementById("prevPage");
    const nextBtn        = document.getElementById("nextPage");
    const limitSelect    = document.getElementById("limitSelect");
    const provider       = document.getElementById("db-data-provider");

    let currentPage   = parseInt(provider?.dataset.page)       || 1;
    let currentLimit  = parseInt(provider?.dataset.limit)      || 25;
    const _totalPages = parseInt(provider?.dataset.totalPages) || 1;
    const _totalCount = parseInt(provider?.dataset.totalCount) || 0;


    // =========================================
    // 2. CUSTOM DATE TOGGLE
    // =========================================

    function toggleDateInputs(value) {
        const isCustom = value === "custom";
        if (fromInput) fromInput.style.display = isCustom ? "inline-block" : "none";
        if (toInput)   toInput.style.display   = isCustom ? "inline-block" : "none";
    }


    // =========================================
    // 3. PAGINATION UI UPDATE
    // =========================================

    function updatePaginationUI(pagination) {
        const from = pagination.totalCount === 0
            ? 0
            : ((pagination.page - 1) * pagination.limit) + 1;
        const to = Math.min(pagination.page * pagination.limit, pagination.totalCount);

        document.getElementById("showingFrom").textContent = from;
        document.getElementById("showingTo").textContent   = to;
        document.getElementById("totalCount").textContent  = pagination.totalCount;
        document.getElementById("pageInfo").textContent    = `Page ${pagination.page} of ${pagination.totalPages}`;

        if (prevBtn) prevBtn.disabled = !pagination.hasPrev;
        if (nextBtn) nextBtn.disabled = !pagination.hasNext;

        currentPage  = pagination.page;
        currentLimit = pagination.limit;
    }


    // =========================================
    // 4. MAIN FETCH / FILTER FUNCTION
    // =========================================

    const runFilter = async (endpoint = "/agents/all", customParams = null) => {
        const formData = customParams || new URLSearchParams(new FormData(filterForm)).toString();
        const url      = `${endpoint}?${formData}&page=${currentPage}&limit=${currentLimit}`;

        if (loader)         loader.style.display        = "flex";
        if (tableContainer) tableContainer.classList.add("loading-active");
        if (tbody)          tbody.style.opacity         = "0.3";

        try {
            const res  = await fetch(url, {
                headers: {
                    "X-Requested-With": "XMLHttpRequest",
                    "Accept":           "application/json"
                }
            });
            const data = await res.json();

            if (data.success) {

                // UPDATE STATS
                const statsPs = document.querySelectorAll(".stat-box p");
                if (statsPs.length >= 4) {
                    statsPs[0].innerText = data.stats.totalAgents;
                    statsPs[1].innerText = `Rs ${Number(data.stats.totalPercentageAmount      || 0).toFixed(2)}`;
                    statsPs[2].innerText = `Rs ${Number(data.stats.totalPercentageAmountGiven || 0).toFixed(2)}`;
                    statsPs[3].innerText = `Rs ${Number(data.stats.totalPercentageAmountLeft  || 0).toFixed(2)}`;
                }

                // UPDATE PAGINATION
                if (data.pagination) updatePaginationUI(data.pagination);

                // BUILD TABLE
                let html = "";

                if (!data.agents || data.agents.length === 0) {
                    html = `<tr><td colspan="5" class="no-data" style="text-align:center; padding:20px;">No records found.</td></tr>`;
                } else {
                    data.agents.forEach(a => {
                        const dateObj = new Date(a.createdAt);
                        const dateStr = dateObj.toLocaleDateString("en-GB",  { day:"2-digit", month:"short", year:"numeric",  timeZone:"Asia/Karachi" });
                        const timeStr = dateObj.toLocaleTimeString("en-GB",  { hour:"2-digit", minute:"2-digit", hour12:true,  timeZone:"Asia/Karachi" });

                        const leftAmount = (a.items && a.items.length > 0)
                            ? a.items.reduce((acc, item) => acc + (item.percentageAmount - item.paidAmount), 0).toLocaleString()
                            : "0";

                        html += `
                        <tr>
                            <td>${a.name}</td>
                            <td>${a.phone}</td>
                            <td style="color:red; font-weight:bold;">${leftAmount}</td>
                            <td>
                                ${dateStr}<br>
                                <small style="color:#007bff; font-weight:bold;">${timeStr}</small>
                            </td>
                            <td class="action-buttons">
                                <button id="view" >
                                    <a href="/agents/view/${a._id}" style="text-decoration:none; color:inherit;">View</a>
                                </button>
                                ${data.role === "admin"
                                    ? `<button type="button" class="delete-btn" data-id="${a._id}" id="delete" >Delete</button>`
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


    // =========================================
    // 5. DELETE
    // =========================================

  function attachDeleteListeners() {
    document.querySelectorAll(".delete-btn").forEach(btn => {
        btn.onclick = async (e) => {
            e.preventDefault();
            const id = btn.getAttribute("data-id");
            if (!confirm("Are you sure you want to delete this agent?")) return;
            try {
                const res  = await fetch(`/agents/delete-agent/${id}`, { method: "DELETE" });
                const data = await res.json();
                if (data.success) {
                    alert("✅ " + data.message);
                    currentPage = 1;
                    runFilter();
                } else {
                    alert("❌ " + data.message); // ← yeh add karo
                }
            } catch (err) {
                alert("❌ Error deleting agent.");
            }
        };
    });
}


    // =========================================
    // 6. PAGINATION EVENTS
    // =========================================

    if (prevBtn) {
        prevBtn.addEventListener("click", () => {
            if (currentPage > 1) { currentPage--; runFilter(); }
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener("click", () => {
            currentPage++; runFilter();
        });
    }

    if (limitSelect) {
        limitSelect.addEventListener("change", () => {
            currentLimit = parseInt(limitSelect.value);
            currentPage  = 1;
            runFilter();
        });
    }


    // =========================================
    // 7. FILTER EVENTS
    // =========================================

    if (filterSelect) {
        filterSelect.addEventListener("change", () => {
            toggleDateInputs(filterSelect.value);
            if (filterSelect.value !== "custom") {
                currentPage = 1;
                runFilter("/agents/all");
            }
        });
        toggleDateInputs(filterSelect.value);
    }

    if (applyBtn) {
        applyBtn.addEventListener("click", (e) => {
            e.preventDefault();
            currentPage = 1;
            if (searchInput) searchInput.value = "";
            runFilter("/agents/all");
        });
    }


    // =========================================
    // 8. SEARCH EVENTS
    // =========================================

    const handleSearch = () => {
        const val = searchInput ? searchInput.value.trim() : "";
        currentPage = 1;
        if (val !== "") {
            const params = new URLSearchParams();
            params.append("search", val);
            params.append("filter", "all");
            runFilter("/agents/find", params.toString());
        } else {
            runFilter("/agents/all");
        }
    };

    if (searchBtn)   searchBtn.addEventListener("click", handleSearch);
    if (searchInput) {
        searchInput.addEventListener("keypress", (e) => {
            if (e.key === "Enter") { e.preventDefault(); handleSearch(); }
        });
    }


    // =========================================
    // 9. INITIAL LOAD
    // =========================================

    updatePaginationUI({
        page:       currentPage,
        limit:      currentLimit,
        totalCount: _totalCount,
        totalPages: _totalPages,
        hasPrev:    currentPage > 1,
        hasNext:    currentPage < _totalPages
    });

    if (limitSelect) limitSelect.value = currentLimit;

    attachDeleteListeners();

});

