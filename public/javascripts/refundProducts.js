const refundForm = document.getElementById("refundForm");
const refundResult = document.getElementById("refundResult");
const addButton = document.getElementById("add");

refundForm.addEventListener("submit", async function (e) {
  e.preventDefault();

  // 1. Confirmation Box (English)
  const confirmRefund = confirm("Are you sure you want to refund this product back to the company?");
  
  if (!confirmRefund) {
    return; // Agar user cancel kare toh yahin ruk jao
  }

  const formData = new FormData(refundForm);
  const q = formData.get("productQuantity");
  const s = formData.get("stockID");

  const data = {
    stockID: s ? s.trim() : "",
    refundQuantity: Number(q)
  };

  const apiEndpoint = "/products/refund"; 

  // Button ko disable karein taake double click na ho
  addButton.disabled = true;
  addButton.innerHTML = "Processing...";

  try {
    const res = await fetch(apiEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });

    // Backend se message uthao (Text format mein)
    const result = await res.text();

    if (res.ok) {
      // ✅ Success: Green message aur form reset
      refundResult.innerHTML = `<span style="color:green; font-weight:bold;">${result}</span>`;
      refundForm.reset();
    } else {
      // ❌ Error: Backend ka bheja hua error laal rang mein dikhao
      // Maslan: "❌ Product not found" ya "❌ Stock short!"
      refundResult.innerHTML = `<span style="color:red; font-weight:bold;">${result}</span>`;
    }

  } catch (err) {
    // Network error ke liye
    refundResult.innerHTML = `<span style="color:red; font-weight:bold;">❌ Request Failed! Check your internet connection.</span>`;
  } finally {
    // Button ko wapas normal kar do
    addButton.disabled = false;
    addButton.innerHTML = "Refund Now";
  }
});