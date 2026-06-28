document.addEventListener("DOMContentLoaded", function() {

    var filterSelect    = document.getElementById("filter");
    var fromInput       = document.getElementById("from");
    var toInput         = document.getElementById("to");
    var applyBtn        = document.getElementById("apply");
    var tbody           = document.getElementById("companyTableBody");
    var tableLoader     = document.getElementById("tableLoader");
    var editModal       = document.getElementById("editModal");
    var historyModal    = document.getElementById("historyModal");
    var editAgentBtn    = document.getElementById("editAgentBtn");
    var collectiveModal  = document.getElementById("collectiveModal");
    var collectivePayBtn = document.getElementById("collectivePayBtn");
    var closeCollective  = document.getElementById("closeCollectiveModal");
    var submitCollective = document.getElementById("submitCollectivePay");
    var collectiveResult = document.getElementById("collectiveResult");
    var collectiveAmount = document.getElementById("collectiveAmount");

    var pathParts = window.location.pathname.split('/');
    var companyId = pathParts[pathParts.length - 1];

    var toggleDates = function() {
        var isCustom = filterSelect.value === "custom";
        if (fromInput) fromInput.style.display = isCustom ? "inline-block" : "none";
        if (toInput)   toInput.style.display   = isCustom ? "inline-block" : "none";
    };

    var fetchData = async function() {
        if (!companyId || companyId.length < 15) return;

        var filterVal = filterSelect.value;
        var paramsObj = { filter: filterVal };
        if (filterVal === "custom") {
            paramsObj.from = fromInput.value;
            paramsObj.to   = toInput.value;
        }

        var params = new URLSearchParams(paramsObj).toString();
        if (tableLoader) tableLoader.style.display = "flex";
        tbody.style.opacity = "0.3";

        try {
            var response = await fetch("/company/view/" + companyId + "?" + params, {
                headers: { 'X-Requested-With': 'XMLHttpRequest', 'Accept': 'application/json' }
            });
            var data = await response.json();

            if (data.success) {
                document.getElementById("stat-total").innerText = "Rs " + Number(data.stats.totalOutstandingAmount).toFixed(2);
                document.getElementById("stat-paid").innerText  = "Rs " + Number(data.stats.totalOutstandingAmountGiven).toFixed(2);
                document.getElementById("stat-left").innerText  = "Rs " + Number(data.stats.totalOutstandingAmountLeft).toFixed(2);

                var html = '';
                if (!data.company.items || data.company.items.length === 0) {
                    html = '<tr><td colspan="7" style="text-align:center; padding:20px;">No records found.</td></tr>';
                } else {
                    data.company.items.forEach(function(i) {
                        var dateObj  = new Date(i.createdAt);
                        var pkrDate  = dateObj.toLocaleDateString('en-GB',  { day:'2-digit', month:'2-digit', year:'numeric', timeZone:'Asia/Karachi' });
                        var pkrTime  = dateObj.toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit', hour12:true, timeZone:'Asia/Karachi' });
                        var status   = i.paidAmount >= i.totalProductAmount ? 'Paid' : (i.paidAmount > 0 ? 'Partially' : 'Unpaid');
                        var leftAmt  = (Number(i.totalProductAmount) - Number(i.paidAmount)).toFixed(2);
                        var billLink = i.billId
                            ? '<div style="margin-top:5px;"><a href="/products/bill/' + i.billId._id + '" style="color:#2196F3; text-decoration:none; font-size:11px; font-weight:bold;">View Bill</a></div>'
                            : '<div style="margin-top:5px;"><small style="color:#999; font-size:11px; font-weight:bold;">No Bill</small></div>';
                        var deleteBtn = data.role === "admin"
                            ? '<button class="delete-btn" data-id="' + i._id + '">Delete</button>'
                            : '';

                        html += '<tr id="row-' + i._id + '">'
                            + '<td>' + i.totalProductBuy + '</td>'
                            + '<td>Rs ' + Number(i.totalProductAmount).toFixed(2) + '</td>'
                            + '<td class="paid-status"><span class="status-tag">' + status + '</span></td>'
                            + '<td style="color:#8B5CF6; font-weight:bold;">Rs ' + Number(i.paidAmount).toFixed(2) + '</td>'
                            + '<td style="color:red; font-weight:bold;">Rs ' + leftAmt + '</td>'
                            + '<td><div>' + pkrDate + '</div><small style="color:#2196F3; font-weight:bold;">' + pkrTime + '</small>' + billLink + '</td>'
                            + '<td class="actions">'
                            + '<button class="pay-btn" data-id="' + i._id + '">Pay</button>'
                            + deleteBtn
                            + '<div class="pay-box" id="paybox-' + i._id + '" style="display:none; margin-top:5px;">'
                            + '<input class="payinput" type="number" id="payInput-' + i._id + '" style="width:70px" min="1" placeholder="Pay">'
                            + '<button class="submit-pay-btn" data-id="' + i._id + '">Submit</button>'
                            + '</div></td></tr>';
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

    function rebindButtons() {
        document.querySelectorAll(".pay-btn").forEach(function(btn) {
            btn.onclick = function() {
                var box = document.getElementById("paybox-" + btn.dataset.id);
                box.style.display = box.style.display === "none" ? "block" : "none";
            };
        });

        document.querySelectorAll(".submit-pay-btn").forEach(function(btn) {
            btn.onclick = async function() {
                var id  = btn.dataset.id;
                var amt = document.getElementById("payInput-" + id).value;
                if (!amt || amt <= 0) return alert("Please enter a valid amount");
                btn.disabled  = true;
                btn.innerText = "...";
                try {
                    var res    = await fetch("/company/pay-item/" + id, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ amount: parseFloat(amt) })
                    });
                    var result = await res.json();
                    if (result.success) {
                        alert("Payment Success: Rs " + parseFloat(amt).toFixed(2));
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
                    var res    = await fetch("/company/delete-item/" + btn.dataset.id, { method: "DELETE" });
                    var result = await res.json();
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
    if (editAgentBtn) editAgentBtn.onclick = function() { editModal.style.display = "flex"; };

    var saveProfileBtn = document.getElementById("saveAgentBtn");
    if (saveProfileBtn) {
        saveProfileBtn.onclick = async function() {
            var name  = document.getElementById("editName").value;
            var phone = document.getElementById("editPhone").value;
            try {
                var res    = await fetch("/company/update/" + companyId, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ name: name, phone: phone })
                });
                var result = await res.json();
                if (result.success) { alert("Company Profile Updated!"); location.reload(); }
                else alert("Update failed: " + result.message);
            } catch (e) { alert("Network Error"); }
        };
    }

    // Payment History Modal — arrow grouping
    var viewHistoryBtn = document.getElementById("viewHistoryBtn");
    if (viewHistoryBtn) {
        viewHistoryBtn.onclick = async function() {
            historyModal.style.display = "flex";
            var hBody = document.getElementById("historyTableBody");
            hBody.innerHTML = '<tr><td colspan="2" style="text-align:center;">Loading...</td></tr>';

            try {
                var res  = await fetch("/company/payment-history/" + companyId);
                var data = await res.json();

                if (data.success && data.history && data.history.length > 0) {

                    // Same 5 seconds ke andar wale group karo
                    var groups      = [];
                    var usedIndexes = new Set();

                    data.history.forEach(function(h, i) {
                        if (usedIndexes.has(i)) return;
                        var group = [h];
                        usedIndexes.add(i);
                        var t1 = new Date(h.createdAt).getTime();
                        data.history.forEach(function(h2, j) {
                            if (i === j || usedIndexes.has(j)) return;
                            var t2 = new Date(h2.createdAt).getTime();
                            if (Math.abs(t1 - t2) <= 5000) {
                                group.push(h2);
                                usedIndexes.add(j);
                            }
                        });
                        groups.push(group);
                    });

                    var html = '';
                    groups.forEach(function(group) {
                        var d       = new Date(group[0].createdAt);
                        var dateStr = d.toLocaleDateString('en-GB', { timeZone: 'Asia/Karachi' });
                        var timeStr = d.toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit', hour12:true, timeZone:'Asia/Karachi' });

                        if (group.length === 1) {
                            var h     = group[0];
                            var color = h.amountPaid < 0 ? 'red' : 'green';
                            html += '<tr>'
                                + '<td style="padding:10px; border-bottom:1px solid #eee;">' + dateStr + '<br><small style="color:#2196F3;">' + timeStr + '</small></td>'
                                + '<td style="padding:10px; border-bottom:1px solid #eee; font-weight:bold; color:' + color + ';">Rs ' + Number(h.amountPaid).toFixed(2) + '</td>'
                                + '</tr>';
                        } else {
                            var total = group.reduce(function(sum, h) { return sum + Number(h.amountPaid); }, 0);
                            html += '<tr style="background:#e3f2fd;">'
                                + '<td colspan="2" style="padding:8px 12px; font-weight:bold; color:#1565c0; font-size:13px; border-bottom:1px solid #bbdefb;">'
                                + 'Collective | ' + dateStr + ' <small style="color:#1976d2;">' + timeStr + '</small>'
                                + ' Total: <span style="color:#0d47a1;">Rs ' + total.toFixed(2) + '</span>'
                                + '</td></tr>';

                            group.forEach(function(h, idx) {
                                var isLast = idx === group.length - 1;
                                var arrow  = isLast ? 'L- ' : '|- ';
                                var color  = h.amountPaid < 0 ? 'red' : '#2e7d32';
                                var border = isLast ? '2px solid #90caf9' : '1px solid #e3f2fd';
                                html += '<tr style="background:#f8fbff;">'
                                    + '<td style="padding:6px 12px 6px 22px; color:#555; font-size:13px; border-bottom:' + border + ';">'
                                    + '<span style="color:#1565c0; font-weight:bold; margin-right:5px;">' + arrow + '</span>Bill ' + (idx + 1) + '</td>'
                                    + '<td style="padding:6px 12px; font-weight:bold; color:' + color + '; font-size:13px; border-bottom:' + border + ';">'
                                    + 'Rs ' + Number(h.amountPaid).toFixed(2) + '</td></tr>';
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

    // Collective Payment
    if (collectivePayBtn) {
        collectivePayBtn.onclick = function() {
            collectiveAmount.value     = "";
            collectiveResult.innerHTML = "";
            collectiveModal.style.display = "flex";
        };
    }

    if (closeCollective) closeCollective.onclick = function() { collectiveModal.style.display = "none"; };

    if (submitCollective) {
        submitCollective.onclick = async function() {
            if (submitCollective.disabled) return;

            var amt = parseFloat(collectiveAmount.value);
            if (!amt || amt <= 0) {
                collectiveResult.innerHTML = '<span style="color:red; font-weight:bold;">Valid amount daalo.</span>';
                return;
            }

            submitCollective.disabled      = true;
            submitCollective.style.opacity = "0.6";
            submitCollective.innerText     = "Processing...";
            collectiveResult.innerHTML     = "";

            try {
                var res  = await fetch("/company/collective-pay/" + companyId, {
                    method:  "POST",
                    headers: { "Content-Type": "application/json" },
                    body:    JSON.stringify({ amount: amt })
                });
                var data = await res.json();

                if (data.success) {
                    collectiveResult.innerHTML = '<p style="color:green; font-weight:bold; margin:0;">' + data.message + '</p>';
                    setTimeout(function() {
                        collectiveModal.style.display  = "none";
                        submitCollective.disabled      = false;
                        submitCollective.style.opacity = "1";
                        submitCollective.innerText     = "Submit Payment";
                        fetchData();
                    }, 1500);
                } else {
                    collectiveResult.innerHTML = '<span style="color:red; font-weight:bold;">' + data.message + '</span>';
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

    // Init
    toggleDates();
    rebindButtons();
    if (applyBtn)     applyBtn.addEventListener("click", fetchData);
    if (filterSelect) filterSelect.addEventListener("change", toggleDates);

    var closeEdit = document.getElementById("closeEditModal");
    var closeHist = document.getElementById("closeHistoryModal");
    if (closeEdit) closeEdit.onclick = function() { editModal.style.display = "none"; };
    if (closeHist) closeHist.onclick = function() { historyModal.style.display = "none"; };

    window.onclick = function(e) {
        if (e.target === editModal)       editModal.style.display       = "none";
        if (e.target === historyModal)    historyModal.style.display    = "none";
        if (e.target === collectiveModal) collectiveModal.style.display = "none";
    };
});