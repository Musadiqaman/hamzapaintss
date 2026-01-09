document.addEventListener("DOMContentLoaded", function () {
      // 1. LocalStorage se data nikaalna
      const savedData = localStorage.getItem("lastAddedSales");
      const customerName = localStorage.getItem("lastCustomerName"); // Name fetch kiya
      
      const tbody = document.getElementById("billTableBody");
      const totalItemsSpan = document.getElementById("billTotalItems");
      const totalAmountSpan = document.getElementById("billTotalAmount");
      const displayNameSpan = document.getElementById("displayName");

      // 2. Name Display Logic
      if (customerName) {
        displayNameSpan.innerText = customerName;
      } else {
        displayNameSpan.innerText = "...................."; // Agar naam na ho
      }

      if (savedData) {
        const sales = JSON.parse(savedData);
        let tableHTML = "";
        let totalAmount = 0;

        // 3. Loop chala kar rows banana
        sales.forEach(s => {
          const rowTotal = parseFloat((s.quantitySold * s.rate).toFixed(2));
          totalAmount += rowTotal;

          tableHTML += `
            <tr>
              <td>${s.stockID}</td>
              <td>${s.saleID}</td>
              <td>${s.itemName}</td>
              <td>${s.colourName}</td>
              <td>${s.qty }</td>
              <td>${s.quantitySold}</td>
              <td>Rs ${parseFloat(s.rate).toFixed(2)}</td>
              <td>Rs ${rowTotal.toFixed(2)}</td>
            </tr>`;
        });

        tbody.innerHTML = tableHTML;
        totalItemsSpan.innerText = `Total items: ${sales.length}`;
        totalAmountSpan.innerText = `Total amount: Rs ${totalAmount.toFixed(2)}`;

        // Optional: Auto Print
        // window.print();

      } else {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;">No bill data found to print</td></tr>`;
      }
    });

    