document.addEventListener('DOMContentLoaded', () => {
    const filterSelect = document.getElementById('filter');
    const agentFilter = document.getElementById('agentFilter');
    const fromInput = document.getElementById('from');
    const toInput = document.getElementById('to');
    const applyBtn = document.getElementById('apply');
    const tableBody = document.getElementById('tableBody');
    const loader = document.getElementById('table-loader');
    const tableWrapper = document.getElementById('tableWrapper');

    // 1. Show/Hide Custom Dates
    filterSelect.addEventListener('change', () => {
        if (filterSelect.value === 'custom') {
            fromInput.style.display = 'inline-block';
            toInput.style.display = 'inline-block';
        } else {
            fromInput.style.display = 'none';
            toInput.style.display = 'none';
        }
    });

    // 2. Fetch Data Function (AJAX)
  async function fetchFilteredData() {
    loader.style.display = 'flex';
    tableWrapper.classList.add('loading-active');

    const filter = filterSelect.value;
    const agentId = agentFilter.value;
    const from = fromInput.value;
    const to = toInput.value;

    try {
        const url = `/sales/history?filter=${filter}&agentId=${agentId}&from=${from}&to=${to}&ajax=true`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.success) {
            // Browser URL clean rakho
            window.history.replaceState(null, '', '/sales/history');

            // Stats Update
            document.getElementById('totalBillsCount').innerText = data.history.length;
            document.getElementById('totalRevenueText').innerText = `Rs ${data.totalRevenue.toFixed(2)}`;

            // Table Rows Build karo
            let rows = '';
            if (!data.history || data.history.length === 0) {
                rows = '<tr><td colspan="6" class="no-data" style="text-align:center; padding:20px;">No history found.</td></tr>';
            } else {
                data.history.forEach(bill => {
                    // 1. Total Amount Calculation
                    let billTotal = bill.salesItems.reduce((acc, item) => {
    // Actual Qty = Jitni bechi thi - Jitni wapas (refund) hui
    const actualQty = (item.quantitySold || 0) - (item.refundQuantity || 0);
    return acc + (actualQty * (item.rate || 0));
}, 0);
                    
                    // 2. Pakistan Timezone Fix (Deployment ke liye zaroori hai)
                    const dateObj = new Date(bill.createdAt);
                    const pkrDate = dateObj.toLocaleDateString('en-GB', { 
                        day: '2-digit', 
                        month: '2-digit', 
                        year: 'numeric', 
                        timeZone: 'Asia/Karachi' 
                    });
                    const pkrTime = dateObj.toLocaleTimeString('en-US', { 
                        hour: '2-digit', 
                        minute: '2-digit', 
                        hour12: true, 
                        timeZone: 'Asia/Karachi' 
                    }).toUpperCase();

                    // 3. Agent Tag Logic
                    const agent = bill.agentId 
                        ? `<span class="agent-tag">${bill.agentId.name}</span>` 
                        : '<small>Direct Sale</small>';

                    // 4. Row HTML (Delete button wapas shamil hai)
                    rows += `
                        <tr>
                            <td>
                                ${pkrDate} <br> 
                                <small style="color: #007bff; font-weight: bold;">${pkrTime}</small>
                            </td>
                            <td class="customer-name">${bill.customerName}</td>
                            <td>${bill.salesItems.length} Items</td>
                            <td style="font-weight: bold; color: #06A56C;">Rs ${billTotal.toFixed(2)}</td>
                            <td>${agent}</td>
                            <td>
                                <button type="button" class="view-btn action-btn" data-id="${bill._id}" id="view">View</button>
                                <button type="button" class="delete-btn action-btn" data-id="${bill._id}" id="delete" >Delete</button>
                            </td>
                        </tr>`;
                });
            }
            tableBody.innerHTML = rows;
        }
    } catch (err) {
        console.error("Fetch Error:", err);
        alert("❌ Error loading data.");
    } finally {
        loader.style.display = 'none';
        tableWrapper.classList.remove('loading-active');
    }
}

    // 3. Apply Button Click
    applyBtn.addEventListener('click', fetchFilteredData);

    // 4. View & Delete (Event Delegation)
    document.addEventListener('click', async (e) => {
        const id = e.target.getAttribute('data-id');
        if (!id) return;

        if (e.target.classList.contains('view-btn')) {
            window.location.href = `/sales/bill/${id}`;
        }

        if (e.target.classList.contains('delete-btn')) {
    if (confirm("⚠️ Delete this bill?")) {
        try {
            const res = await fetch(`/sales/delete-bill/${id}`, { method: 'DELETE' });
            
            // 1. Pehle status check karein (403 = Access Denied)
            if (res.status === 403) {
                const errorData = await res.json();
                alert("❌ " + errorData.message); // Worker ko message dikhayega
                return; // Yahin ruk jayein
            }

            const result = await res.json();
            
            // 2. Agar success hai toh reload karein
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
}
    });
});

