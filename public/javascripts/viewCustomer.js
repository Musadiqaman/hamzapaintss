document.addEventListener("DOMContentLoaded", () => {
    // --- Elements ---
    const filterSelect = document.getElementById("filter");
    const fromInput = document.getElementById("from");
    const toInput = document.getElementById("to");
    const applyBtn = document.getElementById("apply");
    const tbody = document.getElementById("agentTableBody"); // Table body ID
    const tableLoader = document.getElementById("tableLoader");
    
    const editModal = document.getElementById("editModal");
    const historyModal = document.getElementById("historyModal");
    const editAgentBtn = document.getElementById("editAgentBtn"); 

    // ✅ Get Customer ID from URL
    const pathParts = window.location.pathname.split('/');
    const customerId = pathParts[pathParts.length - 1];

    // --- Helper: Rs format with 2 decimals + thousand separators ---
    const formatRs = (num) => Number(num).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });

    // --- Helper: Toggle Custom Date Inputs ---
    const toggleDates = () => {
        const isCustom = filterSelect.value === "custom";
        if (fromInput) fromInput.style.display = isCustom ? "inline-block" : "none";
        if (toInput) toInput.style.display = isCustom ? "inline-block" : "none";
    };

    // --- Core: Fetch Data & Update Table/Stats ---
    const fetchData = async () => {
        if (!customerId || customerId.length < 15) return console.error("Invalid Customer ID");
        
        const filterVal = filterSelect.value;
        let paramsObj = { filter: filterVal };
        if (filterVal === "custom") {
            paramsObj.from = fromInput.value;
            paramsObj.to = toInput.value;
        }

        const params = new URLSearchParams(paramsObj).toString();
        
        // Show Loader
        if (tableLoader) tableLoader.style.display = "flex";
        tbody.style.opacity = "0.3";

        try {
            const response = await fetch(`/customers/view/${customerId}?${params}`, {
                headers: { 
                    'X-Requested-With': 'XMLHttpRequest', 
                    'Accept': 'application/json' 
                }
            });
            const data = await response.json();

            if (data.success) {
                // 1. Update Stats Cards
                document.getElementById("stat-total").innerText = `Rs ${formatRs(data.stats.totalOutstandingAmount)}`;
                document.getElementById("stat-paid").innerText = `Rs ${formatRs(data.stats.totalOutstandingAmountGiven)}`;
                document.getElementById("stat-left").innerText = `Rs ${formatRs(data.stats.totalOutstandingAmountLeft)}`;

                // 2. Build Table Rows
                let html = '';
                if (!data.customer.items || data.customer.items.length === 0) {
                    html = `<tr><td colspan="7" style="text-align:center; padding:20px;">No records found.</td></tr>`;
                } else {
                    data.customer.items.forEach(i => {
                        const dateObj = new Date(i.createdAt);
                        const pkrDate = dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Asia/Karachi' });
                        const pkrTime = dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Karachi' });
                        
                        const status = i.paidAmount >= i.totalProductAmount ? 'Paid' : (i.paidAmount > 0 ? 'Partially' : 'Unpaid');
                        const leftAmt = formatRs(Number(i.totalProductAmount) - Number(i.paidAmount));
                        
                        const billLink = i.billId 
                            ? `<div style="margin-top: 5px;"><a href="/sales/bill/${i.billId._id}" style="color: #2196F3; text-decoration: none; font-size: 11px; font-weight: bold;">📄 View Bill</a></div>`
                            : `<div style="margin-top: 5px;"><small style="color: #999; font-size: 11px; font-weight: bold;">No Bill</small></div>`;

                        html += `
                        <tr id="row-${i._id}">
                            <td>${i.totalProductSold}</td>
                            <td>Rs ${formatRs(i.totalProductAmount || 0)}</td>
                            <td class="paid-status"><span class="status-tag">${status}</span></td>
                            <td style="color: #8B5CF6 ; font-weight:bold;" >Rs ${formatRs(i.paidAmount || 0)}</td>
                            <td style="color:red; font-weight:bold;" >Rs ${leftAmt}</td>
                            <td>
                                <div>${pkrDate}</div>
                                <small style="color: #2196F3; font-weight: bold;">${pkrTime}</small>
                                ${billLink}
                            </td>
                            <td class="actions">
                                <button class="pay-btn" data-id="${i._id}">Pay</button>
                                ${data.role === "admin" ? `<button class="delete-btn" data-id="${i._id}">Delete</button>` : ''}
                                <div class="pay-box" id="paybox-${i._id}" style="display:none; margin-top:5px;">
                                    <input class="payinput" type="number" id="payInput-${i._id}" style="width:70px" min="1" placeholder="Pay">
                                    <button class="submit-pay-btn" data-id="${i._id}" id="submit">Submit</button>
                                </div>
                            </td>
                        </tr>`;
                    });
                }
                tbody.innerHTML = html;
                rebindButtons(); // Re-attach listeners to new elements
            }
        } catch (err) { 
            console.error("Fetch error:", err); 
        } finally { 
            if (tableLoader) tableLoader.style.display = "none"; 
            tbody.style.opacity = "1"; 
        }
    };

    // --- Rebind Event Listeners (For dynamic content) ---
    function rebindButtons() {
        // Toggle Pay Box
        document.querySelectorAll(".pay-btn").forEach(btn => {
            btn.onclick = () => {
                const box = document.getElementById(`paybox-${btn.dataset.id}`);
                box.style.display = box.style.display === "none" ? "block" : "none";
            };
        });

        // Submit Individual Item Payment
        document.querySelectorAll(".submit-pay-btn").forEach(btn => {
            btn.onclick = async () => {
                const id = btn.dataset.id;
                const amt = document.getElementById(`payInput-${id}`).value;
                if (!amt || amt <= 0) return alert("Please enter a valid amount");

                btn.disabled = true;
                btn.innerText = "...";

                try {
                    const res = await fetch(`/customers/pay-item/${id}`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ amount: parseFloat(amt) })
                    });
                    const result = await res.json();
                    if (result.success) {
                        alert(`✅ Payment Success: Rs ${parseFloat(amt).toLocaleString()}`);
                        fetchData(); // Refresh table and stats
                    } else {
                        alert("❌ " + result.message);
                        btn.disabled = false;
                        btn.innerText = "Submit";
                    }
                } catch (e) { 
                    alert("Network Error"); 
                    btn.disabled = false; 
                    btn.innerText = "Submit";
                }
            };
        });

        // Delete Item
        document.querySelectorAll(".delete-btn").forEach(btn => {
            btn.onclick = async () => {
                if (!confirm("Are you sure you want to delete this record?")) return;
                try {
                    const res = await fetch(`/customers/delete-item/${btn.dataset.id}`, { method: "DELETE" });
                    const result = await res.json();
                    if (result.success) {
                        alert("✅ " + result.message);
                        fetchData();
                    } else {
                        alert("Error: " + result.message);
                    }
                } catch (e) { alert("Delete request failed"); }
            };
        });
    }

    // --- Profile Update Logic ---
    if(editAgentBtn) {
        editAgentBtn.onclick = () => editModal.style.display = "flex";
    }

    const saveProfileBtn = document.getElementById("saveAgentBtn");
    if(saveProfileBtn) {
        saveProfileBtn.onclick = async () => {
            const name = document.getElementById("editName").value;
            const phone = document.getElementById("editPhone").value;
            
            try {
                const res = await fetch(`/customers/update/${customerId}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ name, phone })
                });
                const result = await res.json();
                if(result.success) { 
                    alert("✅ Customer Profile Updated!"); 
                    location.reload(); 
                } else {
                    alert("❌ Update failed: " + result.message);
                }
            } catch (e) { alert("Network Error"); }
        };
    }

// --- Global Payment History Modal ---
const viewHistoryBtn = document.getElementById("viewHistoryBtn");
if(viewHistoryBtn) {
    viewHistoryBtn.onclick = async () => {
        historyModal.style.display = "flex";
        const hBody = document.getElementById("historyTableBody");
        hBody.innerHTML = '<tr><td colspan="2" style="text-align:center;">⌛ Loading...</td></tr>';
        
        try {
            const res = await fetch(`/customers/payment-history/${customerId}`); 
            const data = await res.json();
            
            if(data.success && data.history && data.history.length > 0) {
                hBody.innerHTML = data.history.map(h => {
                    const d = new Date(h.createdAt);
                    
                    const dateStr = d.toLocaleDateString('en-GB', { timeZone: 'Asia/Karachi' });
                    const timeStr = d.toLocaleTimeString('en-US', {
                        hour: '2-digit', 
                        minute: '2-digit',
                        hour12: true,
                        timeZone: 'Asia/Karachi'
                    });

                    return `<tr>
                        <td>${dateStr} <br><small style="color:#2196F3;">${timeStr}</small></td>
                        <td style="color: ${h.amountPaid < 0 ? 'red' : 'green'}; font-weight: bold;">
    Rs ${Number(h.amountPaid).toFixed(2)}
</td>
                    </tr>`;
                }).join('');
            } else { 
                hBody.innerHTML = '<tr><td colspan="2" style="text-align:center; padding:20px;">No history records found.</td></tr>'; 
            }
        } catch(e) { 
            hBody.innerHTML = '<tr><td colspan="2" style="color:red; text-align:center;">Failed to load history</td></tr>'; 
        }
    };
}


    // --- Initialization & UI Events ---
    toggleDates();
    rebindButtons(); // Initial bind for server-rendered HTML
    
    if (applyBtn) applyBtn.addEventListener("click", fetchData);
    if (filterSelect) filterSelect.addEventListener("change", toggleDates);

    // Modal Close Triggers
    const closeEdit = document.getElementById("closeEditModal");
    const closeHist = document.getElementById("closeHistoryModal");
    
    if(closeEdit) closeEdit.onclick = () => editModal.style.display = "none";
    if(closeHist) closeHist.onclick = () => historyModal.style.display = "none";

    // Close modal on outside click
    window.onclick = (e) => { 
        if(e.target == editModal) editModal.style.display = "none"; 
        if(e.target == historyModal) historyModal.style.display = "none"; 
    };
});