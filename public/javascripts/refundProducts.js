const refundForm = document.getElementById("refundForm");
const refundResult = document.getElementById("refundResult");
const addButton = document.getElementById("add");

refundForm.addEventListener("submit", async function (e) {
  e.preventDefault();

  // 1. Loader Setup
  const originalText = addButton.innerHTML; // "Refund Now" ko save kiya
  addButton.disabled = true; // Multiple clicks block kiye
  addButton.innerHTML = `<span class="spinner"></span> Processing...`; // Spinner dikhaya

  const formData = new FormData(refundForm);
  const data = {
    stockID: formData.get("stockID").trim(),
    saleID: formData.get("saleID").trim(),
    productQuantity: parseInt(formData.get("productQuantity"))
  };

  try {
    // Call refund API
    const res = await fetch("/products/refund", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });

    const result = await res.text();

    // ✅ Show refund message
    refundResult.innerHTML = `<span style="color:${res.ok ? 'green' : 'red'}">${result}</span>`;

    if (res.ok) {
      refundForm.reset();
    }

  } catch (err) {
    console.error(err);
    refundResult.innerHTML = `<span style="color:red">❌ Something went wrong. Try again!</span>`;
  } finally {
    // 2. Reset Button (Finally block hamesha chalta hai chahe success ho ya error)
    addButton.disabled = false;
    addButton.innerHTML = originalText;
  }
});