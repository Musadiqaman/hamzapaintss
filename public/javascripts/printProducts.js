 document.addEventListener("DOMContentLoaded", function () {
      // 1. LocalStorage se data nikaalna
      const savedData = localStorage.getItem("lastAddedProducts");
      const tbody = document.getElementById("printTableBody");
      const totalItemsSpan = document.getElementById("totalItemsCount");
      const grandTotalSpan = document.getElementById("grandTotalAmount");

      if (savedData) {
        const products = JSON.parse(savedData);
        let tableHTML = "";
        let totalAmount = 0;

        // 2. Data ko table rows mein convert karna
        products.forEach(p => {
          const total = parseFloat((p.totalProduct * p.rate).toFixed(2));
          totalAmount += total;

          tableHTML += `
            <tr>
              <td>${p.stockID}</td>
              <td>${p.brandName}</td>
              <td>${p.itemName}</td>
              <td>${p.colourName}</td>
              <td>${p.qty}</td>
              <td>${p.totalProduct}</td>
              <td>Rs ${parseFloat(p.rate).toFixed(2)}</td>
              <td>Rs ${total.toFixed(2)}</td>
            </tr>`;
        });

        // 3. UI Update karna
        tbody.innerHTML = tableHTML;
        totalItemsSpan.innerText = `Total Items: ${products.length}`;
        grandTotalSpan.innerText = `Total Amount: Rs ${totalAmount.toFixed(2)}`;

    

      } else {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;">No data found to print</td></tr>`;
      }
    });