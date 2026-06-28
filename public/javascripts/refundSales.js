const refundForm         = document.getElementById("refundForm");
const refundResult       = document.getElementById("refundResult");
const addButton          = document.getElementById("add");
const cashReturnBox      = document.getElementById("cashReturnBox");
const cashReturnAmount   = document.getElementById("cashReturnAmount");
const refundTableSection = document.getElementById("refundTableSection");
const refundTableBody    = document.getElementById("refundTableBody");
const sessionGrandTotal  = document.getElementById("sessionGrandTotal");

let sessionTotal     = 0;
let sessionCashTotal = 0;
let rowCounter       = 0;

refundForm.addEventListener("submit", async function (e) {
  e.preventDefault();

  const originalText = addButton.innerHTML;
  addButton.disabled = true;
  addButton.innerHTML = `<span class="spinner"></span> Processing...`;
  refundResult.innerHTML = "";

  const formData = new FormData(refundForm);
  const data = {
    saleID:          formData.get("saleID").trim(),
    productQuantity: parseInt(formData.get("productQuantity"))
    // ✅ returnCash bilkul nahi — system khud decide karta hai
  };

  try {
    const res    = await fetch("/sales/refund", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(data)
    });
    const result = await res.json();

    if (result.success) {
      refundForm.reset();

      const isPaid = result.refundType === "cash_sale" || result.refundType === "udhaar_return_cash";

      // ✅ Table row add karo
      addRefundRow(result.saleDetail, result.refundType, result.overpaidAmount || 0);

      // ✅ Cash return box — running total
      if (isPaid && result.saleDetail.cashAmount > 0) {
        sessionCashTotal += result.saleDetail.cashAmount;
        cashReturnAmount.textContent = `Rs. ${sessionCashTotal.toFixed(2)}`;
        cashReturnBox.style.display = "block";
      }

      // ✅ Message box — refundType ke mutabiq alag style
      let msgColor = "green";
      let msgIcon  = "✅";
      if (result.refundType === "udhaar_no_return") {
        msgColor = "#e65100";
        msgIcon  = "📋";
      } else if (result.refundType === "udhaar_return_cash") {
        msgColor = "#1565c0";
        msgIcon  = "💵";
      }

      let htmlContent = `
        <p style="color:${msgColor}; font-weight:bold; margin:0 0 10px 0; font-size:15px;">
          ${result.message}
        </p>`;

      if (result.billId) {
        htmlContent += `
          <a href="/sales/bill/${result.billId}" class="print-btn" style="
            display:inline-block; padding:10px 20px;
            background-color:#06A56C; color:white;
            text-decoration:none; border-radius:5px; font-weight:bold;">
            🖨️ Print Updated Bill
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
    addButton.disabled = false;
    addButton.innerHTML = originalText;
  }
});

function addRefundRow(detail, refundType, overpaidAmount) {
  rowCounter++;

  // ✅ Grand total — cash wapas hone wala amount
  const cashBack = detail.cashAmount || 0;
  if (cashBack > 0) {
    sessionTotal += cashBack;
    sessionGrandTotal.textContent = sessionTotal.toFixed(2);
  }

  // ✅ Status badge — 3 types
  let statusBadge = "";
  if (refundType === "cash_sale") {
    statusBadge = `<span style="background:#e8f5e9; color:#2e7d32; padding:3px 10px;
                     border-radius:12px; font-size:12px; font-weight:bold;">
                     💵 Paisa Wapas
                   </span>`;
  } else if (refundType === "udhaar_return_cash") {
    statusBadge = `<span style="background:#e3f2fd; color:#1565c0; padding:3px 10px;
                     border-radius:12px; font-size:12px; font-weight:bold;">
                     💵 Rs. ${overpaidAmount.toFixed(2)} Wapas / Adjust
                   </span>`;
  } else {
    statusBadge = `<span style="background:#fff3e0; color:#e65100; padding:3px 10px;
                     border-radius:12px; font-size:12px; font-weight:bold;">
                     📋 Khata Kam
                   </span>`;
  }

  const colorVal  = detail.color  || "—";
  const unitVal   = detail.unit   || "—";
  const soldQty   = detail.soldQty !== undefined ? detail.soldQty : "—";

  const tr = document.createElement("tr");
  tr.style.background = rowCounter % 2 === 0 ? "#f9f9f9" : "#ffffff";
  tr.innerHTML = `
    <td style="padding:10px; border-bottom:1px solid #eee;">${detail.saleID}</td>
    <td style="padding:10px; border-bottom:1px solid #eee;">${(detail.brand || "").split(" ")[0]}</td>
    <td style="padding:10px; border-bottom:1px solid #eee;">${detail.productName}</td>
    <td style="padding:10px; border-bottom:1px solid #eee;">${colorVal}</td>
    <td style="padding:10px; border-bottom:1px solid #eee;">${unitVal}</td>
    <td style="padding:10px; border-bottom:1px solid #eee; text-align:center; color:#555;">${soldQty}</td>
    <td style="padding:10px; border-bottom:1px solid #eee; text-align:center;
               font-weight:bold; color:#e65100;">${detail.qty}</td>
    <td style="padding:10px; border-bottom:1px solid #eee; text-align:right;">
      Rs. ${detail.rate.toFixed(2)}
    </td>
    <td style="padding:10px; border-bottom:1px solid #eee; text-align:right; font-weight:bold;
               color:${cashBack > 0 ? '#c62828' : '#9e9e9e'};">
      ${cashBack > 0 ? `Rs. ${cashBack.toFixed(2)}` : "—"}
    </td>
    <td style="padding:10px; border-bottom:1px solid #eee; text-align:center;">${statusBadge}</td>
  `;

  refundTableBody.appendChild(tr);
  refundTableSection.style.display = "block";
  refundTableSection.scrollIntoView({ behavior: "smooth", block: "nearest" });
}