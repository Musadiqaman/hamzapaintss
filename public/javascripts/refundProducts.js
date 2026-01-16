const refundForm = document.getElementById("refundForm");
const refundResult = document.getElementById("refundResult");
const addButton = document.getElementById("add");

refundForm.addEventListener("submit", async function (e) {
  e.preventDefault();

  const formData = new FormData(refundForm);
  
  // HTML mein input ka name 'productQuantity' hai, wahan se value uthao
  const q = formData.get("productQuantity");
  const s = formData.get("stockID");

  const data = {
    stockID: s ? s.trim() : "",
    refundQuantity: Number(q) // NaN se bachne ke liye Number use karein
  };

  // 404 se bachne ke liye confirmation: 
  // Agar aapka backend route /products ke andar hai to URL sahi hai.
  // Agar direct route hai to sirf "/company-refund" hoga.
  const apiEndpoint = "/products/refund"; 

  addButton.disabled = true;
  addButton.innerHTML = "Processing...";

  try {
    const res = await fetch(apiEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });

    const result = await res.text();

    if (res.status === 404) {
        refundResult.innerHTML = `<span style="color:red">❌ Error 404: Route not found. Check if URL is ${apiEndpoint}</span>`;
    } else {
        refundResult.innerHTML = `<span style="color:${res.ok ? 'green' : 'red'}">${result}</span>`;
        if (res.ok) refundForm.reset();
    }

  } catch (err) {
    refundResult.innerHTML = `<span style="color:red">❌ Request Failed!</span>`;
  } finally {
    addButton.disabled = false;
    addButton.innerHTML = "Refund Now";
  }
});