document.getElementById("agentForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = e.target.name.value.trim();
  const phone = e.target.phone.value.trim();
  const cnic = e.target.cnic.value.trim();
  const messageEl = document.getElementById("message");
  
  // 1. Button aur Loader setup
  const addButton = document.getElementById("add");
  const originalText = addButton.innerHTML; // "Add Agent" save kiya

  messageEl.textContent = ""; // Clear previous messages

  // 2. Button ko disable aur loading state mein laayein
  addButton.disabled = true;
  addButton.innerHTML = `<span class="spinner"></span> Adding...`;

  try {
    const res = await fetch("/agents/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, phone, cnic })
    });

    const data = await res.json();

    if (!data.success) {
      messageEl.style.color = "red";
      messageEl.textContent = data.message;
      return;
    }

    messageEl.style.color = "green";
    messageEl.textContent = "Agent Successfully Added!";

    // Clear the form
    e.target.reset(); // reset() function form ko poora clear kar deta hai

  } catch (err) {
    console.error(err);
    messageEl.style.color = "red";
    messageEl.textContent = "Server error occurred. Try again!";
  } finally {
    // 3. Kaam khatam hone par button reset karein
    addButton.disabled = false;
    addButton.innerHTML = originalText;
  }
});