


document.getElementById("agentForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = e.target.name.value.trim();
  const phone = e.target.phone.value.trim();
  const cnic = e.target.cnic.value.trim();

  const messageEl = document.getElementById("message");
  messageEl.textContent = ""; // Clear previous messages

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
    e.target.name.value = "";
    e.target.phone.value = "";
    e.target.cnic.value = "";

  } catch (err) {
    console.error(err);
    messageEl.style.color = "red";
    messageEl.textContent = "Server error occurred. Try again!";
  }
});




