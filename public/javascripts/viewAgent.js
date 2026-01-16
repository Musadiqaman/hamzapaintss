document.addEventListener("DOMContentLoaded", () => {
    const filterSelect = document.getElementById("filter");
    const fromInput = document.getElementById("from");
    const toInput = document.getElementById("to");
    const applyBtn = document.getElementById("apply");
    const tbody = document.getElementById("agentTableBody");
    const tableLoader = document.getElementById("tableLoader");

    // ✅ URL se Agent ID nikalna (Address bar se)
    const pathParts = window.location.pathname.split('/');
    const agentId = pathParts[pathParts.length - 1];

    const toggleDates = () => {
        const isCustom = filterSelect.value === "custom";
        fromInput.style.display = isCustom ? "inline-block" : "none";
        toInput.style.display = isCustom ? "inline-block" : "none";
    };

    const fetchData = async () => {
        // ID check karein
        if (!agentId || agentId.length < 15) {
            return alert("Agent ID not found in URL. Please go back to agents list.");
        }

        const filterVal = filterSelect.value;
        let paramsObj = { filter: filterVal };
        if (filterVal === "custom") {
            paramsObj.from = fromInput.value;
            paramsObj.to = toInput.value;
        }

        const params = new URLSearchParams(paramsObj).toString();

        // UI updates before fetch
        tableLoader.style.display = "flex";
        tbody.style.opacity = "0.3";

        try {
            const response = await fetch(`/agents/view/${agentId}?${params}`, {
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
                       // ... existing code inside data.agent.items.forEach(i => {

const dateObj = new Date(i.createdAt);

// Pakistan Timezone settings
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

const status = i.paidAmount >= i.percentageAmount ? 'Paid' : (i.paidAmount > 0 ? 'Partially' : 'Unpaid');
const totalAmt = Number(i.totalProductAmount || 0).toFixed(2);
const percAmt = Number(i.percentageAmount || 0).toFixed(2);
const paidAmt = Number(i.paidAmount || 0).toFixed(2);
const leftAmt = (Number(i.percentageAmount || 0) - Number(i.paidAmount || 0)).toFixed(2);

// ✅ Bill Link logic (Check karein ke billId exist karti hai ya nahi)
const billLinkHtml = i.billId 
    ? `<a href="/sales/bill/${i.billId._id}"  class="bill-link" 
          style="display:block; margin-top:5px; color:#007bff; text-decoration:none; font-size:11px; font-weight:bold;">
          📄 View Bill
       </a>` 
    : '<small style="color:gray; display:block; margin-top:5px;">No Bill</small>';

html += `
<tr id="row-${i._id}">
    <td>${i.totalProductSold}</td>
    <td>Rs ${totalAmt}</td>
    <td>${i.percentage}%</td>
    <td>Rs ${percAmt}</td>
    <td class="paid-status"><span class="status-tag">${status}</span></td>
    <td>Rs ${paidAmt}</td>
    <td>Rs ${leftAmt}</td>
    <td>
        <div>${pkrDate}</div>
        <small style="color: #666;">${pkrTime}</small>
        ${billLinkHtml} </td>
    <td class="actions">
        <button class="pay-btn" data-id="${i._id}"  id="pay"  >Pay</button>
        ${data.role === "admin" ? `<button class="delete-btn" data-id="${i._id}" id="delete" >Delete</button>` : ''}
        <div class="pay-box" id="paybox-${i._id}" style="display:none; margin-top:5px;">
            <input class="payinput" type="number" id="payInput-${i._id}" placeholder="Amount" style="width:70px">
            <button class="submit-pay-btn" data-id="${i._id}" id="submit" >Ok</button>
        </div>
    </td>
</tr>`;

// ... rest of the code
                    });
                }
                tbody.innerHTML = html;
                rebindButtons();
            }
        } catch (err) { 
            console.error("Error:", err); 
            alert("Data can't be loaded.");
        } finally { 
            tableLoader.style.display = "none"; 
            tbody.style.opacity = "1"; 
        }
    };

    function rebindButtons() {
        // Pay button toggle
        document.querySelectorAll(".pay-btn").forEach(btn => {
            btn.onclick = () => {
                const box = document.getElementById(`paybox-${btn.dataset.id}`);
                box.style.display = box.style.display === "none" ? "block" : "none";
            };
        });

        // Submit Payment logic
        document.querySelectorAll(".submit-pay-btn").forEach(btn => {
            btn.onclick = async () => {
                const id = btn.dataset.id;
                const inputEl = document.getElementById(`payInput-${id}`);
                const amt = inputEl.value;

                if (!amt || amt <= 0) return alert("❌ Enter valid amount");

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
                        alert(`✅ Payment Success: Rs ${amt}`); 
                        fetchData(); 
                    } else {
                        alert(`⚠️ Error: ${result.message}`); 
                        btn.disabled = false;
                        btn.innerText = "Ok"; 
                    }
                } catch (e) {
                    alert("🌐 Network Error");
                    btn.disabled = false;
                    btn.innerText = "Ok";
                }
            };
        });

        // Delete logic
        document.querySelectorAll(".delete-btn").forEach(btn => {
            btn.onclick = async () => {
                if(!confirm("Are you sure you want to delete this record?")) return;
                try {
                    const res = await fetch(`/agents/delete-item/${btn.dataset.id}`, { method: "DELETE" });
                    if(res.ok) fetchData();
                } catch (e) { alert("Delete failed"); }
            };
        });
    }

    // Event Listeners
    applyBtn.addEventListener("click", fetchData);
    filterSelect.addEventListener("change", toggleDates);
    
    // Initializing
    toggleDates();
    fetchData(); // Page load par data auto-load karne ke liye
});


