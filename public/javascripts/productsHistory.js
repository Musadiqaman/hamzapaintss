document.addEventListener('DOMContentLoaded', () => {

    const filterSelect  = document.getElementById('filter');
    const fromInput     = document.getElementById('from');
    const toInput       = document.getElementById('to');
    const applyBtn      = document.getElementById('apply');
    const tableBody     = document.getElementById('tableBody');
    const loader        = document.getElementById('table-loader');
    const tableWrapper  = document.getElementById('tableWrapper');
    const searchBtn     = document.getElementById('searchBillBtn');
    const searchInput   = document.getElementById('billSearchInput');

    const prevBtn      = document.getElementById('prevPage');
    const nextBtn      = document.getElementById('nextPage');
    const pageInfo     = document.getElementById('pageInfo');
    const limitSelect  = document.getElementById('limitSelect');
    const showingFrom  = document.getElementById('showingFrom');
    const showingTo    = document.getElementById('showingTo');
    const totalCount   = document.getElementById('totalCount');
    const totalBillsCount = document.getElementById('totalBillsCount');
    const totalValueText  = document.getElementById('totalValueText');

    const __INIT__ = JSON.parse(document.getElementById('__initData__').textContent);
    const role = __INIT__.role;
    let state = {
        page:       __INIT__.currentPage,
        totalPages: __INIT__.totalPages,
        totalDocs:  __INIT__.totalDocs,
        limit:      __INIT__.limit,
        filter:     __INIT__.filter,
        from:       __INIT__.from,
        to:         __INIT__.to,
    };

    updatePaginationUI();

    filterSelect.addEventListener('change', () => {
        if (filterSelect.value === 'custom') {
            fromInput.style.display = 'inline-block';
            toInput.style.display   = 'inline-block';
        } else {
            fromInput.style.display = 'none';
            toInput.style.display   = 'none';
        }
    });

    function renderRow(bill) {
        const billTotal = bill.productsItems.reduce((acc, item) => {
            const actualQty = (item.totalProduct || 0) - (item.refundQuantity || 0);
            return acc + (actualQty * (item.rate || 0));
        }, 0);
        const dateObj = new Date(bill.createdAt);
        const pkrDate = dateObj.toLocaleDateString('en-GB', { day:'2-digit', month:'2-digit', year:'numeric', timeZone:'Asia/Karachi' });
        const pkrTime = dateObj.toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit', hour12:true, timeZone:'Asia/Karachi' }).toUpperCase();
        const company = bill.companyId
            ? `<span class="agent-tag">${bill.companyId.name}</span>`
            : '<small>Cash Purchase</small>';
        const deleteBtn = role === 'admin'
            ? `<button type="button" class="delete-btn action-btn" data-id="${bill._id}" id="delete" >Delete</button>`
            : '';

        return `
            <tr>
                <td>${pkrDate}<br><small style="color:#007bff;font-weight:bold;">${pkrTime}</small></td>
                <td class="customer-name" style="font-weight:bold;">${bill.billID}</td>
                <td>${company}</td>
                <td>${bill.productsItems.length} Items</td>
                <td style="font-weight:bold;color:#06A56C;">Rs ${billTotal.toFixed(2)}</td>
                <td>
                    <button type="button" class="view-btn action-btn" data-id="${bill._id}" id="view" >View</button>
                    ${deleteBtn}
                </td>
            </tr>`;
    }

    async function findBill() {
        const billID = searchInput.value.trim();
        if (!billID) return alert("Please enter a Bill ID");

        loader.style.display = 'flex';
        tableWrapper.classList.add('loading-active');

        try {
            const response = await fetch(`/products/findbill?billID=${encodeURIComponent(billID)}`);
            const data = await response.json();

            if (data.success) {
                totalBillsCount.innerText = data.count;
                totalValueText.innerText  = `Rs ${data.totalValue.toFixed(2)}`;

                document.querySelector('.pagination-container').style.display = 'none';

                if (!data.history || data.history.length === 0) {
                    tableBody.innerHTML = `
                        <tr>
                            <td colspan="6" style="text-align:center;padding:40px;color:#dc3545;font-weight:bold;">
                                ⚠️ Bill ID "${billID}" Not Found!
                            </td>
                        </tr>`;
                } else {
                    tableBody.innerHTML = data.history.map(renderRow).join('');
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

    async function fetchFilteredData() {
        loader.style.display = 'flex';
        tableWrapper.classList.add('loading-active');

        document.querySelector('.pagination-container').style.display = '';

        const params = new URLSearchParams({
            filter: state.filter,
            from:   state.from,
            to:     state.to,
            page:   state.page,
            limit:  state.limit,
            ajax:   'true'
        });

        try {
            const response = await fetch(`/products/history?${params}`);
            const data     = await response.json();

            if (!data.success) return alert("❌ Error loading data.");

            state.totalPages = data.totalPages;
            state.totalDocs  = data.totalDocs;

            totalBillsCount.innerText = data.totalDocs;
            totalValueText.innerText  = `Rs ${data.totalValue.toFixed(2)}`;

            if (!data.history || data.history.length === 0) {
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="6" class="no-data" style="text-align:center;padding:20px;">
                            No history found.
                        </td>
                    </tr>`;
            } else {
                tableBody.innerHTML = data.history.map(renderRow).join('');
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

    applyBtn.addEventListener('click', () => {
        state.filter = filterSelect.value;
        state.from   = fromInput.value;
        state.to     = toInput.value;
        state.page   = 1;
        searchInput.value = '';
        fetchFilteredData();
    });

    searchBtn.addEventListener('click', findBill);

    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') findBill();
    });

    prevBtn.addEventListener('click', () => {
        if (state.page > 1) { state.page--; fetchFilteredData(); }
    });

    nextBtn.addEventListener('click', () => {
        if (state.page < state.totalPages) { state.page++; fetchFilteredData(); }
    });

    limitSelect.addEventListener('change', () => {
        state.limit = parseInt(limitSelect.value);
        state.page  = 1;
        fetchFilteredData();
    });

    document.addEventListener('click', async (e) => {
        const id = e.target.getAttribute('data-id');
        if (!id) return;

        if (e.target.classList.contains('view-btn')) {
            window.location.href = `/products/bill/${id}`;
        }

        if (e.target.classList.contains('delete-btn')) {
            if (!confirm("⚠️ Delete this bill?")) return;
            try {
                const res = await fetch(`/products/delete-bill/${id}`, { method: 'DELETE' });
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