document.addEventListener("DOMContentLoaded", () => {
    // --- 1. Elements Selection ---
    const filterForm = document.getElementById("filterForm");
    const filterSelect = document.getElementById("filter");
    const fromInput = document.getElementById("from");
    const toInput = document.getElementById("to");
    const applyBtn = document.getElementById("apply");
    const tbody = document.querySelector('tbody');

    /**
     * 2. TOGGLE DATE INPUTS
     */
    function toggleDateInputs(value) {
        if (value === "custom") {
            if (fromInput) fromInput.style.display = "inline-block";
            if (toInput) toInput.style.display = "inline-block";
        } else {
            if (fromInput) fromInput.style.display = "none";
            if (toInput) toInput.style.display = "none";
        }
    }

    /**
     * 3. REFRESH DATA (SPA Filter)
     * Ye function table aur stats ko update karta hai bina reload ke.
     */
    const refreshData = async () => {
        const formData = new URLSearchParams(new FormData(filterForm)).toString();
        tbody.style.opacity = '0.4';

        try {
            const res = await fetch(`${window.location.pathname}?${formData}`, {
                headers: { 
                    'X-Requested-With': 'XMLHttpRequest',
                    'Accept': 'application/json'
                }
            });
            const data = await res.json();

            if (data.success) {
                // --- A. Update Stats ---
                const statsPs = document.querySelectorAll('.stat-box p');
                statsPs[0].innerText = `Rs ${Number(data.stats.totalPercentageAmount).toFixed(2)}`;
                statsPs[1].innerText = `Rs ${Number(data.stats.totalPercentageAmountGiven).toFixed(2)}`;
                statsPs[2].innerText = `Rs ${Number(data.stats.totalPercentageAmountLeft).toFixed(2)}`;

                // --- B. Update Table ---
                let html = '';
                if (!data.agent.items || data.agent.items.length === 0) {
                    html = `<tr><td colspan="9" class="no-data" style="text-align:center; padding:20px;">No items found for the selected filter.</td></tr>`;
                } else {
                    data.agent.items.forEach(i => {
                        const dateObj = new Date(i.createdAt);
                        const dateStr = dateObj.toLocaleDateString('en-GB', { 
                            day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Karachi' 
                        });
                        const timeStr = dateObj.toLocaleTimeString('en-GB', { 
                            hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Karachi' 
                        });

                        const status = i.paidAmount >= i.percentageAmount ? 'Paid' : (i.paidAmount > 0 ? 'Partially' : 'Unpaid');
                        const leftAmt = (Number(i.percentageAmount) - Number(i.paidAmount)).toFixed(2);

                        html += `
                        <tr id="row-${i._id}">
                            <td>${i.totalProductSold}</td>
                            <td>${i.totalProductAmount}</td>
                            <td>${i.percentage}%</td>
                            <td>${i.percentageAmount}</td>
                            <td class="paid-status">${status}</td>
                            <td>Rs ${i.paidAmount}</td>
                            <td>Rs ${leftAmt}</td>
                            <td>${dateStr}<br><small style="color: #007bff; font-weight: bold;">${timeStr}</small></td>
                            <td class="actions">
                                <button class="pay-btn" data-id="${i._id}" id="pay">Pay</button>
                                ${data.role === "admin" ? `<button class="delete-btn" data-id="${i._id}">Delete</button>` : ''}
                                <div class="pay-box" id="paybox-${i._id}" style="display:none; margin-top:5px;">
                                    <input class="payinput" type="number" id="payInput-${i._id}" placeholder="Enter Amount" min="1">
                                    <button class="submit-btn" data-id="${i._id}" data-total="${i.percentageAmount}" data-paid="${i.paidAmount}" id="submit">Submit</button>
                                </div>
                            </td>
                        </tr>`;
                    });
                }
                tbody.innerHTML = html;
                
                window.history.pushState({}, '', `${window.location.pathname}?${formData}`);
                attachEventListeners();
            }
        } catch (err) {
            console.error("Filter Error:", err);
        } finally {
            tbody.style.opacity = '1';
        }
    };

    /**
     * 4. ATTACH EVENT LISTENERS (Pay, Submit, Delete)
     */
    function attachEventListeners() {
        // Toggle Pay Box
        document.querySelectorAll(".pay-btn").forEach(btn => {
            btn.onclick = () => {
                const id = btn.dataset.id;
                const box = document.getElementById(`paybox-${id}`);
                box.style.display = box.style.display === "none" ? "block" : "none";
            };
        });

        // Submit Payment (No Reload + Success Message)
        document.querySelectorAll(".submit-btn").forEach(btn => {
            btn.onclick = async () => {
                const id = btn.dataset.id;
                const total = Number(btn.dataset.total);
                const paid = Number(btn.dataset.paid);
                const input = document.getElementById(`payInput-${id}`);
                const addAmount = Number(input.value);

                if (!addAmount || addAmount <= 0) {
                    alert("Please enter a valid amount!");
                    return;
                }
                if (paid + addAmount > total) {
                    alert("❌ Amount exceeds the limit!");
                    return;
                }

                try {
                    const res = await fetch(`/agents/pay-item/${id}`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ amount: addAmount })
                    });
                    const data = await res.json();
                    if (data.success) {
                        // 🟢 Success Message with Amount
                        alert(`✅ Payment Added Successfully!\nAmount Cut: Rs ${addAmount.toFixed(2)}`);
                        refreshData(); 
                    } else {
                        alert("Payment Failed!");
                    }
                } catch (err) { 
                    console.error(err);
                    alert("Error processing payment.");
                }
            };
        });

        // Delete Item (No Reload + Success Message)
        document.querySelectorAll(".delete-btn").forEach(btn => {
            btn.onclick = async () => {
                if (!confirm("Are you sure you want to delete this item?")) return;
                try {
                    const res = await fetch(`/agents/delete-item/${btn.dataset.id}`, { method: "DELETE" });
                    const data = await res.json();
                    if (data.success) {
                        // 🟢 Delete success message
                        alert("🗑️ Item deleted successfully!");
                        refreshData();
                    } else {
                        alert("Failed to delete item.");
                    }
                } catch (err) { 
                    console.error(err);
                    alert("Error deleting item.");
                }
            };
        });
    }

    // --- 5. Initial Event Bindings ---
    if (applyBtn) {
        applyBtn.addEventListener("click", (e) => {
            e.preventDefault();
            refreshData();
        });
    }

    if (filterSelect) {
        filterSelect.addEventListener("change", () => toggleDateInputs(filterSelect.value));
        toggleDateInputs(filterSelect.value);
    }

    // Pehli dafa listeners lagana
    attachEventListeners();
});