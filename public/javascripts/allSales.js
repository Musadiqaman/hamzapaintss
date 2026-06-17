document.addEventListener('DOMContentLoaded', () => {

    // =========================================
    // 1. DATA LOAD
    // =========================================

    let dbDefinitions = [];
    const provider = document.getElementById('db-data-provider');

    if (provider && provider.getAttribute('data-definitions')) {
        try {
            dbDefinitions = JSON.parse(provider.getAttribute('data-definitions'));
        } catch (e) {
            console.error("❌ Parse Error:", e);
        }
    }

    // =========================================
    // 2. ELEMENTS
    // =========================================

    const brandFilter    = document.getElementById('brandFilter');
    const itemFilter     = document.getElementById('itemNameFilter');
    const colourFilter   = document.getElementById('colourNameFilter');
    const unitFilter     = document.getElementById('unitFilter');
    const refundFilter   = document.getElementById('refundFilter');
    const filterForm     = document.getElementById('filterForm');
    const filterSelect   = document.getElementById('filter');
    const fromInput      = document.getElementById('from');
    const toInput        = document.getElementById('to');
    const applyBtn       = document.getElementById('apply');
    const selectAll = document.getElementById('selectAll');
    const tableContainer = document.getElementById('tableContainer');
    const prevBtn        = document.getElementById('prevPage');
    const nextBtn        = document.getElementById('nextPage');
    const limitSelect    = document.getElementById('limitSelect');

    let currentPage  = parseInt(provider?.dataset.page)       || 1;
    let currentLimit = parseInt(provider?.dataset.limit)      || 25;
    const _totalPages = parseInt(provider?.dataset.totalPages) || 1;
    const _totalCount = parseInt(provider?.dataset.totalCount) || 0;


    // =========================================
    // 3. CUSTOM DATE TOGGLE
    // =========================================

    function toggleCustomDates() {
        const isCustom = filterSelect && filterSelect.value === 'custom';
        if (fromInput)  fromInput.style.display  = isCustom ? 'inline-block' : 'none';
        if (toInput)    toInput.style.display     = isCustom ? 'inline-block' : 'none';
        if (applyBtn)   applyBtn.style.display    = isCustom ? 'inline-block' : 'none';
    }


    // =========================================
    // 4. DROPDOWN SYNC
    // =========================================

    function syncDropdowns(isInitial = false) {
        const selectedBrand = brandFilter.value;
        const preItem  = itemFilter.getAttribute('data-selected');
        const preUnit  = unitFilter.getAttribute('data-selected');

        itemFilter.innerHTML   = '<option value="all">All Items</option>';
        unitFilter.innerHTML   = '<option value="all">All Units</option>';
        colourFilter.innerHTML = '<option value="all">All Colours</option>';

        if (selectedBrand === 'all') {
            itemFilter.disabled   = true;
            unitFilter.disabled   = true;
            colourFilter.disabled = true;
            return;
        }

        const data = dbDefinitions.find(d => d.brandName === selectedBrand);

        if (data) {
            itemFilter.disabled = false;
            unitFilter.disabled = false;

            if (data.products && Array.isArray(data.products)) {
                data.products.forEach(prod => {
                    const name = prod.itemName;
                    if (name) {
                        const opt = new Option(name, name);
                        if (isInitial && name === preItem) opt.selected = true;
                        itemFilter.add(opt);
                    }
                });
            }

            if (data.units && Array.isArray(data.units)) {
                data.units.forEach(u => {
                    const unitValue = (typeof u === 'object' && u !== null) ? u.unitname : u;
                    if (unitValue) {
                        const opt = new Option(unitValue, unitValue);
                        if (isInitial && unitValue === preUnit) opt.selected = true;
                        unitFilter.add(opt);
                    }
                });
            }

            syncColours(isInitial);
        }
    }

    function syncColours(isInitial = false) {
        const selectedBrand = brandFilter.value;
        const selectedItem  = itemFilter.value;
        const preColor      = colourFilter.getAttribute('data-selected');

        colourFilter.innerHTML = '<option value="all">All Colours</option>';

        if (selectedItem === 'all') {
            colourFilter.disabled = true;
            return;
        }

        const brandData = dbDefinitions.find(d => d.brandName === selectedBrand);
        if (brandData && brandData.products) {
            const selectedProduct = brandData.products.find(p => p.itemName === selectedItem);
            if (selectedProduct && selectedProduct.colors && Array.isArray(selectedProduct.colors)) {
                colourFilter.disabled = false;
                selectedProduct.colors.forEach(c => {
                    const cName = c.colour || "Unknown";
                    const cCode = c.code   || "";
                    const val   = cCode ? `${cName} (Code: ${cCode})` : cName;
                    const opt   = new Option(val, val);
                    if (isInitial && val === preColor) opt.selected = true;
                    colourFilter.add(opt);
                });
            } else {
                colourFilter.disabled = true;
            }
        }
    }


    // =========================================
    // 5. PAGINATION UI UPDATE
    // =========================================

    function updatePaginationUI(pagination) {
        const from = pagination.totalCount === 0 ? 0 : ((pagination.page - 1) * pagination.limit) + 1;
        const to   = Math.min(pagination.page * pagination.limit, pagination.totalCount);

        document.getElementById('showingFrom').textContent = from;
        document.getElementById('showingTo').textContent   = to;
        document.getElementById('totalCount').textContent  = pagination.totalCount;
        document.getElementById('pageInfo').textContent    = `Page ${pagination.page} of ${pagination.totalPages}`;

        prevBtn.disabled = !pagination.hasPrev;
        nextBtn.disabled = !pagination.hasNext;

        currentPage  = pagination.page;
        currentLimit = pagination.limit;
    }


    // =========================================
    // 6. AJAX TABLE UPDATE
    // =========================================

    async function updateTable() {
        const formData = new URLSearchParams(new FormData(filterForm)).toString();
        const url      = `/sales/all?${formData}&page=${currentPage}&limit=${currentLimit}`;

        const tbody = document.getElementById('saleTableBody');
        const loader = document.getElementById('table-loader');

        if (loader) loader.style.display = 'flex';
        if (tbody)  tbody.style.opacity  = '0.3';

        try {
            const res  = await fetch(url, { headers: { 'X-Requested-With': 'XMLHttpRequest' } });
            const data = await res.json();

            if (data.success) {

                // UPDATE STATS
                const statsPs = document.querySelectorAll('.stat-box p');
                if (statsPs.length >= 5) {
                    statsPs[0].innerText = `Rs ${parseFloat(data.stats.totalRevenue).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                    statsPs[1].innerText = `Rs ${parseFloat(data.stats.totalProfit).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                    statsPs[2].innerText = `Rs ${parseFloat(data.stats.totalLoss).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                    statsPs[3].innerText = `Rs ${parseFloat(data.stats.totalRefunded).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                    statsPs[4].innerText = `Rs ${parseFloat(data.stats.totalRefundedprofit).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                }

                // UPDATE PAGINATION
                if (data.pagination) updatePaginationUI(data.pagination);

                // BUILD TABLE
                let html = '';

                if (data.sales.length === 0) {
                    html = '<tr><td colspan="12" class="no-data">No records found</td></tr>';
                } else {
                    data.sales.forEach(s => {
                        const dateObj = new Date(s.createdAt);
                        const dateStr = dateObj.toLocaleDateString('en-GB',  { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Karachi' });
                        const timeStr = dateObj.toLocaleTimeString('en-GB',  { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Karachi' });
                        const profitClass = s.profit < 0 ? 'loss' : 'profit';

                        html += `
                        <tr>
                            <td><input type="checkbox" class="row-checkbox" value="${s._id}"></td>
                            <td>${s.brandName}</td>
                            <td>${s.itemName}</td>
                            <td>${s.colourName}</td>
                            <td>${s.qty}</td>
                            <td>${s.quantitySold}</td>
                            <td>Rs ${s.rate.toFixed(2)}</td>
                            <td>Rs ${(s.quantitySold * s.rate).toFixed(2)}</td>
                            <td class="${profitClass}">Rs ${s.profit.toFixed(2)}</td>
                            <td class="refund-status">${s.refundStatus || 'none'}</td>
                            <td class="refund-quantity">${s.refundQuantity || 0}</td>
                            <td>${dateStr}<br><small style="color:#007bff; font-weight:bold;">${timeStr}</small></td>
                            ${window.role === "admin" ? `<td><button class="delete-sale delete-btn" data-id="${s._id}" id="delete" >Delete</button></td>` : ''}
                        </tr>`;
                    });
                }

                tbody.innerHTML = html;
                // ⬇️ CHANGE 2: Delete ke baad select-all checkbox ko reset karne ke liye
            const selectAllCb = document.getElementById('selectAll'); 
            if (selectAllCb) selectAllCb.checked = false;

                attachDelete();
            }

        } catch (e) {
            console.error("Fetch Error:", e);
        } finally {
            if (loader) loader.style.display = 'none';
            if (tbody)  tbody.style.opacity  = '1';
            if (tableContainer) tableContainer.classList.remove('loading-active');
        }
    }


    // =========================================
    // 7. PAGINATION EVENTS
    // =========================================

    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            if (currentPage > 1) { currentPage--; updateTable(); }
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            currentPage++; updateTable();
        });
    }

    if (limitSelect) {
        limitSelect.addEventListener('change', () => {
            currentLimit = parseInt(limitSelect.value);
            currentPage  = 1;
            updateTable();
        });
    }


    // =========================================
    // 8. FILTER EVENTS
    // =========================================

    brandFilter.addEventListener('change', () => {
        currentPage = 1;
        itemFilter.setAttribute('data-selected', 'all');
        syncDropdowns();
        updateTable();
    });

    itemFilter.addEventListener('change', () => {
        currentPage = 1;
        colourFilter.setAttribute('data-selected', 'all');
        syncColours();
        updateTable();
    });

    [colourFilter, unitFilter, refundFilter].forEach(el => {
        if (el) el.addEventListener('change', () => {
            currentPage = 1;
            updateTable();
        });
    });

    if (filterSelect) {
        filterSelect.addEventListener('change', () => {
            currentPage = 1;
            toggleCustomDates();
            if (filterSelect.value !== 'custom') updateTable();
        });
    }

    if (applyBtn) {
        applyBtn.addEventListener('click', (e) => {
            e.preventDefault();
            currentPage = 1;
            updateTable();
        });
    }



// =========================================
// SELECT ALL (SALES TABLE)
// =========================================
if (selectAll) {
    selectAll.addEventListener('change', (e) => {
        document.querySelectorAll('.row-checkbox').forEach(cb => {
            cb.checked = e.target.checked;
        });
    });
}



// =========================================
// SALES BULK DELETE
// =========================================

const bulkDeleteBtn = document.getElementById('bulkDeleteBtn');

if (bulkDeleteBtn) {
    bulkDeleteBtn.onclick = async () => {
        // Checkboxes se selected IDs nikalna
        const selected = Array.from(
            document.querySelectorAll('.row-checkbox:checked')
        ).map(cb => cb.value);

        if (selected.length === 0) {
            return alert("Pehle sales select karein!");
        }

        if (!confirm(`⚠️ Kya aap in ${selected.length} sales ko delete karna chahte hain? Yeh wapas nahi aayenge!`)) {
            return;
        }

        try {
            // URL ko sales ke endpoint par hit kiya
            const res = await fetch('/sales/delete-bulk', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: selected })
            });

            const data = await res.json();

            if (data.success) {
                alert("✅ " + data.message);
                currentPage = 1; // Page reset
                updateTable();   // Sales table refresh ho jayega
            } else {
                alert("❌ " + data.message);
            }
        } catch (err) {
            alert("❌ Error deleting sales.");
        }
    };
}


    // =========================================
    // 9. DELETE
    // =========================================

    function attachDelete() {
        document.querySelectorAll('.delete-sale').forEach(btn => {
            btn.onclick = async () => {
                if (!confirm("⚠️ Are you sure you want to delete this sale record?")) return;
                try {
                    const res  = await fetch(`/sales/delete-sale/${btn.dataset.id}`, {
                        method: 'DELETE',
                        headers: { 'Content-Type': 'application/json' }
                    });
                    const data = await res.json();
                    if (data.success) {
                        alert("✅ Sale deleted successfully!");
                        updateTable();
                    } else {
                        alert("❌ Error: " + (data.message || "Could not delete sale"));
                    }
                } catch (err) {
                    console.error("Delete Error:", err);
                    alert("❌ Server error! Please try again.");
                }
            };
        });
    }


    // =========================================
    // 10. INITIAL LOAD
    // =========================================

    toggleCustomDates();
    syncDropdowns(true);
    attachDelete();

    if (limitSelect) limitSelect.value = currentLimit;

    updatePaginationUI({
        page:       currentPage,
        limit:      currentLimit,
        totalCount: _totalCount,
        totalPages: _totalPages,
        hasPrev:    currentPage > 1,
        hasNext:    currentPage < _totalPages
    });

});