document.addEventListener("DOMContentLoaded", () => {
    // --- Elements ---
    const filterSelect = document.getElementById("filter");
    const fromInput    = document.getElementById("from");
    const toInput      = document.getElementById("to");
    const applyBtn     = document.getElementById("apply");
    const tbody        = document.getElementById("agentTableBody");
    const tableLoader  = document.getElementById("tableLoader");

    const editModal    = document.getElementById("editModal");
    const historyModal = document.getElementById("historyModal");
    const editAgentBtn = document.getElementById("editAgentBtn");

    // Collective Payment Elements
    const collectiveModal  = document.getElementById("collectiveModal");
    const collectivePayBtn = document.getElementById("collectivePayBtn");
    const closeCollective  = document.getElementById("closeCollectiveModal");
    const submitCollective = document.getElementById("submitCollectivePay");
    const collectiveResult = document.getElementById("collectiveResult");
    const collectiveAmount = document.getElementById("collectiveAmount");

    // Customer ID from URL
    const pathParts  = window.location.pathname.split('/');
    const customerId = pathParts[pathParts.length - 1];

    // Helper: Rs format
    const formatRs = (num) => Number(num).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });

    // Helper: Toggle Custom Date Inputs
    const toggleDates = () => {
        const isCustom = filterSelect.value === "custom";
        if (fromInput) fromInput.style.display = isCustom ? "inline-block" : "none";
        if (toInput)   toInput.style.display   = isCustom ? "inline-block" : "none";
    };

    // Core: Fetch Data & Update Table/Stats
    const fetchData = async () => {
        if (!customerId || customerId.length < 15) return console.error("Invalid Customer ID");

        const filterVal = filterSelect.value;
        let paramsObj   = { filter: filterVal };
        if (filterVal === "custom") {
            paramsObj.from = fromInput.value;
            paramsObj.to   = toInput.value;
        }

        const params = new URLSearchParams(paramsObj).toString();

        if (tableLoader) tableLoader.style.display = "flex";
        tbody.style.opacity = "0.3";

        try {
            const response = await fetch("/customers/view/" + customerId + "?" + params, {
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'Accept': 'application/json'
                }
            });
            const data = await response.json();

            if (data.success) {
                document.getElementById("stat-total").innerText = "Rs " + formatRs(data.stats.totalOutstandingAmount);
                document.getElementById("stat-paid").innerText  = "Rs " + formatRs(data.stats.totalOutstandingAmountGiven);
                document.getElementById("stat-left").innerText  = "Rs " + formatRs(data.stats.totalOutstandingAmountLeft);

                let html = '';
                if (!data.customer.items || data.customer.items.length === 0) {
                    html = '<tr><td colspan="7" style="text-align:center; padding:20px;">No records found.</td></tr>';
                } else {
                    data.customer.items.forEach(function(i) {
                        const dateObj  = new Date(i.createdAt);
                        const pkrDate  = dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Asia/Karachi' });
                        const pkrTime  = dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Karachi' });
                        const status   = i.paidAmount >= i.totalProductAmount ? 'Paid' : (i.paidAmount > 0 ? 'Partially' : 'Unpaid');
                        const leftAmt  = formatRs(Number(i.totalProductAmount) - Number(i.paidAmount));
                        const billLink = i.billId
                            ? '<div style="margin-top:5px;"><a href="/sales/bill/' + i.billId._id + '" style="color:#2196F3; text-decoration:none; font-size:11px; font-weight:bold;">View Bill</a></div>'
                            : '<div style="margin-top:5px;"><small style="color:#999; font-size:11px; font-weight:bold;">No Bill</small></div>';

                        const deleteBtn = data.role === "admin"
                            ? '<button class="delete-btn" data-id="' + i._id + '">Delete</button>'
                            : '';

                        html += '<tr id="row-' + i._id + '">'
                            + '<td>' + i.totalProductSold + '</td>'
                            + '<td>Rs ' + formatRs(i.totalProductAmount || 0) + '</td>'
                            + '<td class="paid-status"><span class="status-tag">' + status + '</span></td>'
                            + '<td style="color:#8B5CF6; font-weight:bold;">Rs ' + formatRs(i.paidAmount || 0) + '</td>'
                            + '<td style="color:red; font-weight:bold;">Rs ' + leftAmt + '</td>'
                            + '<td><div>' + pkrDate + '</div><small style="color:#2196F3; font-weight:bold;">' + pkrTime + '</small>' + billLink + '</td>'
                            + '<td class="actions">'
                            + '<button class="pay-btn" data-id="' + i._id + '">Pay</button>'
                            + deleteBtn
                            + '<div class="pay-box" id="paybox-' + i._id + '" style="display:none; margin-top:5px;">'
                            + '<input class="payinput" type="number" id="payInput-' + i._id + '" style="width:70px" min="1" placeholder="Pay">'
                            + '<button class="submit-pay-btn" data-id="' + i._id + '">Submit</button>'
                            + '</div>'
                            + '</td>'
                            + '</tr>';
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

    // Rebind Buttons
    function rebindButtons() {
        document.querySelectorAll(".pay-btn").forEach(function(btn) {
            btn.onclick = function() {
                const box = document.getElementById("paybox-" + btn.dataset.id);
                box.style.display = box.style.display === "none" ? "block" : "none";
            };
        });

        document.querySelectorAll(".submit-pay-btn").forEach(function(btn) {
            btn.onclick = async function() {
                const id  = btn.dataset.id;
                const amt = document.getElementById("payInput-" + id).value;
                if (!amt || amt <= 0) return alert("Please enter a valid amount");

                btn.disabled  = true;
                btn.innerText = "...";

                try {
                    const res    = await fetch("/customers/pay-item/" + id, {
                        method:  "POST",
                        headers: { "Content-Type": "application/json" },
                        body:    JSON.stringify({ amount: parseFloat(amt) })
                    });
                    const result = await res.json();
                    if (result.success) {
                        alert("Payment Success: Rs " + parseFloat(amt).toLocaleString());
                        fetchData();
                    } else {
                        alert(result.message);
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

        document.querySelectorAll(".delete-btn").forEach(function(btn) {
            btn.onclick = async function() {
                if (!confirm("Are you sure you want to delete this record?")) return;
                try {
                    const res    = await fetch("/customers/delete-item/" + btn.dataset.id, { method: "DELETE" });
                    const result = await res.json();
                    if (result.success) {
                        alert(result.message);
                        fetchData();
                    } else {
                        alert("Error: " + result.message);
                    }
                } catch (e) { alert("Delete request failed"); }
            };
        });
    }

    // Edit Profile
    if (editAgentBtn) {
        editAgentBtn.onclick = function() { editModal.style.display = "flex"; };
    }

    const saveProfileBtn = document.getElementById("saveAgentBtn");
    if (saveProfileBtn) {
        saveProfileBtn.onclick = async function() {
            const name  = document.getElementById("editName").value;
            const phone = document.getElementById("editPhone").value;
            try {
                const res    = await fetch("/customers/update/" + customerId, {
                    method:  "POST",
                    headers: { "Content-Type": "application/json" },
                    body:    JSON.stringify({ name: name, phone: phone })
                });
                const result = await res.json();
                if (result.success) {
                    alert("Customer Profile Updated!");
                    location.reload();
                } else {
                    alert("Update failed: " + result.message);
                }
            } catch (e) { alert("Network Error"); }
        };
    }

    // Payment History Modal
    const viewHistoryBtn = document.getElementById("viewHistoryBtn");
    if (viewHistoryBtn) {
        viewHistoryBtn.onclick = async function() {
            historyModal.style.display = "flex";
            const hBody = document.getElementById("historyTableBody");
            hBody.innerHTML = '<tr><td colspan="2" style="text-align:center;">Loading...</td></tr>';

            try {
                const res  = await fetch("/customers/payment-history/" + customerId);
                const data = await res.json();

                if (data.success && data.history && data.history.length > 0) {

                    // Same 5 seconds ke andar wale records group karo (collective payment)
                    const groups      = [];
                    const usedIndexes = new Set();

                    data.history.forEach(function(h, i) {
                        if (usedIndexes.has(i)) return;
                        const group = [h];
                        usedIndexes.add(i);
                        const t1 = new Date(h.createdAt).getTime();
                        data.history.forEach(function(h2, j) {
                            if (i === j || usedIndexes.has(j)) return;
                            const t2 = new Date(h2.createdAt).getTime();
                            if (Math.abs(t1 - t2) <= 5000) {
                                group.push(h2);
                                usedIndexes.add(j);
                            }
                        });
                        groups.push(group);
                    });

                    // Render groups
                    let html = '';
                    groups.forEach(function(group) {
                        const d       = new Date(group[0].createdAt);
                        const dateStr = d.toLocaleDateString('en-GB', { timeZone: 'Asia/Karachi' });
                        const timeStr = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Karachi' });

                        if (group.length === 1) {
                            // Normal single payment
                            const h = group[0];
                            const color = h.amountPaid < 0 ? 'red' : 'green';
                            html += '<tr>'
                                + '<td style="padding:10px; border-bottom:1px solid #eee;">'
                                + dateStr + '<br><small style="color:#2196F3;">' + timeStr + '</small>'
                                + '</td>'
                                + '<td style="padding:10px; border-bottom:1px solid #eee; font-weight:bold; color:' + color + ';">'
                                + 'Rs ' + Number(h.amountPaid).toFixed(2)
                                + '</td>'
                                + '</tr>';
                        } else {
                            // Collective group — total header + arrow rows
                            const total = group.reduce(function(sum, h) { return sum + Number(h.amountPaid); }, 0);

                            html += '<tr style="background:#e3f2fd;">'
                                + '<td colspan="2" style="padding:8px 12px; font-weight:bold; color:#1565c0; font-size:13px; border-bottom:1px solid #bbdefb;">'
                                + 'Collective &nbsp;|&nbsp; ' + dateStr
                                + ' <small style="color:#1976d2; margin-left:4px;">' + timeStr + '</small>'
                                + ' &nbsp;Total: <span style="color:#0d47a1;">Rs ' + total.toFixed(2) + '</span>'
                                + '</td>'
                                + '</tr>';

                            group.forEach(function(h, idx) {
                                const isLast  = idx === group.length - 1;
                                const arrow   = isLast ? 'L- ' : '|- ';
                                const color   = h.amountPaid < 0 ? 'red' : '#2e7d32';
                                const border  = isLast ? '2px solid #90caf9' : '1px solid #e3f2fd';
                                html += '<tr style="background:#f8fbff;">'
                                    + '<td style="padding:6px 12px 6px 22px; color:#555; font-size:13px; border-bottom:' + border + ';">'
                                    + '<span style="color:#1565c0; font-weight:bold; margin-right:5px;">' + arrow + '</span>'
                                    + 'Bill ' + (idx + 1)
                                    + '</td>'
                                    + '<td style="padding:6px 12px; font-weight:bold; color:' + color + '; font-size:13px; border-bottom:' + border + ';">'
                                    + 'Rs ' + Number(h.amountPaid).toFixed(2)
                                    + '</td>'
                                    + '</tr>';
                            });
                        }
                    });

                    hBody.innerHTML = html;

                } else {
                    hBody.innerHTML = '<tr><td colspan="2" style="text-align:center; padding:20px;">No history records found.</td></tr>';
                }
            } catch (e) {
                hBody.innerHTML = '<tr><td colspan="2" style="color:red; text-align:center;">Failed to load history</td></tr>';
            }
        };
    }

    // Collective Payment Modal
    if (collectivePayBtn) {
        collectivePayBtn.onclick = function() {
            collectiveAmount.value     = "";
            collectiveResult.innerHTML = "";
            collectiveModal.style.display = "flex";
        };
    }

    if (closeCollective) {
        closeCollective.onclick = function() { collectiveModal.style.display = "none"; };
    }

    if (submitCollective) {
        submitCollective.onclick = async function() {
            // Double click block — agar already processing hai to return
            if (submitCollective.disabled) return;

            const amt = parseFloat(collectiveAmount.value);
            if (!amt || amt <= 0) {
                collectiveResult.innerHTML = '<span style="color:red; font-weight:bold;">Valid amount daalo.</span>';
                return;
            }

            submitCollective.disabled      = true;
            submitCollective.style.opacity = "0.6";
            submitCollective.innerText     = "Processing...";
            collectiveResult.innerHTML     = "";

            try {
                const res  = await fetch("/customers/collective-pay/" + customerId, {
                    method:  "POST",
                    headers: { "Content-Type": "application/json" },
                    body:    JSON.stringify({ amount: amt })
                });
                const data = await res.json();

                if (data.success) {
                    collectiveResult.innerHTML = '<p style="color:green; font-weight:bold; margin:0;">' + data.message + '</p>';
                    // Success pe 1.5 sec baad modal band, button reset, table refresh
                    setTimeout(function() {
                        collectiveModal.style.display  = "none";
                        submitCollective.disabled      = false;
                        submitCollective.style.opacity = "1";
                        submitCollective.innerText     = "Submit Payment";
                        fetchData();
                    }, 1500);
                } else {
                    collectiveResult.innerHTML = '<span style="color:red; font-weight:bold;">' + data.message + '</span>';
                    // Error pe foran re-enable
                    submitCollective.disabled      = false;
                    submitCollective.style.opacity = "1";
                    submitCollective.innerText     = "Submit Payment";
                }
            } catch (err) {
                console.error(err);
                collectiveResult.innerHTML = '<span style="color:red; font-weight:bold;">Network error.</span>';
                submitCollective.disabled      = false;
                submitCollective.style.opacity = "1";
                submitCollective.innerText     = "Submit Payment";
            }
        };
    }

    // Initialization
    toggleDates();
    rebindButtons();

    if (applyBtn)     applyBtn.addEventListener("click", fetchData);
    if (filterSelect) filterSelect.addEventListener("change", toggleDates);

    // Modal close buttons
    const closeEdit = document.getElementById("closeEditModal");
    const closeHist = document.getElementById("closeHistoryModal");
    if (closeEdit) closeEdit.onclick = function() { editModal.style.display = "none"; };
    if (closeHist) closeHist.onclick = function() { historyModal.style.display = "none"; };

    // Outside click se teeno modals band
    window.onclick = function(e) {
        if (e.target === editModal)       editModal.style.display       = "none";
        if (e.target === historyModal)    historyModal.style.display    = "none";
        if (e.target === collectiveModal) collectiveModal.style.display = "none";
    };
});

