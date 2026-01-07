document.addEventListener("DOMContentLoaded", () => {
    const filterSelect = document.getElementById("filter");
    const fromInput = document.getElementById("from");
    const toInput = document.getElementById("to");
    const applyBtn = document.getElementById("apply");
    const tbody = document.getElementById("agentTableBody");
    const tableLoader = document.getElementById("tableLoader");

    // 🟢 URL CLEANING & ID STORAGE LOGIC
    // Agar URL mein ID hai (e.g. /view-agent/123), to usay save kar lo
    const pathParts = window.location.pathname.split('/');
    const idInUrl = pathParts[pathParts.length - 1];

    // Agar ID valid length ki hai to localStorage mein save karein aur URL saaf karein
    if (idInUrl && idInUrl.length > 15) { 
        localStorage.setItem('activeAgentId', idInUrl);
        // Browser bar mein link clean kar do: localhost:3000/agents/view
        window.history.replaceState(null, "", "/agents/view");
    }

    const toggleDates = () => {
        const isCustom = filterSelect.value === "custom";
        fromInput.style.display = isCustom ? "inline-block" : "none";
        toInput.style.display = isCustom ? "inline-block" : "none";
    };

    const fetchData = async () => {
        // Hamesha localStorage se ID uthao kyunki URL ab clean ho chuka hai
        const agentId = localStorage.getItem('activeAgentId');
        if (!agentId) return alert("Agent ID not found. Please go back and try again.");

        const filterVal = filterSelect.value;
        let paramsObj = { filter: filterVal };
        if (filterVal === "custom") {
            paramsObj.from = fromInput.value;
            paramsObj.to = toInput.value;
        }

        const params = new URLSearchParams(paramsObj).toString();

        // Loader dikhao
        tableLoader.style.display = "flex";
        tbody.style.opacity = "0.3";

        try {
            // Request hamesha asal ID wale route par jayegi
            const response = await fetch(`/agents/view-agent/${agentId}?${params}`, {
                headers: { 
                    'X-Requested-With': 'XMLHttpRequest', 
                    'Accept': 'application/json' 
                }
            });
            const data = await response.json();

            if (data.success) {
                // 1. Stats Update
                document.getElementById("stat-total").innerText = `Rs ${Number(data.stats.totalPercentageAmount).toFixed(2)}`;
                document.getElementById("stat-paid").innerText = `Rs ${Number(data.stats.totalPercentageAmountGiven).toFixed(2)}`;
                document.getElementById("stat-left").innerText = `Rs ${Number(data.stats.totalPercentageAmountLeft).toFixed(2)}`;

                // 2. Table Update
                let html = '';
                if (!data.agent.items || data.agent.items.length === 0) {
                    html = `<tr><td colspan="9" class="no-data" style="text-align:center; padding:20px;">No records found.</td></tr>`;
                } else {
                    data.agent.items.forEach(i => {
                        const dateObj = new Date(i.createdAt);
                        const status = i.paidAmount >= i.percentageAmount ? 'Paid' : (i.paidAmount > 0 ? 'Partially' : 'Unpaid');
                        const leftAmt = (Number(i.percentageAmount) - Number(i.paidAmount)).toFixed(2);
                        
                        html += `
                        <tr id="row-${i._id}">
                            <td>${i.totalProductSold}</td>
                            <td>${i.totalProductAmount}</td>
                            <td>${i.percentage}%</td>
                            <td>${i.percentageAmount}</td>
                            <td class="paid-status"><span  class="status-tag">${status}</span></td>
                            <td>Rs ${i.paidAmount}</td>
                            <td>Rs ${leftAmt}</td>
                            <td>${dateObj.toLocaleDateString('en-GB')}<br>
                            <small style="color: #007bff; font-weight: bold;">${dateObj.toLocaleTimeString('en-GB', {hour:'2-digit', minute:'2-digit', hour12:true})}</small></td>
                            <td class="actions">
                                <button class="pay-btn" data-id="${i._id}" id="pay" >Pay</button>
                                ${data.role === "admin" ? `<button class="delete-btn" data-id="${i._id}" id="delete" >Delete</button>` : ''}
                                <div class="pay-box" id="paybox-${i._id}" style="display:none;">
                                    <input class="payinput" type="number" id="payInput-${i._id}" placeholder="Pay" style="width:70px" min="1" max="1000000">
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
            console.error("Error:", err); 
            alert("Data can't be loaded.");
        } 
        finally { 
            tableLoader.style.display = "none"; 
            tbody.style.opacity = "1"; 
        }
    };

    function rebindButtons() {
        document.querySelectorAll(".pay-btn").forEach(btn => {
            btn.onclick = () => {
                const box = document.getElementById(`paybox-${btn.dataset.id}`);
                box.style.display = box.style.display === "none" ? "block" : "none";
            };
        });

        document.querySelectorAll(".submit-pay-btn").forEach(btn => {
        btn.onclick = async () => {
        const id = btn.dataset.id;
        const inputEl = document.getElementById(`payInput-${id}`);
        const amt = inputEl.value;

        if (!amt || amt <= 0) return alert("❌ Please enter a valid amount");

        btn.disabled = true;
        btn.innerText = "...";

        try {
            const res = await fetch(`/agents/pay-item/${id}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ amount: parseFloat(amt) })
            });

            const result = await res.json(); 

            if (result.success) {
                // ✅ Professional Success Message
                alert(`✅ Payment Success!\n---------------------------\nAmount: Rs ${Number(amt).toLocaleString()}`); 
                
                fetchData(); 
            } else {
                // ❌ Backend Error Message (e.g., Over payment)
                alert(`⚠️ Error: ${result.message || "Payment Failed"}`); 
                btn.disabled = false;
                btn.innerText = "Submit"; 
            }
        } catch (e) {
            console.error(e);
            alert("🌐 Network Error: Check your connection.");
            btn.disabled = false;
            btn.innerText = "Submit";
        }
    };
});

        document.querySelectorAll(".delete-btn").forEach(btn => {
            btn.onclick = async () => {
                if(!confirm("Are you sure?")) return;
                try {
                    const res = await fetch(`/agents/delete-item/${btn.dataset.id}`, { method: "DELETE" });
                    if(res.ok) fetchData();
                } catch (e) { alert("Delete failed"); }
            };
        });
    }

    applyBtn.addEventListener("click", fetchData);
    filterSelect.addEventListener("change", toggleDates);
    toggleDates();
    rebindButtons();
});

