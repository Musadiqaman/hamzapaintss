// ===============================================
// INITIAL DATA & AGENT LOGIC
// ===============================================
const agentSelect = document.getElementById("agentSelect");
const agentPercentage = document.getElementById("agentPercentage");

agentSelect.addEventListener("change", function () {
    agentPercentage.style.display = this.value ? "inline-block" : "none";
    if (!this.value) agentPercentage.value = "";
});

// Deep copy of product data to manage stock on front-end
const initialProducts = JSON.parse(document.getElementById("productData").textContent);
let products = JSON.parse(JSON.stringify(initialProducts));
let tempSales = [];

// FORM ELEMENTS
const brandSelect = document.getElementById("brandSelect");
const itemSelect = document.getElementById("itemSelect");
const unitSelect = document.getElementById("unitSelect");
const allColoursSelect = document.getElementById("allColours");
const colourSelect = document.getElementById("colourSelect");
const quantitySold = document.getElementById("quantitySold");
const rate = document.getElementById("rate");
const totalStock = document.getElementById("totalStock");

// ===============================================
// DROPDOWN EVENT LISTENERS
// ===============================================

brandSelect.addEventListener("change", function () {
    resetFieldsBelowBrand();
    if (this.value) updateItemDropdown(this.value);
});

itemSelect.addEventListener("change", function () {
    resetUnitColourAndInputs();
    if (this.value) updateUnitColourDropdown(brandSelect.value, this.value);
});

unitSelect.addEventListener("change", function () {
    resetOptionAndInputs();
    updateAllColoursDropdown(brandSelect.value, itemSelect.value, this.value);
});

allColoursSelect.addEventListener("change", function () {
    resetOptionAndInputs();
    updateOptionDropdown(brandSelect.value, itemSelect.value, unitSelect.value, this.value);
});

colourSelect.addEventListener("change", function () {
    const opt = this.selectedOptions[0];
    if (opt && opt.value) {
        rate.value = opt.dataset.rate || 0;
        totalStock.value = opt.dataset.remaining || 0;
    } else {
        rate.value = ""; totalStock.value = "";
    }
});

// ===============================================
// CORE LOGIC (FRONT-END STOCK MANAGEMENT)
// ===============================================

function updateItemDropdown(brand) {
    const items = [...new Set(products.filter(p => p.brandName === brand && p.remaining > 0).map(p => p.itemName))];
    itemSelect.innerHTML = `<option value="">Select Item</option>` + items.map(i => `<option value="${i}">${i}</option>`).join('');
    itemSelect.disabled = items.length === 0;
}

function updateUnitColourDropdown(brand, item) {
    const matches = products.filter(p => p.brandName === brand && p.itemName === item && p.remaining > 0);
    const hasUnit = matches.some(p => p.qty && p.qty.trim() !== "" && p.qty.toUpperCase() !== "N/A");
    const hasColour = matches.some(p => p.colourName && p.colourName.trim() !== "" && p.colourName.toUpperCase() !== "N/A");

    resetUnitColourAndInputs();

    if (!hasUnit) {
        unitSelect.disabled = true;
        unitSelect.innerHTML = `<option value="">No Unit</option>`;
        if (hasColour) updateAllColoursDropdown(brand, item, "");
        else updateOptionDropdown(brand, item, "", "", matches);
        return;
    }

    const units = [...new Set(matches.map(p => p.qty).filter(u => u && u.toUpperCase() !== "N/A"))];
    unitSelect.innerHTML = `<option value="">Select Unit</option>` + units.map(u => `<option value="${u}">${u}</option>`).join('');
    unitSelect.disabled = false;
}

function updateAllColoursDropdown(brand, item, unit) {
    const filtered = products.filter(p =>
        p.brandName === brand && p.itemName === item &&
        (unit ? p.qty === unit : (!p.qty || p.qty.toUpperCase() === "N/A")) && p.remaining > 0
    );

    const hasColour = filtered.some(p => p.colourName && p.colourName.trim() !== "" && p.colourName.toUpperCase() !== "N/A");

    if (!hasColour) {
        allColoursSelect.disabled = true;
        allColoursSelect.innerHTML = `<option value="">No Colour</option>`;
        updateOptionDropdown(brand, item, unit, "", filtered);
        return;
    }

    const colours = [...new Set(filtered.map(p => p.colourName).filter(c => c && c.toUpperCase() !== "N/A"))];
    allColoursSelect.innerHTML = `<option value="">Select Colour</option>` + colours.map(c => `<option value="${c}">${c}</option>`).join('');
    allColoursSelect.disabled = false;
}

function updateOptionDropdown(brand, item, unit, colourName, preFiltered = null) {
    const filtered = preFiltered || products.filter(p =>
        p.brandName === brand && p.itemName === item &&
        (unit ? p.qty === unit : (!p.qty || p.qty.toUpperCase() === "N/A")) &&
        (colourName ? p.colourName === colourName : (!p.colourName || p.colourName.toUpperCase() === "N/A")) &&
        p.remaining > 0
    );

    colourSelect.innerHTML = `<option value="">Select Stock Option</option>` +
        filtered.map(p => {
            let detail = p.itemName;
            if (p.qty && p.qty.toUpperCase() !== "N/A") detail += ` | ${p.qty}`;
            if (p.colourName && p.colourName.toUpperCase() !== "N/A") detail += ` | ${p.colourName}`;
            return `<option value="${p.stockID}" data-remaining="${p.remaining}" data-rate="${p.rate}">${detail} — Rate: ${p.rate} | Stock: ${p.remaining}</option>`;
        }).join('');

    colourSelect.disabled = filtered.length === 0;
}

// ===============================================
// ADD / DELETE / SUBMIT (FRONT-END UPDATES)
// ===============================================

document.getElementById("add").addEventListener("click", function () {
    const brand = brandSelect.value;
    const item = itemSelect.value;
    const option = colourSelect.selectedOptions[0];
    const qtyInput = parseInt(quantitySold.value) || 0;
    const rateVal = parseFloat(rate.value) || 0;

    if (!brand || !item || qtyInput <= 0 || !option || !option.value) {
        alert("⚠️ Please select all fields correctly."); return;
    }

    const prodIndex = products.findIndex(p => String(p.stockID) === String(option.value));
    const selectedProduct = products[prodIndex];

    if (qtyInput > selectedProduct.remaining) {
        alert(`⚠️ Only ${selectedProduct.remaining} available in stock.`); return;
    }

    // FRONT-END MINUS
    selectedProduct.remaining -= qtyInput;

    tempSales.push({
        stockID: selectedProduct.stockID,
        saleID: `${item.slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-6)}`,
        brandName: brand,
        itemName: selectedProduct.itemName,
        qty: (selectedProduct.qty && selectedProduct.qty.toUpperCase() !== "N/A") ? selectedProduct.qty : "",
        colourName: (selectedProduct.colourName && selectedProduct.colourName.toUpperCase() !== "N/A") ? selectedProduct.colourName : "",
        quantitySold: qtyInput,
        rate: rateVal,
        total: qtyInput * rateVal,
    });

    renderTable();
    refreshCurrentSelection(); // Refresh dropdowns to show updated stock
});

function refreshCurrentSelection() {
    const b = brandSelect.value;
    const i = itemSelect.value;
    const u = unitSelect.value;
    const c = allColoursSelect.value;

    // Sirf niche walay dropdown refresh karein taake selection kharab na ho
    if (u || unitSelect.disabled) {
        if (c || allColoursSelect.disabled) {
            updateOptionDropdown(b, i, u, c);
        } else {
            updateAllColoursDropdown(b, i, u);
        }
    } else {
        updateUnitColourDropdown(b, i);
    }

    quantitySold.value = ""; rate.value = ""; totalStock.value = "";
}

function renderTable() {
    const tbody = document.getElementById("saleTableBody");
    if (tempSales.length === 0) {
        tbody.innerHTML = `<tr class="no-data"><td colspan="8">No sales added yet</td></tr>`;
        return;
    }
    tbody.innerHTML = tempSales.map((p, i) => `
        <tr>
            <td>${p.brandName}</td><td>${p.itemName}</td><td>${p.colourName}</td>
            <td>${p.qty}</td><td>${p.quantitySold}</td>
            <td>Rs ${p.rate.toFixed(2)}</td><td>Rs ${p.total.toFixed(2)}</td>
            <td><button id="delete" class="delete-sale" data-index="${i}">Delete</button></td>
        </tr>
    `).join('');

    document.querySelectorAll(".delete-sale").forEach(btn => {
        btn.onclick = function () {
            const idx = this.dataset.index;
            const sale = tempSales[idx];

            // FRONT-END PLUS
            const prod = products.find(p => p.stockID === sale.stockID);
            if (prod) prod.remaining += sale.quantitySold;

            tempSales.splice(idx, 1);
            renderTable();
            refreshCurrentSelection();
        };
    });
}

document.getElementById("submitBtn").addEventListener("click", async function () {
    if (tempSales.length === 0) return alert("⚠️ Add sales first.");
    const payload = { sales: tempSales, agentID: agentSelect.value || null, percentage: agentPercentage.value || 0 };
    try {
        const res = await fetch("/sales/add", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        if (res.ok) {
            alert("✅ Sales Saved Successfully!");
            window.open(`/sales/print?data=${encodeURIComponent(JSON.stringify(tempSales))}`, "_blank");
            location.reload();
        }
    } catch (err) { alert("❌ Server Error!"); }
});

// ===============================================
// HELPERS (RESETS)
// ===============================================
function resetOptionAndInputs() {
    colourSelect.innerHTML = `<option value="">Select Option</option>`; colourSelect.disabled = true;
    quantitySold.value = ""; rate.value = ""; totalStock.value = "";
}
function resetUnitColourAndInputs() {
    unitSelect.innerHTML = `<option value="">Select Unit</option>`; unitSelect.disabled = true;
    allColoursSelect.innerHTML = `<option value="">Select Colour</option>`; allColoursSelect.disabled = true;
    resetOptionAndInputs();
}
function resetFieldsBelowBrand() {
    itemSelect.innerHTML = `<option value="">Select Item</option>`; itemSelect.disabled = true;
    resetUnitColourAndInputs();
}

renderTable();

