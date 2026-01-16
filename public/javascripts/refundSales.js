const refundForm = document.getElementById("refundForm");
const refundResult = document.getElementById("refundResult");
const addButton = document.getElementById("add");

refundForm.addEventListener("submit", async function (e) {
  e.preventDefault();

  const originalText = addButton.innerHTML;
  addButton.disabled = true;
  addButton.innerHTML = `<span class="spinner"></span> Processing...`;
  refundResult.innerHTML = ""; 

  const formData = new FormData(refundForm);
  const data = {
    stockID: formData.get("stockID").trim(),
    saleID: formData.get("saleID").trim(),
    productQuantity: parseInt(formData.get("productQuantity"))
  };

  try {
    const res = await fetch("/sales/refund", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });

    const result = await res.json();

    if (res.ok) {
      refundForm.reset();
      
      let htmlContent = `<p style="color:green; font-weight:bold; margin-bottom:15px;">${result.message}</p>`;

      if (result.billId) {
        // ✅ Agar billId mili to button dikhao
        htmlContent += `
          <a href="/sales/bill/${result.billId}" class="print-btn" style="
            display: inline-block;
            padding: 10px 20px;
            background-color: #06A56C;
            color: white;
            text-decoration: none;
            border-radius: 5px;
            font-weight: bold;
          ">🖨️ Print Updated Bill</a>
        `;
      } else {
        // ❌ Agar billId nahi mili (purani sales)
        htmlContent += `<p style="color:#ce8600; font-size: 14px;">⚠️ Bill ID not found for this sale. Please check and print the updated bill from <b>History</b>.</p>`;
      }

      refundResult.innerHTML = htmlContent;

    } else {
      refundResult.innerHTML = `<span style="color:red; font-weight:bold;">${result.message || "❌ Refund failed"}</span>`;
    }

  } catch (err) {
    console.error(err);
    refundResult.innerHTML = `<span style="color:red; font-weight:bold;">❌ Something went wrong. Try again!</span>`;
  } finally {
    addButton.disabled = false;
    addButton.innerHTML = originalText;
  }
});