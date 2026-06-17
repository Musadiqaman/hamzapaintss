document.getElementById('guestExpenseForm').addEventListener('submit', async (e) => {
    e.preventDefault(); // Real HTML reload ko sakhti se rokne k liye

    const button = document.getElementById('add');
    button.innerText = "⏳ Saving...";
    button.disabled = true;

    // Elements ko safely handle karna IDs ke zariye
    const guestName = document.getElementById('guestName').value;
    const title = document.getElementById('title').value;
    const amount = document.getElementById('amount').value;
    const remarks = document.getElementById('remarks').value;

    try {
        // Relative path without full domain string to bypass origin header injection
        const response = await fetch('/guest/add', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ guestName, title, amount, remarks })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            alert("✅ Guest Added Successfully!"); 
            document.getElementById('guestExpenseForm').reset(); // Form khali karein
        } else {
            // Agar backend se abhi bhi "Forbidden" ka error aaye
            alert(`❌ Error: ${data.message || 'Entry save nahi ho saki!'}`);
        }

    } catch (error) {
        console.error("Fetch error:", error);
        alert("❌ Server se connect nahi ho pa raha!");
    } finally {
        button.innerText = "Save Entry & Deduct from Profit";
        button.disabled = false;
    }
});





