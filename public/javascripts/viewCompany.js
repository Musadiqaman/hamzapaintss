document.addEventListener("DOMContentLoaded", () => {

    // =============================================
    // 1. ELEMENTS
    // =============================================
    const filterSelect = document.getElementById("filter");
    const fromInput    = document.getElementById("from");
    const toInput      = document.getElementById("to");
    const applyBtn     = document.getElementById("apply");
    const tbody        = document.getElementById("companyTableBody");
    const tableLoader  = document.getElementById("tableLoader");

    const editModal    = document.getElementById("editModal");
    const historyModal = document.getElementById("historyModal");
    const editAgentBtn = document.getElementById("editAgentBtn");

    // Company ID URL se nikalo
    const pathParts   = window.location.pathname.split('/');
    const companyId   = pathParts[pathParts.length - 1];

    // =============================================
    // 2. DATE INPUTS TOGGLE
    // =============================================
    const toggleDates = () => {
        const isCustom = filterSelect.value === "custom";
        if (fromInput) fromInput.style.display = isCustom ? "inline-block" : "none";
        if (toInput)   toInput.style.display   = isCustom ? "inline-block" : "none";
    };

    // =============================================
    // 3. FETCH DATA
    // =============================================
    const fetchData = async () => {
        if (!companyId || companyId.length < 15) return console.error("Invalid Company ID");

        const filterVal = filterSelect.value;
        let paramsObj = { filter: filterVal };
        if (filterVal === "custom") {
            paramsObj.from = fromInput.value;
            paramsObj.to   = toInput.value;
        }

        const params = new URLSearchParams(paramsObj).toString();

        if (tableLoader) tableLoader.style.display = "flex";
        tbody.style.opacity = "0.3";

        try {
            const response = await fetch(`/company/view/${companyId}?${params}`, {
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'Accept': 'application/json'
                }
            });
            const data = await response.json();

            if (data.success) {

                // 1. Stats update
             document.getElementById("stat-total").innerText = `Rs ${Number(data.stats.totalOutstandingAmount).toFixed(2)}`;
             document.getElementById("stat-paid").innerText  = `Rs ${Number(data.stats.totalOutstandingAmountGiven).toFixed(2)}`;
            document.getElementById("stat-left").innerText  = `Rs ${Number(data.stats.totalOutstandingAmountLeft).toFixed(2)}`;

                // 2. Table rows
                let html = '';

                if (!data.company.items || data.company.items.length === 0) {
                    html = `<tr><td colspan="7" style="text-align:center; padding:20px;">No records found.</td></tr>`;
                } else {
                    data.company.items.forEach(i => {
                        const dateObj = new Date(i.createdAt);
                        const pkrDate = dateObj.toLocaleDateString('en-GB',  { timeZone: 'Asia/Karachi' });
                        const pkrTime = dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Karachi' });

                        const status  = i.paidAmount >= i.totalProductAmount ? 'Paid' : (i.paidAmount > 0 ? 'Partially' : 'Unpaid');
                        const leftAmt = (Number(i.totalProductAmount) - Number(i.paidAmount)).toFixed(2);

                        const billLink = i.billId
                            ? `<a href="/products/bill/${i.billId._id}" style="display:block; font-size:11px; color:#2196F3; font-weight:bold; text-decoration:none; margin-top:5px;">📄 View Bill</a>`
                            : `<small style="display:block; font-size:11px; color:#999; margin-top:5px; font-weight:bold;">No Bill</small>`;

                        html += `
                        <tr id="row-${i._id}">
                            <td>${i.totalProductBuy}</td>
                            <td>Rs ${Number(i.totalProductAmount).toFixed(2)}</td>
                            <td class="paid-status"><span class="status-tag">${status}</span></td>
                            <td style="color: #8B5CF6 ; font-weight:bold;" >Rs ${Number(i.paidAmount).toFixed(2)}</td>
                            <td style="color:red; font-weight:bold;">Rs ${leftAmt}</td>
                            <td>
                                <div>${pkrDate}</div>
                                <small style="color:#2196F3; font-weight:bold;">${pkrTime}</small>
                                ${billLink}
                            </td>
                            <td class="actions">
                                <button class="pay-btn" data-id="${i._id}">Pay</button>
                                ${data.role === "admin" ? `<button class="delete-btn" data-id="${i._id}">Delete</button>` : ''}
                                <div class="pay-box" id="paybox-${i._id}" style="display:none; margin-top:5px;">
                                    <input class="payinput" type="number" id="payInput-${i._id}" style="width:70px" placeholder="Rs">
                                    <button class="submit-pay-btn" data-id="${i._id}" id="submit" >Submit</button>
                                </div>
                            </td>
                        </tr>`;
                    });
                }

                tbody.innerHTML = html;
                rebindButtons();
            }

        } catch (err) {
            console.error("Fetch error:", err);
        } finally {
            if (tableLoader) tableLoader.style.display = "none";
            tbody.style.opacity = "1";
        }
    };

    // =============================================
    // 4. REBIND BUTTONS
    // =============================================
    function rebindButtons() {

        // Pay box toggle
        document.querySelectorAll(".pay-btn").forEach(btn => {
            btn.onclick = () => {
                const box = document.getElementById(`paybox-${btn.dataset.id}`);
                box.style.display = box.style.display === "none" ? "block" : "none";
            };
        });

        // Submit payment
        document.querySelectorAll(".submit-pay-btn").forEach(btn => {
            btn.onclick = async () => {
                const id  = btn.dataset.id;
                const amt = document.getElementById(`payInput-${id}`).value;
                if (!amt || amt <= 0) return alert("Please enter a valid amount");

                btn.disabled  = true;
                btn.innerText = "...";

                try {
                    const res = await fetch(`/company/pay-item/${id}`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ amount: parseFloat(amt) })
                    });
                    const result = await res.json();
                    if (result.success) {
                       alert(`✅ Payment Success: Rs ${parseFloat(amt).toFixed(2)}`);
                        fetchData();
                    } else {
                        alert("❌ " + result.message);
                        btn.disabled  = false;
                        btn.innerText = "Submit";
                    }
                } catch (e) {
                    alert("Network Error");
                    btn.disabled  = false;
                    btn.innerText = "Submit";
                }
            };
        });

        // Delete item
        document.querySelectorAll(".delete-btn").forEach(btn => {
            btn.onclick = async () => {
                if (!confirm("Are you sure you want to delete this record?")) return;
                try {
                    const res    = await fetch(`/company/delete-item/${btn.dataset.id}`, { method: "DELETE" });
                    const result = await res.json();
                    if (result.success) {
                        alert("✅ " + result.message);
                        fetchData();
                    } else {
                        alert("Error: " + result.message);
                    }
                } catch (e) {
                    alert("Delete request failed");
                }
            };
        });
    }

    // =============================================
    // 5. EDIT PROFILE
    // =============================================
    if (editAgentBtn) {
        editAgentBtn.onclick = () => editModal.style.display = "flex";
    }

    const saveProfileBtn = document.getElementById("saveAgentBtn");
    if (saveProfileBtn) {
        saveProfileBtn.onclick = async () => {
            const name  = document.getElementById("editName").value;
            const phone = document.getElementById("editPhone").value;

            try {
                const res = await fetch(`/company/update/${companyId}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ name, phone })
                });
                const result = await res.json();
                if (result.success) {
                    alert("✅ Company Profile Updated!");
                    location.reload();
                } else {
                    alert("❌ Update failed: " + result.message);
                }
            } catch (e) {
                alert("Network Error");
            }
        };
    }

    // =============================================
    // 6. PAYMENT HISTORY MODAL
    // =============================================
    const viewHistoryBtn = document.getElementById("viewHistoryBtn");
    if (viewHistoryBtn) {
        viewHistoryBtn.onclick = async () => {
            historyModal.style.display = "flex";
            const hBody = document.getElementById("historyTableBody");
            hBody.innerHTML = '<tr><td colspan="2" style="text-align:center;">⌛ Loading...</td></tr>';

            try {
                const res  = await fetch(`/company/payment-history/${companyId}`);
                const data = await res.json();

                if (data.success && data.history && data.history.length > 0) {
                    hBody.innerHTML = data.history.map(h => {
                        const d       = new Date(h.createdAt);
                        const dateStr = d.toLocaleDateString('en-GB', { timeZone: 'Asia/Karachi' });
                        const timeStr = d.toLocaleTimeString('en-US', {
                            hour: '2-digit', minute: '2-digit',
                            hour12: true, timeZone: 'Asia/Karachi'
                        });

                        return `<tr>
                            <td>${dateStr}<br><small style="color:#2196F3;">${timeStr}</small></td>
                            <td style="color:${h.amountPaid < 0 ? 'red' : 'green'}; font-weight:bold;">
                                Rs ${Number(h.amountPaid).toFixed(2)}
                            </td>
                        </tr>`;
                    }).join('');
                } else {
                    hBody.innerHTML = '<tr><td colspan="2" style="text-align:center; padding:20px;">No history records found.</td></tr>';
                }
            } catch (e) {
                hBody.innerHTML = '<tr><td colspan="2" style="color:red; text-align:center;">Failed to load history</td></tr>';
            }
        };
    }

    // =============================================
    // 7. INIT
    // =============================================
    toggleDates();
    rebindButtons();

    if (applyBtn)      applyBtn.addEventListener("click", fetchData);
    if (filterSelect)  filterSelect.addEventListener("change", toggleDates);

    const closeEdit = document.getElementById("closeEditModal");
    const closeHist = document.getElementById("closeHistoryModal");

    if (closeEdit) closeEdit.onclick = () => editModal.style.display = "none";
    if (closeHist) closeHist.onclick = () => historyModal.style.display = "none";

    window.onclick = (e) => {
        if (e.target == editModal)    editModal.style.display    = "none";
        if (e.target == historyModal) historyModal.style.display = "none";
    };
});


