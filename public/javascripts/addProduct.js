
// ====================== BRAND-WISE ITEMS =========================

const brandItems = {
  "Weldon Paints": [
    "Weather Shield", "Emulsion", "Enamel", "Betek Emulsion", "Betek Wall Putty",
    "Wall Putty", "Metallic", "Under Coat", "Red Oxide Primer", "Varnish",
    "ELFY Varnish", "Lacquer", "Sealer", "Fish", "Exterior Wall Putty",
    "Exterior Primer", "Interior Primer", "Local Primer", "Godka Emulsion",
    "Godka Wall Putty", "Local Enamel", "Thinir"
  ],
  "Sparco Paints": [
    "Emulsion", "Wall Putty", "Dream Emulsion", "Weather Shield", "Enamel",
    "Under Coad", "Red Oxide Primer", "Exterior Primer",
    "Exterior Wall Putty", "Dream Wall Putty"
  ],
  "Value Paints": [
    "Supreme Emulsion", "Supreme Wall Putty", "Prime Emulsion", "P.Weather Shield",
    "Metallic", "Interior Primer", "Peak Wall Putty", "Peak Primer",
    "Enamel", "Value Enamel", "Value Interior Primer", "Ext Primer",
    "Value Weather Shield", "Value Prime Emulsion", "Primer Weather Shield",
    "Value Under Coad", "Value Red Oxide Primer"
  ],
  "Corona Paints": [
    "Emulsion", "Primer", "Wall Putty", "Exterior Primer", "Enamel"
  ],
  "Other Paints": [
    "PEARL PASTE 1000G", "PEARL PASTE 500G","PEARL PASTE 100G","MASKAN TAPE 2",
    "MASKAN TAPE 1","MASKAN TAPE 1/2","MASKAN TAPE 2 SOTTER","MASKAN TAPE 1 SOTTER",
    "BRUSH EMULSION 6","BRUSH EMULSION 5","BRUSH EMULSION 4","BRUSH TIGER PAINT 4",
    "BRUSH TIGER PAINT 3","BRUSH TIGER PAINT 2 Double","BRUSH TIGER PAINT 2 Single",
    "BRUSH TIGER PAINT 1 Double","BRUSH TIGER PAINT 3 Single","MARSHAL BRUSH 3",
    "COMMANDER BURSH 2","CAPTAN BRUSH 4","CAPTAN BRUSH 3 Double","CAPTAN BRUSH 2 Double",
    "CAPTAN BRUSH 2 Single","ROBINA QALAM","WHITE QALAM","CHAPA","BOADE CHAPA","BRUSH EMULSION 5 SINGLE",
    "BRUSH EMULSION 5 SINGLE","CAPTAN BRUSH 3 SINGLE","MATTI OIL 1500G","MATTI OIL 1000G","MATTI OIL DAMIND",
    "MATTI OIL 500G","MATTI OIL 300G","RAGMAL ADDID","RAGMAL ROLLE","RAGMAL KERMALA","COMMANDER ROLLER",
    "SADA ROLLER","ROLA STAKE","ROLLER 4","ROLLA PUFF ADDID","BALCAK ROLLER","BLACAK ROLLA PUFF","NEEL PKT 100G",
    "NEEL PKT 40G","NEEL","CHAK MATTI","PARIS","GLUE 1KG","GLUE 1/2 KG","GLUE DABBI","NOBLE GLUE","ACRYLIC 1 KG",
    "ACRYLIC 1/2 KG","DIKOO SET","MITTI OIL SMALL","SAMAD BOND","OIL TUBE ADDID","CAHILLANGER ADDID",
    "SPRAY MUBAH","SPRAY STEEL","SPRAY GOLDEN","SPRAY ZANG","MAGIC","SCRAPER 8","SCRAPER 4","SCRAPER SAFAYE",
    "PATRA","TURKEY UMBER","YELLOW UMBER","R/O UMBER","BLACK UMBER","CHOONA","FARMKEA GANKE","MALMAL",
  ]
};

// ====================== BRAND-WISE UNITS =========================

const brandUnits = {
  "Weldon Paints": ["Gallons", "Quarters", "Drumi", "Dabbi"],
  "Sparco Paints": ["Gallons", "Quarters", "Drumi", "Dabbi"],
  "Value Paints":  ["Gallons", "Quarters", "Drumi", "Dabbi"],
  "Corona Paints": ["Gallons", "Quarters", "Drumi", "Dabbi", "Ponts"],
  "Other Paints":  []
};

// ===================== COLOURS FOR SELECT ITEMS ONLY ==============

const productOptions = {
  "Weather Shield": [
    { code: "1951", colour: "White" },
    { code: "1952", colour: "Off White" },
    { code: "7030", colour: "Apricot" },
    { code: "1948", colour: "Sugar Cane" },
    { code: "7090", colour: "Pearl" },
    { code: "7001", colour: "Soft White" },
    { code: "2685", colour: "Cameo" },
    { code: "2087", colour: "Beige" },
    { code: "7051", colour: "Milk Mocha" },
    { code: "7003", colour: "Peach Dream" },
    { code: "7049", colour: "Desert Dawn" },
    { code: "8310", colour: "Weldon Beige" },
    { code: "1958", colour: "Tea Rose" },
    { code: "7077", colour: "Golden Tinge" },
    { code: "6860", colour: "Sweet Peach" },
    { code: "8329", colour: "Hopsack" },
    { code: "1960", colour: "Moon Land" },
    { code: "5270", colour: "Fresh Orange" },
    { code: "7048", colour: "Molten Bronze" },
    { code: "2876", colour: "Tile Red" },
    { code: "8317", colour: "Beaver" },
    { code: "8323", colour: "Silk Stone" },
    { code: "8328", colour: "Porcelain Peach" },
    { code: "1919", colour: "Ash White" },
    { code: "7034", colour: "Bubble Pink" },
    { code: "7080", colour: "Sea Sand" },
    { code: "7055", colour: "Royal Cameo" },
    { code: "7004", colour: "Lilac Grey" },
    { code: "7073", colour: "Barbie Pink" },
    { code: "8303", colour: "New Ash White" },
    { code: "7044", colour: "Evening Blush" },
    { code: "3162", colour: "Weldon Grey" },
    { code: "6846", colour: "Blue Grey" },
    { code: "3148", colour: "Terracotta" },
    { code: "1949", colour: "Sandstone" },
    { code: "3160", colour: "Sky Grey" },
    { code: "3158", colour: "Blue Wind" },
    { code: "2910", colour: "Red Oxide" },
    { code: "2877", colour: "Weldon Red" },
    { code: "1959", colour: "Goose Wing" },
    { code: "3032", colour: "Happy Blue" },
    { code: "7072", colour: "Crystal Green" },
    { code: "7082", colour: "Camel Brown (New)" },
    { code: "2090", colour: "Jade" },
    { code: "1947", colour: "Magnolia" },
    { code: "1426", colour: "W.Cannon" },
    { code: "7040", colour: "Cherry Pink" },
    { code: "7017", colour: "Charcoal" },
    { code: "8325", colour: "Royal Beige" },
    { code: "3023", colour: "New Jade" },
    { code: "7032", colour: "Brown Bronze" },
    { code: "7054", colour: "Black Magic" },
    { code: "2885", colour: "Autumn Stone" },
    { code: "7042", colour: "Frost Mauve" },
    { code: "8300", colour: "Black (New)" },
    { code: "2728", colour: "Bright Red" },
    { code: "7020", colour: "Habitat" },

    { code: "2088", colour: "Avocado" },
    { code: "7056", colour: "Expresso (New)" },
    { code: "6853", colour: "Green Yellow" },

  ],
  "Emulsion": [
    { code: "0", colour: "White" },
    { code: "10", colour: "Off White" },
    { code: "43", colour: "Kitten White" },
    { code: "97", colour: "Rose White" },
    { code: "84", colour: "Peanut Butter" },
    { code: "58", colour: "Light Orange" },
    { code: "4026", colour: "New Off White" },
    { code: "106", colour: "Purple Dawn" },
    { code: "8", colour: "Cream" },
    { code: "88", colour: "Cameo" },
    { code: "94", colour: "Orange" },
    { code: "103", colour: "Smart Off White (New)" },
    { code: "46", colour: "Orchid White" },
    { code: "40", colour: "Autumn Stone" },
    { code: "93", colour: "Lemon" },
    { code: "4006", colour: "New Tile Red" },
    { code: "83", colour: "Texas Cream" },
    { code: "110", colour: "Puff" },
    { code: "41", colour: "Soft Beige" },
    { code: "113", colour: "Dark Desert" },
    { code: "70", colour: "Tile Red" },
    { code: "78", colour: "Cockleshell" },
    { code: "5", colour: "Pink" },
    { code: "95", colour: "Opal Lilac" },
    { code: "75", colour: "Stardust" },
    { code: "104", colour: "Cool White (New)" },
    { code: "71", colour: "Sandstone" },
    { code: "21", colour: "Blossom Pink" },
    { code: "112", colour: "Classical" },
    { code: "22", colour: "Sea Blue" },
    { code: "101", colour: "Swiss Grey (New)" },
    { code: "23", colour: "Tea Rose" },
    { code: "111", colour: "Dark Pink" },
    { code: "74", colour: "Moods" },
    { code: "109", colour: "Torres Blue" },
    { code: "19", colour: "Ash White" },
    { code: "89", colour: "Terracotta" },
    { code: "49", colour: "Bright Pink" },
    { code: "92", colour: "Violet" },
    { code: "25", colour: "Blue Heaven" },
    { code: "47", colour: "Badami" },
    { code: "6", colour: "Spice" },
    { code: "105", colour: "Barble Pink" },
    { code: "96", colour: "Bringal" },
    { code: "91", colour: "Deep Blue" },
    { code: "519", colour: "Weldon Ash White" },
    { code: "01", colour: "Soft White" },
    { code: "18", colour: "Grey Blue" },
    { code: "50", colour: "Apple White" },
    { code: "30", colour: "Crystal Green" },
    { code: "44", colour: "Brown Tint" },
    { code: "76", colour: "Lavender White" },
    { code: "20", colour: "Whisper" },
    { code: "26", colour: "Lime Fresh" },
    { code: "27", colour: "Emerald" },
    { code: "42", colour: "Almond" },
    { code: "48", colour: "French Grey" },
    { code: "34", colour: "Steel Grey" },
    { code: "79", colour: "Lime Grapes" },
    { code: "28", colour: "Apple Green" },
    { code: "45", colour: "Toasted Almond" },


  
    { code: "102", colour: "Golf Green (New)" },
    { code: "36", colour: "Spring Leaf" },
    { code: "72", colour: "Jonquil" },
    { code: "90", colour: "Jade" },



  ],
  "Enamel": [
    { code: "241", colour: "Black" },
    { code: "0", colour: "White" },
    { code: "222", colour: "Bone White" },
    { code: "272", colour: "Apricot (New)" },
    { code: "4022", colour: "Lemon" },
    { code: "203", colour: "Golden Brown" },
    { code: "228", colour: "Red Oxide" },
    { code: "210", colour: "Sky Blue" },
    { code: "207", colour: "Off White" },
    { code: "259", colour: "Honey Milk" },
    { code: "209", colour: "Pearl Beige" },
    { code: "204", colour: "Dark Brown" },
    { code: "271", colour: "Polish Brown" },
    { code: "214", colour: "Light Blue" },
    { code: "206", colour: "New Off White" },
    { code: "260", colour: "Sweet Peach" },
    { code: "233", colour: "Weldon Beige" },
    { code: "270", colour: "Royal Brown" },
    { code: "266", colour: "Crimson" },
    { code: "263", colour: "Corn Flower" },
    { code: "235", colour: "Kitten White" },
    { code: "253", colour: "Golden Yellow" },
    { code: "298", colour: "Cappuccino" },
    { code: "256", colour: "Chocolate Brown" },
    { code: "215", colour: "New Brown" },
    { code: "230", colour: "Vivid Blue" },
    { code: "201", colour: "County Cream" },
    { code: "255", colour: "Diyar" },
    { code: "234", colour: "Coriander" },
    { code: "237", colour: "Leather Brown" },
    { code: "205", colour: "Signal Red" },
    { code: "231", colour: "Middle Blue" },
    { code: "257", colour: "Early Dawn" },
    { code: "333", colour: "Light Diyar" },
    { code: "261", colour: "Desert Dawn" },
    { code: "273", colour: "Red Brick (New)" },
    { code: "264", colour: "Hot Pink" },
    { code: "220", colour: "Pearl Pink" },
    { code: "217", colour: "Sea Green" },
    { code: "297", colour: "Antelope" },
    { code: "213", colour: "Mauve" },
    { code: "229", colour: "Emerald" },
    { code: "268", colour: "Light Champagne" },
    { code: "254", colour: "Lilac" },
    { code: "267", colour: "Spring Green" },
    { code: "492", colour: "Smoke Grey" },
    { code: "269", colour: "New Ash White" },
    { code: "247", colour: "Weldon Green" },
    { code: "495", colour: "New Smoke Grey" },
    { code: "251", colour: "Ash White" },
    { code: "216", colour: "Ocean Turuoise" },
    { code: "212", colour: "Court Grey" },
    { code: "219", colour: "Ash Grey" },
    { code: "218", colour: "Signal Green" },
    { code: "211", colour: "Antique Grey" },
    { code: "252", colour: "Pumice" },
    { code: "265", colour: "Orange" },
    { code: "223", colour: "Dark Grey" },


    { code: "5112", colour: "Ferozee" },
    { code: "5113", colour: "Bronze" },
    { code: "5115", colour: "Weldon Copper" },
    { code: "5104", colour: "Shiny Green" },
    { code: "5114", colour: "Red Rose" },
    { code: "5105", colour: "Champagne" },
    { code: "5103", colour: "Brown Sheen" },
    { code: "5106", colour: "Copper" },
    { code: "5102", colour: "Sparking Silver" },
    { code: "0401", colour: "Pale Green" },
    { code: "5107", colour: "Golden Dust" },
    { code: "5120", colour: "Sea Blue" },
    { code: "5109", colour: "Brilliant Green" },
    

  ]
};



// =================== BRAND CHANGE HANDLER ========================

document.getElementById("brandName").addEventListener("change", function () {
  const brand = this.value;
  const itemDropdown = document.getElementById("itemName");
  const unitDropdown = document.getElementById("quantitative");
  const colourDropdown = document.getElementById("colourCode");

  // Reset dropdowns
  itemDropdown.innerHTML = `<option value="">Select Item</option>`;
  unitDropdown.innerHTML = `<option value="">Select Unit</option>`;
  colourDropdown.innerHTML = `<option value="">Select Colour</option>`;
  colourDropdown.disabled = true;

  if (brand && brandItems[brand]) {
    // Load Items
    brandItems[brand].forEach(i => {
      const opt = document.createElement("option");
      opt.value = i;
      opt.textContent = i;
      itemDropdown.appendChild(opt);
    });

    // Load Units
    brandUnits[brand].forEach(u => {
      const opt = document.createElement("option");
      opt.value = u;
      opt.textContent = u;
      unitDropdown.appendChild(opt);
    });
  }
});

// ================== ITEM CHANGE: LOAD COLORS ONLY 3 ITEMS FOR WELDON =============

document.getElementById("itemName").addEventListener("change", function () {
  const selectedItem = this.value;
  const colourDropdown = document.getElementById("colourCode");
  const brand = document.getElementById("brandName").value;

  colourDropdown.innerHTML = '<option value="">Select Colour</option>';

  // Only show colors if Weldon Paints and item is in productOptions
  if (brand === "Weldon Paints" && productOptions[selectedItem]) {
    productOptions[selectedItem].forEach(opt => {
      const el = document.createElement("option");
      el.value = opt.code;
      el.textContent = `${opt.colour} (Code: ${opt.code})`;
      colourDropdown.appendChild(el);
    });
    colourDropdown.disabled = false;
  } else {
    colourDropdown.disabled = true;
  }
});

let tempProducts = [];

// ===================== STOCK ID GENERATOR =========================

function generateStockID(itemName) {
  const prefix = itemName.slice(0, 3).toUpperCase();
  const time = Date.now().toString().slice(-5);
  const random = Math.floor(Math.random() * 90 + 10);
  return `${prefix}-${time}${random}`;
}


// ===================== ADD PRODUCT ================================

function addProduct() {
  const brandName = document.getElementById("brandName").value;
  const itemName = document.getElementById("itemName").value;
  const colourDropdown = document.getElementById("colourCode");
  const qty = document.getElementById("quantitative").value;
  const totalProduct = parseInt(document.getElementById("totalProduct").value);
  const rate = parseFloat(document.getElementById("rate").value);
  

  let colourCombined = "";
  if (!colourDropdown.disabled && colourDropdown.value !== "") {
    const selected = colourDropdown.options[colourDropdown.selectedIndex];
    colourCombined = selected.text;
  }

  if (!brandName || !itemName || !totalProduct || !rate) {
    alert("⚠️ Please fill all fields before adding!");
    return;
  }

  const total = totalProduct * rate;
  const stockID = generateStockID(itemName);

  tempProducts.push({
    stockID,
    brandName,
    itemName,
    colourName: colourCombined,
    qty,
    totalProduct,
    rate,
    total,
  });

  renderTable();
  clearFields();
}

// ===================== CLEAR FIELDS ===============================

function clearFields() {
  document.getElementById("brandName").value = "";
  document.getElementById("itemName").innerHTML = `<option value="">Select Item</option>`;
  document.getElementById("colourCode").innerHTML = '<option value="">Select Colour</option>';
  document.getElementById("colourCode").disabled = true;
  document.getElementById("quantitative").innerHTML = `<option value="">Select Unit</option>`;
  document.getElementById("totalProduct").value = "";
  document.getElementById("rate").value = "";
}

// ===================== RENDER TABLE ===============================

function renderTable() {
  const tbody = document.getElementById("tableBody");
  tbody.innerHTML = "";

  if (tempProducts.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" class="no-data">No products added yet</td></tr>`;
    return;
  }

  tempProducts.forEach((p, i) => {
    tbody.innerHTML += `
      <tr>
        <td>${p.brandName}</td>
        <td>${p.itemName}</td>
        <td>${p.colourName}</td>
        <td>${p.qty}</td>
        <td>${p.totalProduct}</td>
        <td>${p.rate}</td>
        <td>${p.total}</td>
        <td><button class="delete-temp" id="delete" data-index="${i}">Delete</button></td>
      </tr>`;
  });

  attachDeleteButtons(); // VERY IMPORTANT
}



function attachDeleteButtons() {
  document.querySelectorAll(".delete-temp").forEach(btn => {
    btn.addEventListener("click", () => {
      const index = parseInt(btn.getAttribute("data-index"));
      tempProducts.splice(index, 1);
      renderTable();
    });
  });
}

// ===================== SUBMIT + PRINT =============================

async function submitData() {
  if (tempProducts.length === 0) {
    alert("⚠️ Please add at least one product!");
    return;
  }

  try {
    const res = await fetch("/products/add-multiple", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ products: tempProducts }),
    });

    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { throw new Error("Invalid server response"); }

    if (!res.ok || !data.success) throw new Error(data.message || "Failed to save");

    alert("✅ Products saved successfully!");

    const printData = encodeURIComponent(JSON.stringify(tempProducts));
    window.open(`/products/print?data=${printData}`, "_blank");

    tempProducts = [];
    renderTable();

  } catch (err) {
    alert("❌ Error: " + err.message);
    console.error(err);
  }
}

renderTable();



// Add product button
document.getElementById("add").addEventListener("click", addProduct);

// Submit & Save button
document.querySelector(".submit-btn").addEventListener("click", submitData);

