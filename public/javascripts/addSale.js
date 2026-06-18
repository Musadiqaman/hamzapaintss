// ===============================================
// 1. INITIAL DATA & SIMPLE ID GENERATION
// ===============================================

const currentBillID =
    `${Date.now().toString(36).slice(-4)}${Math.random().toString(36).substring(2, 5)}`
    .toUpperCase();


// ===============================================
// 2. GLOBAL VARIABLES
// ===============================================

const agentSelect = document.getElementById("agentSelect");
const agentPercentage = document.getElementById("agentPercentage");

const initialProducts = JSON.parse(
    document.getElementById("productData").textContent
);

let products = JSON.parse(JSON.stringify(initialProducts));

let tempSales = [];


// ===============================================
// 3. FORM ELEMENTS
// ===============================================

const brandSelect = document.getElementById("brandSelect");

const itemSelect = document.getElementById("itemSelect");

const unitSelect = document.getElementById("unitSelect");

const allColoursSelect =
    document.getElementById("allColours");

const colourSelect =
    document.getElementById("colourSelect");

const quantitySold =
    document.getElementById("quantitySold");

const rate = document.getElementById("rate");

const totalStock =
    document.getElementById("totalStock");

const qrInput =
    document.getElementById("qrScannerInput");


// ===============================================
// 4. AGENT PERCENTAGE
// ===============================================

agentSelect.addEventListener("change", function () {

    agentPercentage.style.display =
        this.value ? "inline-block" : "none";

    if (!this.value) {
        agentPercentage.value = "";
    }
});


// ===============================================
// 5. DROPDOWN EVENTS
// ===============================================

brandSelect.addEventListener("change", function () {

    resetFieldsBelowBrand();

    if (this.value) {
        updateItemDropdown(this.value);
    }
});


itemSelect.addEventListener("change", function () {

    resetUnitColourAndInputs();

    if (this.value) {
        updateUnitColourDropdown(
            brandSelect.value,
            this.value
        );
    }
});


unitSelect.addEventListener("change", function () {

    resetOptionAndInputs();

    updateAllColoursDropdown(
        brandSelect.value,
        itemSelect.value,
        this.value
    );
});


allColoursSelect.addEventListener("change", function () {

    resetOptionAndInputs();

    updateOptionDropdown(
        brandSelect.value,
        itemSelect.value,
        unitSelect.value,
        this.value
    );
});


colourSelect.addEventListener("change", function () {

    const opt = this.selectedOptions[0];

    if (opt && opt.value) {

        rate.value = opt.dataset.rate || 0;

        totalStock.value =
            opt.dataset.remaining || 0;

    } else {

        rate.value = "";

        totalStock.value = "";
    }
});


// ===============================================
// 6. UPDATE ITEM DROPDOWN
// ===============================================

function updateItemDropdown(brand) {

    const items = [
        ...new Set(
            products
                .filter(p =>
                    p.brandName === brand &&
                    p.remaining > 0
                )
                .map(p => p.itemName)
        )
    ];

    itemSelect.innerHTML =
        `<option value="">Select Item</option>` +
        items.map(i =>
            `<option value="${i}">${i}</option>`
        ).join("");

    itemSelect.disabled = items.length === 0;
}


// ===============================================
// 7. UPDATE UNIT DROPDOWN
// ===============================================

function updateUnitColourDropdown(brand, item) {

    const matches = products.filter(p =>
        p.brandName === brand &&
        p.itemName === item &&
        p.remaining > 0
    );

    const hasUnit = matches.some(p =>
        p.qty &&
        p.qty.trim() !== "" &&
        p.qty.toUpperCase() !== "N/A"
    );

    const hasColour = matches.some(p =>
        p.colourName &&
        p.colourName.trim() !== "" &&
        p.colourName.toUpperCase() !== "N/A"
    );

    resetUnitColourAndInputs();

    if (!hasUnit) {

        unitSelect.disabled = true;

        unitSelect.innerHTML =
            `<option value="">No Unit</option>`;

        if (hasColour) {

            updateAllColoursDropdown(
                brand,
                item,
                ""
            );

        } else {

            updateOptionDropdown(
                brand,
                item,
                "",
                "",
                matches
            );
        }

        return;
    }

    const units = [
        ...new Set(
            matches
                .map(p => p.qty)
                .filter(u =>
                    u &&
                    u.toUpperCase() !== "N/A"
                )
        )
    ];

    unitSelect.innerHTML =
        `<option value="">Select Unit</option>` +
        units.map(u =>
            `<option value="${u}">${u}</option>`
        ).join("");

    unitSelect.disabled = false;
}


// ===============================================
// 8. UPDATE COLOUR DROPDOWN
// ===============================================

function updateAllColoursDropdown(
    brand,
    item,
    unit
) {

    const filtered = products.filter(p =>

        p.brandName === brand &&
        p.itemName === item &&

        (
            unit
                ? p.qty === unit
                : (
                    !p.qty ||
                    p.qty.toUpperCase() === "N/A"
                )
        ) &&

        p.remaining > 0
    );

    const hasColour = filtered.some(p =>

        p.colourName &&
        p.colourName.trim() !== "" &&
        p.colourName.toUpperCase() !== "N/A"
    );

    if (!hasColour) {

        allColoursSelect.disabled = true;

        allColoursSelect.innerHTML =
            `<option value="">No Colour</option>`;

        updateOptionDropdown(
            brand,
            item,
            unit,
            "",
            filtered
        );

        return;
    }

    const colours = [

        ...new Set(

            filtered
                .map(p => p.colourName)
                .filter(c =>
                    c &&
                    c.toUpperCase() !== "N/A"
                )
        )
    ];

    allColoursSelect.innerHTML =
        `<option value="">Select Colour</option>` +

        colours.map(c =>
            `<option value="${c}">${c}</option>`
        ).join("");

    allColoursSelect.disabled = false;
}


// ===============================================
// 9. UPDATE STOCK OPTIONS
// ===============================================

function updateOptionDropdown(
    brand,
    item,
    unit,
    colourName,
    preFiltered = null
) {

    const filtered =
        preFiltered ||

        products.filter(p =>

            p.brandName === brand &&
            p.itemName === item &&

            (
                unit
                    ? p.qty === unit
                    : (
                        !p.qty ||
                        p.qty.toUpperCase() === "N/A"
                    )
            ) &&

            (
                colourName
                    ? p.colourName === colourName
                    : (
                        !p.colourName ||
                        p.colourName.toUpperCase() === "N/A"
                    )
            ) &&

            p.remaining > 0
        );

    colourSelect.innerHTML =
        `<option value="">Select Stock</option>` +

        filtered.map(p => {

            let detail = p.itemName;

            if (
                p.qty &&
                p.qty.toUpperCase() !== "N/A"
            ) {
                detail += ` | ${p.qty}`;
            }

            if (
                p.colourName &&
                p.colourName.toUpperCase() !== "N/A"
            ) {
                detail += ` | ${p.colourName}`;
            }

            return `
            <option
                value="${p.stockID}"
                data-remaining="${p.remaining}"
                data-rate="${p.saleRate}"
            >
                ${detail} — Rate: ${p.rate} | Stock: ${p.remaining}
            </option>
            `;
        }).join("");

    colourSelect.disabled =
        filtered.length === 0;
}


// ===============================================
// 10. REALTIME STOCK SYNC
// ===============================================

function syncVisibleStock(stockID) {

    const updatedProduct = products.find(
        p => String(p.stockID) === String(stockID)
    );

    if (!updatedProduct) return;

    const option = Array.from(
        colourSelect.options
    ).find(
        opt => String(opt.value) === String(stockID)
    );

    if (option) {

        option.dataset.remaining =
            updatedProduct.remaining;

        let detail = updatedProduct.itemName;

        if (
            updatedProduct.qty &&
            updatedProduct.qty.toUpperCase() !== "N/A"
        ) {
            detail += ` | ${updatedProduct.qty}`;
        }

        if (
            updatedProduct.colourName &&
            updatedProduct.colourName.toUpperCase() !== "N/A"
        ) {
            detail += ` | ${updatedProduct.colourName}`;
        }

        option.textContent =
            `${detail} — Rate: ${updatedProduct.rate} | Stock: ${updatedProduct.remaining}`;
    }

    if (
        String(colourSelect.value) ===
        String(stockID)
    ) {

        totalStock.value =
            updatedProduct.remaining;
    }

    updateOptionDropdown(
        brandSelect.value,
        itemSelect.value,
        unitSelect.value,
        allColoursSelect.value
    );
}


// ===============================================
// 11. MANUAL ADD SALE
// ===============================================

document.getElementById("add").addEventListener("click", function () {
        const brand = brandSelect.value;
        const item = itemSelect.value;

        const option = colourSelect.selectedOptions[0];
        const qtyInput = parseInt(quantitySold.value) || 0;
        const rateVal = parseFloat(rate.value) || 0;

        if(
            !brand ||
            !item ||
            qtyInput <= 0 ||
            !option ||
            !option.value
        ) {
            alert(
                "⚠️ Please select all fields correctly."
            );

            return;
        }

        const prodIndex =
            products.findIndex(
                p =>
                    String(p.stockID) ===
                    String(option.value)
            );

        const selectedProduct =
            products[prodIndex];

        if (!selectedProduct) {

            alert("❌ Product not found.");

            return;
        }

        if(
            qtyInput >
            selectedProduct.remaining
        ) {

            alert(
                `⚠️ Only ${selectedProduct.remaining} available in stock.`
            );

            return;
        }

        selectedProduct.remaining -= qtyInput;

        syncVisibleStock(
            selectedProduct.stockID
        );

        const existingSale = tempSales.find(
            s =>
                String(s.stockID) ===
                String(selectedProduct.stockID)
        );

        if (existingSale) {
            existingSale.quantitySold += qtyInput;
            existingSale.total =existingSale.quantitySold * existingSale.rate;

        } else {

            const uniqueSaleID =
    `${Date.now().toString(36).slice(-3)}-${Math.random().toString(36).substring(2, 5)}`
    .toUpperCase();

            tempSales.push({
                stockID:selectedProduct.stockID,
                saleID:uniqueSaleID,
                brandName:selectedProduct.brandName,
                itemName:selectedProduct.itemName,
                qty:
                    (
                        selectedProduct.qty &&
                        selectedProduct.qty.toUpperCase() !== "N/A"
                    )
                        ? selectedProduct.qty
                        : "",

                colourName:
                    (
                        selectedProduct.colourName &&
                        selectedProduct.colourName.toUpperCase() !== "N/A"
                    )
                        ? selectedProduct.colourName
                        : "",

                quantitySold: qtyInput,

                rate: rateVal,
                total: qtyInput * rateVal
            });
        }

        renderTable();

        quantitySold.value = "";
    });



// ===============================================
// 12. QR INPUT ENTER
// ===============================================

qrInput.addEventListener("keydown", function (e) {

    if (e.key === "Enter") {

        const stockID =
            this.value.trim();

        this.value = "";

        addSaleByQR(stockID);
    }
});


// ===============================================
// 13. QR ADD SALE
// ===============================================

function addSaleByQR(stockID) {

    const product = products.find(
        p => String(p.stockID) === String(stockID)
    );

    if (!product) return alert("❌ Product not found!");
    if (product.remaining <= 0) return alert("⚠️ Out of stock!");

    product.remaining -= 1;

    syncVisibleStock(product.stockID);

    const existingSale = tempSales.find(
        s => String(s.stockID) === String(product.stockID)
    );

    if (existingSale) {

        existingSale.quantitySold += 1;

        // ✅ SALE RATE USED
        existingSale.total =
            existingSale.quantitySold * existingSale.rate;

    } else {

        tempSales.push({

            stockID: product.stockID,
            saleID: `${product.itemName.slice(0,3).toUpperCase()}-${Math.floor(10000 + Math.random()*90000)}`,
            brandName: product.brandName,
            itemName: product.itemName,
            qty: product.qty && product.qty.toUpperCase() !== "N/A" ? product.qty : "",
            colourName: product.colourName && product.colourName.toUpperCase() !== "N/A" ? product.colourName : "",

            quantitySold: 1,

            // ✅ ALWAYS SALE RATE
            rate: product.saleRate,
            total: product.saleRate
        });
    }

    renderTable();
}


// ===============================================
// 14. TABLE RENDER
// ===============================================

function renderTable() {
    const tbody = document.getElementById("saleTableBody");

    if (tempSales.length === 0) {
        tbody.innerHTML = `
        <tr class="no-data">
            <td colspan="8">
                No sales added yet
            </td>
        </tr>
        `;

        return;
    }

    tbody.innerHTML = tempSales.map((p, i) => `

    <tr>
        <td>${p.brandName}</td>
        <td>${p.itemName}</td>
        <td>${p.colourName}</td>
        <td>${p.qty}</td>
        <td><input type="number" min="1" value="${p.quantitySold}" class="edit-qty" data-index="${i}" style="width:70px;" /></td>
        <td><input type="number" value="${p.rate}" class="edit-rate" data-index="${i}" style="width:90px;" /> </td>
        <td> Rs ${(Number(p.total) || 0).toFixed(2)} </td>
        <td><button type="button" class="delete-sale delete-btn" data-index="${i}" id="delete">Delete</button></td>

    </tr>

    `).join("");


    // DELETE SALE

document.querySelectorAll(".delete-sale").forEach(btn => {

            btn.onclick = function () {

                const idx =
                    this.dataset.index;

                const sale =
                    tempSales[idx];

                const prod =
                    products.find(
                        p =>
                            String(p.stockID) ===
                            String(sale.stockID)
                    );

                if (prod) {

                    prod.remaining +=
                        sale.quantitySold;

                    syncVisibleStock(
                        prod.stockID
                    );
                }

                tempSales.splice(idx, 1);

                renderTable();
            };
        });


    // EDIT QTY

    document.querySelectorAll(".edit-qty").forEach(input => {
            input.addEventListener("change",function () {
                    const idx =
                        this.dataset.index;

                    const newQty =
                        parseInt(this.value) || 1;

                    const sale =
                        tempSales[idx];

                    const product =
                        products.find(
                            p =>
                                String(p.stockID) ===
                                String(sale.stockID)
                        );

                    if (!product) return;

                    const oldQty =
                        sale.quantitySold;

                    const diff =
                        newQty - oldQty;

                    if (
                        diff >
                        product.remaining
                    ) {

                        alert(
                            `⚠️ Only ${product.remaining} more available`
                        );

                        this.value = oldQty;

                        return;
                    }

                    product.remaining -= diff;

                    syncVisibleStock(
                        product.stockID
                    );

                    sale.quantitySold =
                        newQty;

                    sale.total =
                        sale.quantitySold *
                        sale.rate;

                    renderTable();
                }
            );
        });


    // EDIT RATE

  document.querySelectorAll(".edit-rate").forEach(input => {
    input.addEventListener("change", function () {

        const idx = this.dataset.index;
        const newRate = parseFloat(this.value) || 0;

        tempSales[idx].rate = newRate;

        tempSales[idx].total =
            tempSales[idx].quantitySold * newRate;

        renderTable();
    });
});

// ✅ Summary
const totalItems  = tempSales.reduce((sum, s) => sum + s.quantitySold, 0);
const totalAmount = tempSales.reduce((sum, s) => sum + (Number(s.total) || 0), 0);

const oldSummary = document.getElementById("saleSummary");
if (oldSummary) oldSummary.remove();

const summaryDiv = document.createElement("div");
summaryDiv.id = "saleSummary";
summaryDiv.style.cssText = `
    margin-top:12px; padding:10px 16px;
    background:#e8f5e9; border:1px solid #a5d6a7;
    border-radius:8px; font-size:15px;
    font-weight:bold; color:#1b5e20;
    display:flex; gap:30px;
`;
summaryDiv.innerHTML = `
    <span>🧾 Total Items: ${totalItems}</span>
    <span>💰 Total Amount: Rs ${totalAmount.toFixed(2)}</span>
`;

const tableContainer = document.querySelector(".table-container");
tableContainer.insertAdjacentElement("afterend", summaryDiv);

}




// ===============================================
// 15. FINAL SUBMIT
// ===============================================

document
    .getElementById("submitBtn")
    .addEventListener(
        "click",
        async function () {

            const customerName =
                document
                    .getElementById("customerName")
                    .value
                    .trim();

            const customerSelect =
                document.getElementById(
                    "customerSelect"
                );

            const customerId =
                customerSelect
                    ? customerSelect.value
                    : null;

            if (!customerName) {
                alert(
                    "⚠️ Please enter Client Name."
                );
                return;
            }

            if (tempSales.length === 0) {
                alert(
                    "⚠️ Add at least one sale."
                );
                return;
            }

            // 📞 Selected option se customer ka phone number (data-phone) nikalne ke liye logic
            const selectedOption = customerSelect ? customerSelect.selectedOptions[0] : null;
            const customerPhone = (selectedOption && selectedOption.value) ? (selectedOption.dataset.phone || "") : "";

            // 🔥 Umar bhai, aapka requested dynamic billtype format yahan set ho gaya:
            let finalBillType = (customerId && customerId !== "")
                ? `Kata | ${customerPhone}`
                : "cash";

            const submitBtn = this;

            const originalText =
                submitBtn.innerHTML;

            submitBtn.disabled = true;

            submitBtn.innerHTML =
                "Saving Sales...";

            const payload = {
                customerName,
                billtype: finalBillType, // Backend par "Kata | 03xxxxxxxxx" jayega
                customerId: customerId || null,
                billID: currentBillID,
                sales: tempSales,
                agentID: agentSelect.value || null,
                percentage:
                    parseFloat(
                        agentPercentage.value
                    ) || 0
            };

            try {

                const res = await fetch(
                    "/sales/add",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type":
                                "application/json"
                        },
                        body:
                            JSON.stringify(payload)
                    }
                );

                const data =
                    await res.json();

                if (data.success) {

                    alert(
                        "✅ Sales Saved Successfully!"
                    );

                    localStorage.setItem(
                        "lastAddedSales",
                        JSON.stringify(tempSales)
                    );

                    localStorage.setItem(
                        "lastCustomerName",
                        customerName
                    );

                    // 💾 Invoice print/backup ke liye local storage mein alag se bhi save kar diya
                    localStorage.setItem(
                        "lastCustomerPhone",
                        customerPhone
                    );

                    localStorage.setItem(
                        "lastSalesBillID",
                        payload.billID
                    );

                    localStorage.setItem(
                        "lastBillType",
                        payload.billtype // Print page ko bhi "Kata | 03xxxxxxxxx" milega
                    );

                    window.open(
                        `/sales/print`,
                        "_blank"
                    );

                    location.reload();

                } else {

                    alert(
                        "❌ Failed: " +
                        (
                            data.message ||
                            "Unknown error"
                        )
                    );

                    submitBtn.disabled = false;

                    submitBtn.innerHTML =
                        originalText;
                }

            } catch (err) {

                alert(
                    "❌ Server Connection Error!"
                );

                submitBtn.disabled = false;

                submitBtn.innerHTML =
                    originalText;
            }
        }
    );


// ===============================================
// 16. RESET HELPERS
// ===============================================

function refreshCurrentSelection() {

    updateOptionDropdown(
        brandSelect.value,
        itemSelect.value,
        unitSelect.value,
        allColoursSelect.value
    );

    quantitySold.value = "";

    rate.value = "";

    totalStock.value = "";
}


function resetOptionAndInputs() {

    colourSelect.innerHTML =
        `<option value="">Select Option</option>`;

    colourSelect.disabled = true;

    quantitySold.value = "";

    rate.value = "";

    totalStock.value = "";
}


function resetUnitColourAndInputs() {

    unitSelect.innerHTML =
        `<option value="">Select Unit</option>`;

    unitSelect.disabled = true;

    allColoursSelect.innerHTML =
        `<option value="">Select Colour</option>`;

    allColoursSelect.disabled = true;

    resetOptionAndInputs();
}


function resetFieldsBelowBrand() {

    itemSelect.innerHTML =
        `<option value="">Select Item</option>`;

    itemSelect.disabled = true;

    resetUnitColourAndInputs();
}



let hiddenqr=document.querySelector(".hidden-qr");

hiddenqr.addEventListener("click",function(){

    let qrSection=document.querySelector(".qr");
    if(qrSection.style.display==="none"){
        qrSection.style.display="block";
        this.textContent="Hide";
    }       

    else{
        qrSection.style.display="none";
        this.textContent="Show QR Scanner";
    }
});


let hiddenmanual=document.querySelector(".hidden-manual");

hiddenmanual.addEventListener("click",function(){   
    let manualSection=document.querySelector(".manual");
    if(manualSection.style.display==="none"){
        manualSection.style.display="block";
        this.textContent="Hide";
    }   
    else{
        manualSection.style.display="none";
        this.textContent="Show Manual Form";
    }   
});




let html5QrCode;

document.getElementById("scanQRBtn").addEventListener("click", function () {

    const qrReader = document.getElementById("qr-reader");
    qrReader.style.display = "block";

    const html5QrCode = new Html5Qrcode("qr-reader");

    const config = {
        fps: 10,
        qrbox: 250,
        facingMode: { exact: "environment" } // 🔥 back camera force
    };

    html5QrCode.start(
        { facingMode: "environment" }, // better than deviceId
        config,
        (decodedText) => {

            html5QrCode.stop();
            qrReader.style.display = "none";

            addSaleByQR(decodedText);
            qrInput.focus();
        },
        (errorMessage) => {
            // ignore scan errors
        }
    ).catch(err => {

        // fallback if environment camera not available (laptop case)
        console.log("Back camera not found, switching to default:", err);

        html5QrCode.start(
            { facingMode: "user" },
            config,
            (decodedText) => {

                html5QrCode.stop();
                qrReader.style.display = "none";

                addSaleByQR(decodedText);
                qrInput.focus();
            },
            (errorMessage) => {}
        );

    });
});



document.getElementById("qrImageInput").addEventListener("change", function (e) {

    const file = e.target.files[0];
    if (!file) return;

    const html5QrCode = new Html5Qrcode("qr-reader");

    html5QrCode.scanFile(file, false)
        .then(decodedText => {

            // console.log("QR:", decodedText);
            addSaleByQR(decodedText);

        })
        .catch(err => {
            console.log(err);
            alert("QR detect nahi hua");
        });
});



// ===============================================
// INIT
// ===============================================

renderTable();


