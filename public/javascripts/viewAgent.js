
// Toggle Date Inputs
const filterSelect = document.getElementById("filter");
function toggleDateInputs(value) {
  const from = document.getElementById("from");
  const to = document.getElementById("to");
  if (value === "custom") {
    from.style.display = "inline-block";
    to.style.display = "inline-block";
  } else {
    from.style.display = "none";
    to.style.display = "none";
  }
}

filterSelect.addEventListener("change", function () {
  toggleDateInputs(this.value);
});

// Initial load check
toggleDateInputs(filterSelect.value);

// --- Baqi Pay/Delete logic (Same as yours) ---

// Pay button toggle
document.querySelectorAll(".pay-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const id = btn.dataset.id;
    const box = document.getElementById(`paybox-${id}`);
    box.style.display = box.style.display === "none" ? "block" : "none";
  });
});

// Submit payment
document.querySelectorAll(".submit-btn").forEach(btn => {
  btn.addEventListener("click", async () => {
    const id = btn.dataset.id;
    const total = Number(btn.dataset.total);
    const paid = Number(btn.dataset.paid);
    const input = document.getElementById(`payInput-${id}`);
    const addAmount = Number(input.value);

    if (!addAmount || addAmount <= 0) {
      alert("Enter valid amount");
      return;
    }

    if (paid + addAmount > total) {
      alert("❌ Amount cannot exceed percentage amount!");
      return;
    }

    try {
      const res = await fetch(`/agents/pay-item/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: addAmount })
      });
      const data = await res.json();
      if (data.success) {
        alert("Payment Added Successfully!");
        location.reload();
      } else {
        alert("Payment Failed!");
      }
    } catch (err) {
      console.error("Payment Error:", err);
      alert("Payment Failed!");
    }
  });
});

// Delete item
document.querySelectorAll(".delete-btn").forEach(btn => {
  btn.addEventListener("click", async () => {
    const itemId = btn.dataset.id;
    if (!confirm("Are you sure you want to delete this item?")) return;

    try {
      const res = await fetch(`/agents/delete-item/${itemId}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        alert("Item deleted successfully!");
        location.reload();
      } else {
        alert(data.message || "Failed to delete item");
      }
    } catch (err) {
      console.error("Delete Item Error:", err);
      alert("Error deleting item");
    }
  });
});
