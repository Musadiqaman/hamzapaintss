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

  if (addButton.disabled) return;

  const originalText     = addButton.innerHTML;
  addButton.disabled     = true;
  addButton.style.opacity = "0.6";
  addButton.innerHTML    = "Processing...";
  refundResult.innerHTML = "";

  const formData = new FormData(refundForm);
  const data = {
    stockID:        formData.get("stockID").trim(),
    refundQuantity: parseInt(formData.get("refundQuantity"))
    // returnCash bilkul nahi — system khud decide karta hai
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

      const isPaid = result.refundType === "cash_purchase" || result.refundType === "obrai_return_cash";

      // Table row add karo
      addRefundRow(result.refundDetail, result.refundType, result.overpaidAmount || 0);

      // Cash return box — running total
      if (isPaid && result.refundDetail.cashAmount > 0) {
        sessionCashTotal += result.refundDetail.cashAmount;
        cashReturnAmount.textContent = "Rs. " + sessionCashTotal.toFixed(2);
        cashReturnBox.style.display = "block";
      }

      // Message color refundType ke mutabiq
      let msgColor = "green";
      if (result.refundType === "obrai_no_return")   msgColor = "#e65100";
      if (result.refundType === "obrai_return_cash") msgColor = "#1565c0";

      let htmlContent = '<p style="color:' + msgColor + '; font-weight:bold; margin:0 0 10px 0; font-size:15px;">'
          + result.message + '</p>';

      if (result.billId) {
        htmlContent += '<a href="/products/bill/' + result.billId + '" class="print-btn" style="'
            + 'display:inline-block; padding:10px 20px; background-color:#06A56C; color:white;'
            + 'text-decoration:none; border-radius:5px; font-weight:bold;">View Updated Bill</a>';
      }

      refundResult.innerHTML = htmlContent;

    } else {
      refundResult.innerHTML = '<span style="color:red; font-weight:bold;">'
          + (result.message || "Refund failed") + '</span>';
    }

  } catch (err) {
    console.error(err);
    refundResult.innerHTML = '<span style="color:red; font-weight:bold;">Something went wrong!</span>';
  } finally {
    addButton.disabled      = false;
    addButton.style.opacity = "1";
    addButton.innerHTML     = originalText;
  }
});

function addRefundRow(detail, refundType, overpaidAmount) {
  rowCounter++;

  const cashBack = detail.cashAmount || 0;
  if (cashBack > 0) {
    sessionTotal += cashBack;
    sessionGrandTotal.textContent = sessionTotal.toFixed(2);
  }

  // Status badge — 3 types
  let statusBadge = "";
  if (refundType === "cash_purchase") {
    statusBadge = '<span style="background:#e8f5e9; color:#2e7d32; padding:3px 10px;'
        + 'border-radius:12px; font-size:12px; font-weight:bold;">Cash Wapas</span>';
  } else if (refundType === "obrai_return_cash") {
    statusBadge = '<span style="background:#e3f2fd; color:#1565c0; padding:3px 10px;'
        + 'border-radius:12px; font-size:12px; font-weight:bold;">Rs. '
        + overpaidAmount.toFixed(2) + ' Wapas / Adjust</span>';
  } else {
    statusBadge = '<span style="background:#fff3e0; color:#e65100; padding:3px 10px;'
        + 'border-radius:12px; font-size:12px; font-weight:bold;">Obrai Kam</span>';
  }

  const colorVal = detail.colourName || "-";
  const unitVal  = detail.unit       || "-";
  const totalQty = detail.totalQty  !== undefined ? detail.totalQty : "-";

  const tr = document.createElement("tr");
  tr.style.background = rowCounter % 2 === 0 ? "#f9f9f9" : "#ffffff";
  tr.innerHTML = '<td style="padding:10px; border-bottom:1px solid #eee;">' + detail.stockID + '</td>'
    + '<td style="padding:10px; border-bottom:1px solid #eee;">' + (detail.brandName || "").split(" ")[0] + '</td>'
    + '<td style="padding:10px; border-bottom:1px solid #eee;">' + detail.itemName + '</td>'
    + '<td style="padding:10px; border-bottom:1px solid #eee;">' + colorVal + '</td>'
    + '<td style="padding:10px; border-bottom:1px solid #eee;">' + unitVal + '</td>'
    + '<td style="padding:10px; border-bottom:1px solid #eee; text-align:center; color:#555;">' + totalQty + '</td>'
    + '<td style="padding:10px; border-bottom:1px solid #eee; text-align:center; font-weight:bold; color:#e65100;">' + detail.refundQty + '</td>'
    + '<td style="padding:10px; border-bottom:1px solid #eee; text-align:right;">Rs. ' + Number(detail.rate).toFixed(2) + '</td>'
    + '<td style="padding:10px; border-bottom:1px solid #eee; text-align:right; font-weight:bold; color:' + (cashBack > 0 ? '#c62828' : '#9e9e9e') + ';">'
    + (cashBack > 0 ? 'Rs. ' + cashBack.toFixed(2) : '-') + '</td>'
    + '<td style="padding:10px; border-bottom:1px solid #eee; text-align:center;">' + statusBadge + '</td>';

  refundTableBody.appendChild(tr);
  refundTableSection.style.display = "block";
  refundTableSection.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

