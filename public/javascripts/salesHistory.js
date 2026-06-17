document.addEventListener('DOMContentLoaded', () => {

    // ── Original Elements ──────────────────────────
    const filterSelect  = document.getElementById('filter');
    const agentFilter   = document.getElementById('agentFilter');
    const fromInput     = document.getElementById('from');
    const toInput       = document.getElementById('to');
    const applyBtn      = document.getElementById('apply');
    const tableBody     = document.getElementById('tableBody');
    const loader        = document.getElementById('table-loader');
    const tableWrapper  = document.getElementById('tableWrapper');
    const searchBtn     = document.getElementById('searchBillBtn');
    const searchInput   = document.getElementById('billSearchInput');

    // ── Pagination Elements ────────────────────────
    const prevBtn      = document.getElementById('prevPage');
    const nextBtn      = document.getElementById('nextPage');
    const pageInfo     = document.getElementById('pageInfo');
    const limitSelect  = document.getElementById('limitSelect');
    const showingFrom  = document.getElementById('showingFrom');
    const showingTo    = document.getElementById('showingTo');
    const totalCount   = document.getElementById('totalCount');
    const totalBillsCount  = document.getElementById('totalBillsCount');
    const totalRevenueText = document.getElementById('totalRevenueText');

   const __INIT__ = JSON.parse(document.getElementById('__initData__').textContent);
const role = __INIT__.role;
let state = {
    page:       __INIT__.currentPage,
    totalPages: __INIT__.totalPages,
    totalDocs:  __INIT__.totalDocs,
    limit:      __INIT__.limit,
    filter:     __INIT__.filter,
    agentId:    __INIT__.agentId,
    from:       __INIT__.from,
    to:         __INIT__.to,
};

    // Init pagination display
    updatePaginationUI();

    // ── Show/Hide Custom Dates (original) ──────────
    filterSelect.addEventListener('change', () => {
        if (filterSelect.value === 'custom') {
            fromInput.style.display = 'inline-block';
            toInput.style.display   = 'inline-block';
        } else {
            fromInput.style.display = 'none';
            toInput.style.display   = 'none';
        }
    });

    // ── ORIGINAL: Search Bill by ID (/findbill) ────
    async function findBill() {
        const billID = searchInput.value.trim();
        if (!billID) return alert("Please enter a Bill ID");

        loader.style.display = 'flex';
        tableWrapper.classList.add('loading-active');

        try {
            const response = await fetch(`/sales/findbill?billID=${encodeURIComponent(billID)}`);
            const data = await response.json();

            if (data.success) {
                totalBillsCount.innerText  = data.count;
                totalRevenueText.innerText = `Rs ${data.totalRevenue.toFixed(2)}`;

                // Pagination hide karo findbill results mein
                document.querySelector('.pagination-container').style.display = 'none';

                if (!data.history || data.history.length === 0) {
                    tableBody.innerHTML = `
                        <tr>
                            <td colspan="7" style="text-align:center;padding:40px;color:#dc3545;font-weight:bold;">
                                ⚠️ Bill ID "${billID}" Not Found!
                            </td>
                        </tr>`;
                } else {
                    tableBody.innerHTML = data.history.map(bill => {
                        let billTotal = bill.salesItems.reduce((acc, item) => {
                            const actualQty = (item.quantitySold || 0) - (item.refundQuantity || 0);
                            return acc + (actualQty * (item.rate || 0));
                        }, 0);
                        const dateObj = new Date(bill.createdAt);
                        const pkrDate = dateObj.toLocaleDateString('en-GB', { day:'2-digit', month:'2-digit', year:'numeric', timeZone:'Asia/Karachi' });
                        const pkrTime = dateObj.toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit', hour12:true, timeZone:'Asia/Karachi' }).toUpperCase();
                        const agent = bill.agentId
                            ? `<span class="agent-tag">${bill.agentId.name}</span>`
                            : '<small>Direct Sale</small>';
                        const deleteBtn = role === 'admin'
                            ? `<button type="button" class="delete-btn action-btn" data-id="${bill._id}" id="delete" >Delete</button>`
                            : '';

                        return `
                            <tr>
                                <td>${pkrDate}<br><small style="color:#007bff;font-weight:bold;">${pkrTime}</small></td>
                                <td class="customer-name" style="font-weight:bold;">${bill.billID}</td>
                                <td class="customer-name">${bill.customerName}</td>
                                <td>${bill.salesItems.length} Items</td>
                                <td style="font-weight:bold;color:#06A56C;">Rs ${billTotal.toFixed(2)}</td>
                                <td>${agent}</td>
                                <td>
                                    <button type="button" class="view-btn action-btn" data-id="${bill._id}" id="view" >View</button>
                                    ${deleteBtn}
                                </td>
                            </tr>`;
                    }).join('');
                }
            }
        } catch (err) {
            console.error("Search Error:", err);
            alert("❌ Error searching bill.");
        } finally {
            loader.style.display = 'none';
            tableWrapper.classList.remove('loading-active');
        }
    }

    // ── Fetch History with Pagination ──────────────
    async function fetchFilteredData() {
        loader.style.display = 'flex';
        tableWrapper.classList.add('loading-active');

        // Pagination wapas dikhao
        document.querySelector('.pagination-container').style.display = '';

        const params = new URLSearchParams({
            filter:  state.filter,
            agentId: state.agentId,
            from:    state.from,
            to:      state.to,
            page:    state.page,
            limit:   state.limit,
            ajax:    'true'
        });

        try {
            const response = await fetch(`/sales/history?${params}`);
            const data     = await response.json();

            if (!data.success) return alert("❌ Error loading data.");

            state.totalPages = data.totalPages;
            state.totalDocs  = data.totalDocs;

            totalBillsCount.innerText  = data.totalDocs;
            totalRevenueText.innerText = `Rs ${data.totalRevenue.toFixed(2)}`;

            if (!data.history || data.history.length === 0) {
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="7" class="no-data" style="text-align:center;padding:20px;">
                            No history found.
                        </td>
                    </tr>`;
            } else {
                tableBody.innerHTML = data.history.map(bill => {
                    const billTotal = bill.salesItems.reduce((acc, item) => {
                        const actualQty = (item.quantitySold || 0) - (item.refundQuantity || 0);
                        return acc + (actualQty * (item.rate || 0));
                    }, 0);
                    const dateObj = new Date(bill.createdAt);
                    const pkrDate = dateObj.toLocaleDateString('en-GB', { day:'2-digit', month:'2-digit', year:'numeric', timeZone:'Asia/Karachi' });
                    const pkrTime = dateObj.toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit', hour12:true, timeZone:'Asia/Karachi' }).toUpperCase();
                    const agent = bill.agentId
                        ? `<span class="agent-tag">${bill.agentId.name}</span>`
                        : '<small>Direct Sale</small>';
                    const deleteBtn = role === 'admin'
                        ? `<button type="button" class="delete-btn action-btn" data-id="${bill._id}" id="delete" >Delete</button>`
                        : '';

                    return `
                        <tr>
                            <td>${pkrDate}<br><small style="color:#007bff;font-weight:bold;">${pkrTime}</small></td>
                            <td class="customer-name" style="font-weight:bold;">${bill.billID}</td>
                            <td class="customer-name">${bill.customerName}</td>
                            <td>${bill.salesItems.length} Items</td>
                            <td style="font-weight:bold;color:#06A56C;">Rs ${billTotal.toFixed(2)}</td>
                            <td>${agent}</td>
                            <td>
                                <button type="button" class="view-btn action-btn" data-id="${bill._id}" id="view" >View</button>
                                ${deleteBtn}
                            </td>
                        </tr>`;
                }).join('');
            }

            updatePaginationUI();

        } catch (err) {
            console.error("Fetch Error:", err);
            alert("❌ Error loading data.");
        } finally {
            loader.style.display = 'none';
            tableWrapper.classList.remove('loading-active');
        }
    }

    // ── Pagination UI ──────────────────────────────
    function updatePaginationUI() {
        const from = state.totalDocs === 0 ? 0 : (state.page - 1) * state.limit + 1;
        const to   = Math.min(state.page * state.limit, state.totalDocs);

        showingFrom.innerText = from;
        showingTo.innerText   = to;
        totalCount.innerText  = state.totalDocs;
        pageInfo.innerText    = `Page ${state.page} of ${state.totalPages || 1}`;

        prevBtn.disabled = state.page <= 1;
        nextBtn.disabled = state.page >= state.totalPages;
    }

    // ── Event Listeners ────────────────────────────
    applyBtn.addEventListener('click', () => {
        state.filter  = filterSelect.value;
        state.agentId = agentFilter.value;
        state.from    = fromInput.value;
        state.to      = toInput.value;
        state.page    = 1;
        searchInput.value = '';
        fetchFilteredData();
    });

    searchBtn.addEventListener('click', findBill);

    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') findBill();
    });

    prevBtn.addEventListener('click', () => {
        if (state.page > 1) {
            state.page--;
            fetchFilteredData();
        }
    });

    nextBtn.addEventListener('click', () => {
        if (state.page < state.totalPages) {
            state.page++;
            fetchFilteredData();
        }
    });

    limitSelect.addEventListener('change', () => {
        state.limit = parseInt(limitSelect.value);
        state.page  = 1;
        fetchFilteredData();
    });

    // ── View & Delete (original logic) ────────────
    document.addEventListener('click', async (e) => {
        const id = e.target.getAttribute('data-id');
        if (!id) return;

        if (e.target.classList.contains('view-btn')) {
            window.location.href = `/sales/bill/${id}`;
        }

        if (e.target.classList.contains('delete-btn')) {
            if (!confirm("⚠️ Delete this bill?")) return;
            try {
                const res = await fetch(`/sales/delete-bill/${id}`, { method: 'DELETE' });
                if (res.status === 403) {
                    const errorData = await res.json();
                    return alert("❌ " + errorData.message);
                }
                const result = await res.json();
                if (result.success) {
                    alert("✅ Deleted!");
                    fetchFilteredData();
                } else {
                    alert("❌ Error: " + result.message);
                }
            } catch (err) {
                console.error(err);
                alert("❌ Server se rabta nahi ho saka.");
            }
        }
    });
});