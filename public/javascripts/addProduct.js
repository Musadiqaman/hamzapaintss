document.addEventListener('DOMContentLoaded', () => {

    // ===============================================
    // 1. BILL ID
    // ===============================================

    const currentBillID = `${Date.now().toString(36).slice(-4)}${Math.random().toString(36).substring(2, 5)}`.toUpperCase();


    // ===============================================
    // 2. DATA
    // ===============================================

    const dataProvider = document.getElementById('db-data-provider');
    let dbDefinitions = [];

    if (dataProvider) {
        try {
            dbDefinitions = JSON.parse(
                dataProvider.getAttribute('data-definitions') || "[]"
            );
        } catch (e) {
            console.error("Data parse error:", e);
        }
    }


    // ===============================================
    // 3. ELEMENTS
    // ===============================================

    const companySelect      = document.getElementById("companySelect");
    const brandNameSelect    = document.getElementById("brandName");
    const itemNameSelect     = document.getElementById("itemName");
    const quantitativeSelect = document.getElementById("quantitative");
    const colourCodeSelect   = document.getElementById("colourCode");

    const addBtn    = document.getElementById("add");
    const submitBtn = document.querySelector(".submit-btn");
    const tableBody = document.getElementById("tableBody");

    let tempProducts = [];


    // ===============================================
    // 4. QR GENERATOR
    // ===============================================

    async function generateQrData(text) {
        try {
            const qrData = await QRCode.toDataURL(text, { width: 200, margin: 2 });
            return qrData;
        } catch (err) {
            console.error("QR Error:", err);
            return "";
        }
    }


    // ===============================================
    // 5. BRAND DROPDOWN
    // ===============================================

    brandNameSelect.addEventListener("change", function () {

        const brand = dbDefinitions.find(d => d.brandName === this.value);

        itemNameSelect.innerHTML     = '<option value="">Select Item</option>';
        quantitativeSelect.innerHTML = '<option value="">Select Unit</option>';
        colourCodeSelect.innerHTML   = '<option value="">Select Colour</option>';
        colourCodeSelect.disabled    = true;

        if (brand) {
            brand.units?.forEach(u => {
                const opt = document.createElement("option");
                opt.value = opt.textContent = (typeof u === 'object' ? u.unitname : u);
                quantitativeSelect.appendChild(opt);
            });

            brand.products?.forEach(p => {
                const opt = document.createElement("option");
                opt.value = opt.textContent = p.itemName;
                itemNameSelect.appendChild(opt);
            });
        }
    });


    // ===============================================
    // 6. ITEM DROPDOWN
    // ===============================================

    itemNameSelect.addEventListener("change", function () {

        const brand = dbDefinitions.find(d => d.brandName === brandNameSelect.value);

        colourCodeSelect.innerHTML = '<option value="">Select Colour</option>';

        const product = brand?.products?.find(p => p.itemName === this.value);

        if (product?.colors?.length > 0) {
            product.colors.forEach(c => {
                const opt = document.createElement("option");
                const val = c.code ? `${c.colour} (Code: ${c.code})` : c.colour;
                opt.value = opt.textContent = val;
                colourCodeSelect.appendChild(opt);
            });
            colourCodeSelect.disabled = false;
        } else {
            colourCodeSelect.disabled = true;
        }
    });


    // ===============================================
    // 7. RENDER TABLE
    // ===============================================

    function renderTable() {

        tableBody.innerHTML = tempProducts.length === 0
            ? `<tr><td colspan="9" style="text-align:center;padding:20px;">No products added yet.</td></tr>`
            : "";

        tempProducts.forEach((p, i) => {
            tableBody.insertAdjacentHTML('beforeend', `
                <tr>
                    <td>${p.brandName}</td>
                    <td>${p.itemName}</td>
                    <td>
                        <div class="qr-wrapper">
                            ${p.qrCode
                                ? `<img src="${p.qrCode}" width="55" class="qr-image">
                                   <button class="print-btn" 
    data-qr="${p.qrCode}" 
    data-brand="${p.brandName}" 
    data-item="${p.itemName}" 
    data-colour="${p.colourName}"
    data-unit="${p.qty}" >🖨 Print</button>`
                                : `<b style="color:red">QR Error</b>`
                            }
                        </div>
                    </td>
                    <td>${p.colourName}</td>
                    <td>${p.qty}</td>
                    <td>${p.totalProduct}</td>
                    <td>Rs ${p.rate}</td>
                    <td>Rs ${p.saleRate}</td>
                    <td>
                        <button type="button" class="delete-btn" data-index="${i}" id="delete" >Delete</button>
                    </td>
                </tr>
            `);
        });

        // Summary
        const oldSummary = document.getElementById("productSummary");
        if (oldSummary) oldSummary.remove();

        if (tempProducts.length > 0) {
            const totalQty    = tempProducts.reduce((s, p) => s + p.totalProduct, 0);
            const totalAmount = tempProducts.reduce((s, p) => s + (p.totalProduct * p.rate), 0);

            const summaryDiv = document.createElement("div");
            summaryDiv.id = "productSummary";
            summaryDiv.style.cssText = `
                margin-top:12px; padding:10px 16px;
                background:#e3f2fd; border:1px solid #90caf9;
                border-radius:8px; font-size:15px;
                font-weight:bold; color:#0d47a1;
                display:flex; gap:30px;
            `;
            summaryDiv.innerHTML = `
                <span>📦 Total Items: ${totalQty}</span>
                <span>💰 Total Amount: Rs ${totalAmount.toFixed(2)}</span>
            `;
            document.querySelector(".table-container")
                .insertAdjacentElement("afterend", summaryDiv);
        }
    }


let hiddencompany=document.querySelector(".hidden-company");

hiddencompany.addEventListener("click",function(){

    let companySection=document.querySelector(".selectcompany");
    if(companySection.style.display==="none"){
        companySection.style.display="block";
       
    }       

    else{
        companySection.style.display="none";
    }
});

    // ===============================================
    // 8. ADD PRODUCT
    // ===============================================

    addBtn.addEventListener("click", async function () {

        const b     = brandNameSelect.value;
        const item  = itemNameSelect.value;
        const total = parseInt(document.getElementById("totalProduct").value);
        const pRate = parseFloat(document.getElementById("rate").value);
        const sRate = parseFloat(document.getElementById("saleRate").value);

        if (!b || !item || isNaN(total) || total <= 0 || isNaN(pRate) || isNaN(sRate)) {
            alert("⚠️ Please fill all required fields!");
            return;
        }

        addBtn.disabled  = true;
        addBtn.innerText = "Generating QR...";

        const prefix  = item.slice(0, 3).toUpperCase();
        const stockID = `${prefix}-${Date.now().toString(36).slice(-4)}${Math.random().toString(36).substring(2, 6)}`.toUpperCase();

        const qrBase64 = await generateQrData(stockID);

        tempProducts.push({
            stockID,
            brandName:    b,
            itemName:     item,
            colourName:   colourCodeSelect.value    || 'N/A',
            qty:          quantitativeSelect.value  || 'N/A',
            totalProduct: total,
            rate:         pRate,
            saleRate:     sRate,
            qrCode:       qrBase64
        });

        renderTable();

        document.getElementById("totalProduct").value = "";
        document.getElementById("rate").value         = "";
        document.getElementById("saleRate").value     = "";

        addBtn.disabled  = false;
        addBtn.innerText = "Add Product";
    });


    // ===============================================
    // 9. SUBMIT & SAVE
    // ===============================================

    submitBtn.addEventListener("click", async function () {

        if (tempProducts.length === 0) {
            return alert("⚠️ Table is empty! Pehle products add karein.");
        }

        const companyId = companySelect ? companySelect.value : "";

        submitBtn.disabled  = true;
        submitBtn.innerText = "Saving...";

        try {
            const res = await fetch("/products/add-multiple", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    products:  tempProducts,
                    billID:    currentBillID,
                    companyId: companyId || null
                })
            });

            const data = await res.json();

            if (data.success) {
                alert("✅ Products saved successfully!");

                // localStorage mein save karo print ke liye
                // billtype backend se aa raha hai — wahi sahi hai
                localStorage.setItem("lastAddedProducts",   JSON.stringify(tempProducts));
                localStorage.setItem("lastProductBillID",   currentBillID);
                localStorage.setItem("lastProductBillType", data.billtype || "none");

                window.open("/products/print", "_blank");
                location.reload();
                // Reset
                tempProducts = [];
                renderTable();

            } else {
                alert("❌ Failed: " + (data.message || "Unknown error"));
            }

        } catch (e) {
            alert("❌ Network error! Server se connection nahi hua.");
        } finally {
            submitBtn.disabled  = false;
            submitBtn.innerText = "Submit & Save";
        }
    });


    // ===============================================
    // 10. TABLE EVENTS (Delete + Print)
    // ===============================================

    tableBody.addEventListener("click", (e) => {

        // Delete
        if (e.target.classList.contains("delete-btn")) {
            tempProducts.splice(e.target.dataset.index, 1);
            renderTable();
        }

        // Print QR
        if (e.target.classList.contains("print-btn")) {
            printQR(
        e.target.dataset.qr,
        e.target.dataset.brand,
        e.target.dataset.item,
        e.target.dataset.colour,
        e.target.dataset.unit
    );
        }
    });


    // ===============================================
    // 11. PRINT QR
    // ===============================================

    function printQR(qrCode, brandName, itemName, colourName,unitName) {
    const printContainer = document.getElementById("print-container");
    printContainer.innerHTML = `
        <div style="text-align:center; font-family:sans-serif;">
            <img src="${qrCode}" style="width:180px;height:180px;object-fit:contain; display:block; margin:0 auto;">
            <div style="font-size:14px; font-weight:bold; margin-top:6px;">${brandName}</div>
            <div style="font-size:12px; color:#444; margin-top:2px;">${itemName}</div>
            <div style="font-size:11px; color:#666; margin-top:2px;">${colourName || 'N/A'}</div>
             <div style="font-size:13px; font-weight:bold; color:#666; margin-top:2px;">${unitName || 'N/A'}</div>
        </div>
    `;
    window.print();
}


    // ===============================================
    // INIT
    // ===============================================

    renderTable();

});



