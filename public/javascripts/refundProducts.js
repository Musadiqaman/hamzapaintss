const refundForm         = document.getElementById("refundForm");
const refundResult       = document.getElementById("refundResult");
const addButton          = document.getElementById("add");
const cashReturnBox      = document.getElementById("cashReturnBox");
const cashReturnAmount   = document.getElementById("cashReturnAmount");
const refundTableSection = document.getElementById("refundTableSection");
const refundTableBody    = document.getElementById("refundTableBody");
const sessionGrandTotal  = document.getElementById("sessionGrandTotal");

let sessionTotal     = 0;
let sessionCashTotal = 0;   // ✅ Running cash return total
let rowCounter       = 0;

refundForm.addEventListener("submit", async function (e) {
  e.preventDefault();

 

  const originalText = addButton.innerHTML;
  addButton.disabled  = true;
  addButton.innerHTML = `<span class="spinner"></span> Processing...`;
  refundResult.innerHTML = "";

  const formData = new FormData(refundForm);
  const data = {
    stockID:        formData.get("stockID").trim(),
    refundQuantity: parseInt(formData.get("refundQuantity")),
    returnCash:     document.getElementById("returnCash").checked
  };

  try {
    const res    = await fetch("/products/refund", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(data)
    });
    const result = await res.json();

    if (result.success) {
      refundForm.reset();

      // ✅ Table row add karo
      addRefundRow(result.refundDetail, result.isPaid);

      // ✅ Cash return box — running total with +
      if (result.isPaid) {
        sessionCashTotal += result.refundDetail.cashAmount;
        cashReturnAmount.textContent = `Rs. ${sessionCashTotal.toFixed(2)}`;
        cashReturnBox.style.display = "block";
      }

      // Success message
      let htmlContent = `
        <p style="color:green; font-weight:bold; margin:0;">
          ${result.message}
        </p>`;

      if (result.billId) {
        htmlContent += `
          <a href="/products/bill/${result.billId}" class="print-btn" style="
            display:inline-block; padding:10px 20px;
            background-color:#06A56C; color:white;
            text-decoration:none; border-radius:5px; font-weight:bold;">
            🖨️ View Updated Bill
          </a>`;
      }

      refundResult.innerHTML = htmlContent;

    } else {
      refundResult.innerHTML = `
        <span style="color:red; font-weight:bold;">
          ${result.message || "❌ Refund failed"}
        </span>`;
    }

  } catch (err) {
    console.error(err);
    refundResult.innerHTML = `
      <span style="color:red; font-weight:bold;">❌ Something went wrong!</span>`;
  } finally {
    addButton.disabled  = false;
    addButton.innerHTML = originalText;
  }
});

function addRefundRow(detail, isPaid) {
  rowCounter++;

  // ✅ Grand total sirf isPaid pe update ho
  if (isPaid) {
    sessionTotal += detail.cashAmount;
    sessionGrandTotal.textContent = sessionTotal.toFixed(2);
  }

  const statusBadge = isPaid
    ? `<span style="background:#e8f5e9; color:#2e7d32; padding:3px 10px;
                   border-radius:12px; font-size:12px; font-weight:bold;">
         💵 Company Se Wapas
       </span>`
    : `<span style="background:#fff3e0; color:#e65100; padding:3px 10px;
                   border-radius:12px; font-size:12px; font-weight:bold;">
         📋 Obrai ka paisa Kam
       </span>`;

  // ✅ Safe fallback — "—" agar value na ho
  const colorVal  = detail.colourName || "—";
  const unitVal   = detail.unit       || "—";
  const totalQty  = detail.totalQty   !== undefined ? detail.totalQty : "—";
  const refundQty = detail.refundQty;

  const tr = document.createElement("tr");
  tr.style.background = rowCounter % 2 === 0 ? "#f9f9f9" : "#ffffff";
  tr.innerHTML = `
    <td style="padding:10px; border-bottom:1px solid #eee;">${detail.stockID}</td>
    <td style="padding:10px; border-bottom:1px solid #eee;">${(detail.brandName || "").split(" ")[0]}</td>
    <td style="padding:10px; border-bottom:1px solid #eee;">${detail.itemName}</td>
    <td style="padding:10px; border-bottom:1px solid #eee;">${colorVal}</td>
    <td style="padding:10px; border-bottom:1px solid #eee;">${unitVal}</td>
    <td style="padding:10px; border-bottom:1px solid #eee; text-align:center; color:#555;">
      ${totalQty}
    </td>
    <td style="padding:10px; border-bottom:1px solid #eee; text-align:center;
               font-weight:bold; color:#e65100;">${refundQty}</td>
    <td style="padding:10px; border-bottom:1px solid #eee; text-align:right;">
      Rs. ${Number(detail.rate).toFixed(2)}
    </td>
    <td style="padding:10px; border-bottom:1px solid #eee; text-align:right;
               font-weight:bold; color:${isPaid ? '#c62828' : '#9e9e9e'};">
      ${isPaid ? `Rs. ${Number(detail.cashAmount).toFixed(2)}` : "—"}
    </td>
    <td style="padding:10px; border-bottom:1px solid #eee; text-align:center;">
      ${statusBadge}
    </td>
  `;

  refundTableBody.appendChild(tr);
  refundTableSection.style.display = "block";
  refundTableSection.scrollIntoView({ behavior: "smooth", block: "nearest" });
}