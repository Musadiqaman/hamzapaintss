document.addEventListener("DOMContentLoaded", function () {

    // 1. LocalStorage se data nikaalna
    const savedData = localStorage.getItem("lastAddedProducts");
    const billID    = localStorage.getItem("lastProductBillID");
    const billType  = localStorage.getItem("lastProductBillType");

    // 2. Elements
    const tbody           = document.getElementById("printTableBody");
    const totalItemsSpan  = document.getElementById("totalItemsCount");
    const grandTotalSpan  = document.getElementById("grandTotalAmount");
    const displayBillID   = document.getElementById("displayBillID");
    const displayBillType = document.getElementById("displayBillType");

    // 3. Bill ID
    displayBillID.innerText = billID || "....................";

    // 4. Bill Type — backend se "Odhar | Name | Phone" ya "none" aata hai
    displayBillType.innerText = (billType && billType !== "none")
        ? billType
        : "Cash";

    // 5. Table Data
    if (savedData) {
        const products  = JSON.parse(savedData);
        let tableHTML   = "";
        let totalAmount = 0;

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

        tbody.innerHTML          = tableHTML;
        totalItemsSpan.innerText = `Total Items: ${products.length}`;
        grandTotalSpan.innerText = `Total Amount: Rs ${totalAmount.toFixed(2)}`;

    } else {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;">No data found to print</td></tr>`;
    }
});