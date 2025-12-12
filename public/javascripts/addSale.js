// =====================
// AGENT LOGIC (SAME)
// =====================
const agentSelect = document.getElementById("agentSelect");
const agentPercentage = document.getElementById("agentPercentage");

agentSelect.addEventListener("change", function () {
  if (this.value) {
    agentPercentage.style.display = "inline-block";
  } else {
    agentPercentage.style.display = "none";
    agentPercentage.value = "";
  }
});

// =====================
// LOAD PRODUCT DATA SAFELY (SAME)
// =====================
const initialProducts = JSON.parse(document.getElementById("productData").textContent);
const products = JSON.parse(JSON.stringify(initialProducts)); 
let tempSales = [];

// =====================
// FORM ELEMENTS 
// =====================
const brandSelect = document.getElementById("brandSelect");
const itemSelect = document.getElementById("itemSelect");
const unitSelect = document.getElementById("unitSelect");
const allColoursSelect = document.getElementById("allColours"); // For Colour Name
const colourSelect = document.getElementById("colourSelect"); // For Stock Option (Rate/Stock)
const quantitySold = document.getElementById("quantitySold");
const rate = document.getElementById("rate");
const totalStock = document.getElementById("totalStock");

// =====================
// DROPDOWN EVENT LISTENERS
// =====================
brandSelect.addEventListener("change", function () {
  const brand = this.value;
  resetFieldsBelowBrand(); 
  if (!brand) {
    resetDropdowns(); 
    return;
  }
  updateItemDropdown(brand);
});


itemSelect.addEventListener("change", function () {
  const brand = brandSelect.value;
  const item = this.value;

  resetUnitColourAndInputs();
  if (!item) return;

   updateUnitColourDropdown(brand, item);
});


unitSelect.addEventListener("change", function () {
  const brand = brandSelect.value;
  const item = itemSelect.value;
  const unit = this.value;

  resetOptionAndInputs(); 
  allColoursSelect.value = ""; 

  if (!unit) {
    resetAllColoursAndOption();
    return;
}
  updateAllColoursDropdown(brand, item, unit);
});


allColoursSelect.addEventListener("change", function () {
    const brand = brandSelect.value;
    const item = itemSelect.value;
    const unit = unitSelect.value;
    const colour = this.value;

    resetOptionAndInputs();

    if (!colour) return; 

    updateOptionDropdown(brand, item, unit, colour);
});


colourSelect.addEventListener("change", updateRateAndStockFromOption);

function updateRateAndStockFromOption() {
  const option = colourSelect.selectedOptions[0];
  if (!option || !option.value) {
    rate.value = "";
    totalStock.value = "";
    return;
  }
  rate.value = option.dataset.rate || 0;
  totalStock.value = option.dataset.remaining || 0;
}


// ===============================================
// CORE LOGIC FUNCTIONS (FIXED)
// ===============================================

function updateItemDropdown(brand, initialItemValue = null) {
    // Filter items that have available stock in any of its configurations
    const brandItems = products.filter(p => p.brandName === brand && p.remaining > 0); 
    const uniqueItems = [...new Set(brandItems.map(p => p.itemName).filter(Boolean))];
    
    const currentItemValue = itemSelect.value;
    
    itemSelect.innerHTML = `<option value="">Select Item</option>` +
        uniqueItems.map(i => `<option value="${i}">${i}</option>`).join('');

    itemSelect.disabled = uniqueItems.length === 0;
    
    const setValue = initialItemValue || currentItemValue;
    if (setValue && uniqueItems.includes(setValue)) {
        itemSelect.value = setValue;
        updateUnitColourDropdown(brand, setValue);
    }
}

function updateUnitColourDropdown(brand, item, initialUnitValue = null) {
    // FIX: Filter matches with remaining > 0 (THIS WAS MISSING IN PREVIOUS VERSION)
    const matchesWithStock = products.filter(p => p.brandName === brand && p.itemName === item && p.remaining > 0);
    const hasUnit = matchesWithStock.some(p => p.qty && p.qty.trim() !== "");

    const currentUnitValue = unitSelect.value;

    resetUnitColourAndInputs(); // Resets Unit, ColourName, Option, Inputs
    
    if (!hasUnit) {
        unitSelect.disabled = true;
        allColoursSelect.disabled = true; 
        
        // Case 1: No Unit/ColourName - Populate Option dropdown directly
        updateOptionDropdown(brand, item, null, null, matchesWithStock);
        return;
    }

    // Case 2: Item has Units
    const units = [...new Set(matchesWithStock.map(p => p.qty).filter(Boolean))];
    unitSelect.innerHTML = `<option value="">Select Unit</option>` +
        units.map(u => `<option value="${u}">${u}</option>`).join('');
    unitSelect.disabled = false;
    
    const setValue = initialUnitValue || currentUnitValue;

    if (setValue && units.includes(setValue)) {
        unitSelect.value = setValue;
        updateAllColoursDropdown(brand, item, setValue);
    }
}

function updateAllColoursDropdown(brand, item, unit, initialColourNameValue = null) {
    // Filter products by Brand, Item, Unit, and available stock
    const filteredByUnitWithStock = products.filter(p => p.brandName === brand && p.itemName === item && p.qty === unit && p.remaining > 0);
    
    // Check if any product has a defined colour name
    const hasColourName = filteredByUnitWithStock.some(p => p.colourName && p.colourName.trim() !== "");

    resetOptionAndInputs(); // Reset Option and Inputs

    if (!hasColourName) {
        allColoursSelect.disabled = true;
        
        // Case 3: Item has Unit but NO Colour Name - Populate Option dropdown directly
        updateOptionDropdown(brand, item, unit, null, filteredByUnitWithStock);
        return;
    }
    
    // Case 4: Item has Unit AND Colour Name - Populate Colour Name dropdown
    const colourNames = [...new Set(filteredByUnitWithStock.map(p => p.colourName).filter(Boolean))];
    const currentColourNameValue = allColoursSelect.value;

    allColoursSelect.innerHTML = `<option value="">Select colour</option>` +
        colourNames.map(c => `<option value="${c}">${c}</option>`).join('');
    allColoursSelect.disabled = false;
    
    const setValue = initialColourNameValue || currentColourNameValue;
    if (setValue && colourNames.includes(setValue)) {
        allColoursSelect.value = setValue;
        updateOptionDropdown(brand, item, unit, setValue);
    }
}


function updateOptionDropdown(brand, item, unit, colourName, preFiltered = null) {
    let filtered;
    
    if (preFiltered) {
        // Case 1 or 3: Matches array is passed directly 
        filtered = preFiltered;
    } else if (colourName) {
        // Case 4: Has Unit AND Colour Name - Filter by all four
        filtered = products.filter(p => p.brandName === brand && p.itemName === item && p.qty === unit && p.colourName === colourName && p.remaining > 0);
    } else if (unit) {
        // Fallback for Unit selection only (Should be covered by preFiltered Case 3)
        filtered = products.filter(p => p.brandName === brand && p.itemName === item && p.qty === unit && p.remaining > 0);
    } else {
        // Fallback for Item only (Should be covered by preFiltered Case 1)
        filtered = products.filter(p => p.brandName === brand && p.itemName === item && p.remaining > 0);
    }

    const currentOptionValue = colourSelect.value;

    colourSelect.innerHTML = `<option value="">Select Option</option>` +
        filtered.map(p => {
            // Label formatting: Item | Unit | ColourName — Rate: X | Stock: Y
            let detail = p.itemName;
            if (p.qty) detail += ` | ${p.qty}`;
            if (p.colourName) detail += ` | ${p.colourName}`;
                
            const label = `${detail} — Rate: ${p.rate} | Stock: ${p.remaining}`;
            const isDisabled = p.remaining <= 0 ? 'disabled' : ''; 
            
            return `<option value="${p.stockID}" data-remaining="${p.remaining}" data-rate="${p.rate}" ${isDisabled}>${label}</option>`;
        }).join('');
    
    colourSelect.disabled = filtered.length === 0;
    
    if (currentOptionValue && filtered.some(p => String(p.stockID) === currentOptionValue)) {
        colourSelect.value = currentOptionValue;
        updateRateAndStockFromOption();
    }
}


// =====================
// INITIALIZATION ON PAGE LOAD (SAME)
// =====================
function initializeDropdowns() {
    const brand = brandSelect.value;
    const item = itemSelect.value;
    
    if (brand) {
        updateItemDropdown(brand, item); 
    } else {
        resetDropdowns();
    }
}


// =====================
// GENERATE SALE ID, ADD SALE ENTRY, RENDER TABLE, SUBMIT SALES 
// =====================
function generateSaleID(itemName) {
  const prefix = itemName.slice(0, 3).toUpperCase();
  const rand = Math.floor(Math.random() * 900000 + 100000);
  return `${prefix}-${rand}`;
}

document.getElementById("add").addEventListener("click", addSaleEntry);

function addSaleEntry() {
  const brand = brandSelect.value.trim();
  const item = itemSelect.value.trim();
  
  const option = colourSelect.selectedOptions[0]; 
  
  const qty = parseInt(quantitySold.value) || 0;
  const rateVal = parseFloat(rate.value) || 0;

  if (!brand || !item || qty <= 0 || rateVal <= 0 || !option || !option.value) {
    alert("⚠️ Please fill all fields correctly and select a specific option (Stock ID) before adding sale.");
    return;
  }
    
    // Conditional checks for Unit/Colour Name selection
    // Check if Unit/Colour selection is required but missing
    if (!unitSelect.disabled && !unitSelect.value) {
        alert("⚠️ Please select Unit.");
        return;
    }
    if (!allColoursSelect.disabled && !allColoursSelect.value) {
        alert("⚠️ Please select Colour Name.");
        return;
    }

  const selectedProduct = products.find(p => String(p.stockID) === String(option.value));

  if (!selectedProduct) {
    alert("⚠️ Product not found based on selected option.");
    return;
  }

  if (qty > selectedProduct.remaining) {
    alert(`⚠️ Only ${selectedProduct.remaining} units available for the selected stock.`);
    return;
  }
  
  // Update stock remaining
  selectedProduct.remaining -= qty; 
  
  // Update the option dropdown dynamically
  option.dataset.remaining = selectedProduct.remaining;
  option.textContent = option.textContent.replace(/Stock: \d+/, `Stock: ${selectedProduct.remaining}`);
  
  if (selectedProduct.remaining <= 0) {
      option.disabled = true;
  }

  tempSales.push({
    stockID: selectedProduct.stockID,
    saleID: generateSaleID(item),
    brandName: brand,
    itemName: selectedProduct.itemName,
    qty: selectedProduct.qty || "",
    colourName: selectedProduct.colourName || "",
    quantitySold: qty,
    rate: rateVal,
    total: qty * rateVal,
  });

  renderTable();
  
  // Reset only Option and Inputs, and Colour Name (if applicable)
  resetOptionAndInputs(); 
    
    // Refresh dropdowns to reflect new stock (keeping current selections)
    if (item) {
        const currentUnit = unitSelect.value;
        const currentColourName = allColoursSelect.value;
        
        // Re-populate Unit/ColourName dropdowns
        updateUnitColourDropdown(brand, item, currentUnit); 
        
        if (currentUnit) {
            updateAllColoursDropdown(brand, item, currentUnit, currentColourName);
          
            // Re-populate Option dropdown with current Colour Name selected
            if (currentColourName) {
                updateOptionDropdown(brand, item, currentUnit, currentColourName);
            } else if (allColoursSelect.disabled) {
                 // If no colour names were available, refresh the final option dropdown directly
                 updateOptionDropdown(brand, item, currentUnit, null);
             }
        }
        
        // If Unit dropdown was disabled, refresh the final option dropdown directly
        else if (unitSelect.disabled) {
            updateOptionDropdown(brand, item, null, null);
        }
    }
}

function renderTable() {
  const tbody = document.getElementById("saleTableBody");
  if (tempSales.length === 0) {
    tbody.innerHTML = `<tr class="no-data"><td colspan="8">No sales added yet</td></tr>`;
    return;
  }

  tbody.innerHTML = tempSales.map((p, i) => `
    <tr>
      <td>${p.brandName}</td>
      <td>${p.itemName}</td>
      <td>${p.colourName}</td>
      <td>${p.qty}</td>
      <td>${p.quantitySold}</td>
      <td>${p.rate}</td>
      <td>${p.total}</td>
      <td><button id="delete" class="delete-sale" data-index="${i}">Delete</button></td>
    </tr>
  `).join('');

  attachDeleteButtons(); 
}

// =====================
// ATTACH DELETE BUTTONS (FIXED to refresh 3 levels)
// =====================
function attachDeleteButtons() {
  document.querySelectorAll(".delete-sale").forEach(btn => {
    btn.addEventListener("click", function () {
      const index = parseInt(this.dataset.index);
      
      const deletedSale = tempSales[index];
      const deletedQty = deletedSale.quantitySold;
      const stockID = deletedSale.stockID;

      const brand = brandSelect.value; 
      const item = itemSelect.value;
      const unit = unitSelect.value;
      const colourName = allColoursSelect.value; 
      
      // Save current state of disabled flags before refreshing
      const wasUnitDisabled = unitSelect.disabled;
      const wasColourNameDisabled = allColoursSelect.disabled;

      const productToUpdate = products.find(p => String(p.stockID) === String(stockID));
      
      const isCurrentlySelected = colourSelect.value === String(stockID);

      if(productToUpdate) {
          productToUpdate.remaining += deletedQty;

          const optionSelect = document.getElementById('colourSelect');
          const optionToUpdate = optionSelect.querySelector(`option[value="${stockID}"]`);
          
          if(optionToUpdate) {
              optionToUpdate.dataset.remaining = productToUpdate.remaining;
              optionToUpdate.textContent = optionToUpdate.textContent.replace(/Stock: \d+/, `Stock: ${productToUpdate.remaining}`);
              optionToUpdate.disabled = false;
          }
          
          if (isCurrentlySelected) {
              totalStock.value = productToUpdate.remaining;
          }
      }
      
      tempSales.splice(index, 1);
      renderTable();
      
      // Refresh Unit/ColourName/Option dropdowns if Brand and Item are selected
      if (brand && item) {
          updateUnitColourDropdown(brand, item, unit);
          
          if (unit || wasUnitDisabled) {
              updateAllColoursDropdown(brand, item, unit, colourName);
              
              if (colourName || wasColourNameDisabled) {
                  updateOptionDropdown(brand, item, unit, colourName);
              }
          }
      }
    });
  });
}


document.getElementById("submitBtn").addEventListener("click", submitSales);

async function submitSales() {
  if (tempSales.length === 0) return alert("⚠️ No sales to submit.");

  const payload = {
    sales: tempSales,
    agentID: agentSelect.value || null,
    percentage: agentPercentage.value ? parseFloat(agentPercentage.value) : 0,
  };

  try {
    const res = await fetch("/sales/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!data.success) throw new Error(data.message);

    alert("✅ Sales saved successfully!");
    window.open(`/sales/print?data=${encodeURIComponent(JSON.stringify(tempSales))}`, "_blank");

    tempSales = [];
    renderTable();
    setTimeout(() => location.reload(), 800);
  } catch (err) {
    alert("❌ Error: " + err.message);
  }
}


// =====================
// RESET HELPERS 
// =====================

function resetOptionAndInputs() {
    colourSelect.innerHTML = `<option value="">Select option</option>`;
    colourSelect.disabled = true;
    quantitySold.value = "";
    rate.value = "";
    totalStock.value = "";
}

function resetAllColoursAndOption() {
    allColoursSelect.innerHTML = `<option value="">Select colour</option>`;
    allColoursSelect.disabled = true;
    resetOptionAndInputs();
}

function resetUnitColourAndInputs() {
    unitSelect.innerHTML = `<option value="">Select Unit</option>`;
    unitSelect.disabled = true;
    resetAllColoursAndOption(); 
}

function resetFieldsBelowBrand() {
    itemSelect.innerHTML = `<option value="">Select Item</option>`;
    itemSelect.disabled = true;
    unitSelect.innerHTML = `<option value="">Select Unit</option>`;
    unitSelect.disabled = true;
    resetAllColoursAndOption(); 
}

function resetDropdowns() {
    itemSelect.value = "";
    unitSelect.value = "";
    allColoursSelect.value = ""; 
    colourSelect.value = ""; 
    resetFieldsBelowBrand(); 
}


// Initial Call to handle state when page loads
initializeDropdowns();