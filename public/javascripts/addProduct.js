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
    "Oil Tupe", "Paints SPRAY", "WALL PUTTY", "GODKA WALLPUTTY", "EMULSION", "GODKA EMULSION", "ENAMEL", "PEARL PASTE 1000G", "PEARL PASTE 500G", "PEARL PASTE 100G", "MASKAN TAPE 2",
    "MASKAN TAPE 1", "MASKAN TAPE 1/2", "MASKAN TAPE 2 SOTTER", "MASKAN TAPE 1 SOTTER",
    "BRUSH EMULSION 6", "BRUSH EMULSION 5", "BRUSH EMULSION 4", "BRUSH TIGER PAINT 4",
    "BRUSH TIGER PAINT 3", "BRUSH TIGER PAINT 2 Double", "BRUSH TIGER PAINT 2 Single",
    "BRUSH TIGER PAINT 1 Double", "BRUSH TIGER PAINT 1 Single", "MARSHAL BRUSH 3",
    "COMMANDER BURSH 2", "CAPTAN BRUSH 4", "CAPTAN BRUSH 3 Double", "CAPTAN BRUSH 2 Double",
    "CAPTAN BRUSH 2 Single", "ROBINA QALAM", "WHITE QALAM", "STENSEL", "STENSEL BOADER", "CHAPA", "BOADE CHAPA", "CAPTAN BRUSH 3 SINGLE",
    "MATTI OIL 1500G", "MATTI OIL 1000G", "MATTI OIL 900G", "MATTI OIL DAMIND",
    "MATTI OIL 500G", "MATTI OIL 250G", "MATTI OIL 300G", "RAGMAL ADDID", "RAGMAL ROLLE", "RAGMAL FUFF", "RAGMAL KERMALA", "COMMANDER ROLLER",
    "SADA ROLLER", "ROLA STAKE", "ROLLER 4", "ROLLA PUFF 4", "ROLLA PUFF ADDID", "BALCAK ROLLER", "BLACAK ROLLA PUFF 8", "NEEL PKT 100G",
    "NEEL PKT 40G", "NEEL", "CHAK MATTI KG", "PARIS", "GLUE 1KG", "GLUE 1/2 KG", "GLUE DABBI", "NOBLE GLUE", "ACRYLIC 1 KG",
    "ACRYLIC 1/2 KG", "DIKOO SET", "MITTI OIL SMALL", "SAMAD BOND DABBI", "OIL TUBE ADDID", "CAHILLANGER ADDID",
    "SPRAY MUBAH", "SPRAY STEEL", "SPRAY GOLDEN", "SPRAY ZANG", "MAGIC", "SCRAPER 8", "SCRAPER 4", "SCRAPER SAFAYE",
    "PATRA", "TURKEY UMBER", "YELLOW UMBER", "R/O UMBER", "BLACK UMBER", "CHOONA", "FARMKEA GANKE", "MALMAL",
    "Tinter Tube", "Challanger Tube", "Samad Bond Tube", "Sycle Pump", "Sycle", "Hickory", "20KG H.D Putty",
    "5KG H.D Putty", "5KG Wallcoat", "White Cement", "Lakdana", "Chamky",
  ]
};

// ====================== BRAND-WISE UNITS =========================

const brandUnits = {
  "Weldon Paints": ["Gallons", "Quarters", "Drumi", "Dabbi"],
  "Sparco Paints": ["Gallons", "Quarters", "Drumi", "Dabbi"],
  "Value Paints": ["Gallons", "Quarters", "Drumi", "Dabbi"],
  "Corona Paints": ["Gallons", "Quarters", "Drumi", "Dabbi", "Ponts"],
  "Other Paints": ["Gallons", "Quarters", "Drumi", "Dabbi"]
};

// ===================== COLOURS FOR SELECT ITEMS + BRAND ONLY ==============

const productOptions = {
  "Weldon Paints-Weather Shield": [
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
  "Weldon Paints-Emulsion": [
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
  "Weldon Paints-Enamel": [
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
  ],
  "Other Paints-Oil Tupe": [
    { code: "106", colour: "White" },
    { code: "443", colour: "Blue" },
    { code: "560", colour: "Viridian" },
    { code: "227", colour: "Yellow" },
    { code: "794", colour: "Lamp Black" },
    { code: "313", colour: "Orange Red" },
    { code: "453", colour: "Cobalt Blue" },
    { code: "559", colour: "Emerald Green" },
    { code: "676", colour: "Yellow Ochre" },
    { code: "302", colour: "Scarlet" },
    { code: "688", colour: "Raw Umber" },
    { code: "601", colour: "Raw Siena" },
    { code: "687", colour: "Burnt Umber" },
    { code: "215", colour: "Lemon Yellow" },
    { code: "684", colour: "Burnt Siena" },
    { code: "336", colour: "Rose" },
    { code: "402", colour: "Mauve" },
  ],
  "Other Paints-Paints SPRAY": [
    { code: "37", colour: "Onion Green" },
    { code: "23", colour: "Red" },
    { code: "39", colour: "Black" },
    { code: "30", colour: "Pink" },
    { code: "21", colour: "Vivdid Blue" },
    { code: "22", colour: "Medium Grey" },
    { code: "36", colour: "Silver" },
    { code: "35", colour: "Gold" },
    { code: "318", colour: "Chrome" },
    { code: "25", colour: "Yellow" },
    { code: "15", colour: "Sky Blue" },
    { code: "40", colour: "white" },
    { code: "29", colour: "Brown" },
  ]
};

const brandNameSelect = document.getElementById("brandName");
const itemNameSelect = document.getElementById("itemName");
const quantitativeSelect = document.getElementById("quantitative");
const colourCodeSelect = document.getElementById("colourCode");

let tempProducts = [];

// --- Brand Change ---
brandNameSelect.addEventListener("change", function () {
  const brand = this.value;
  itemNameSelect.innerHTML = `<option value="">Select Item</option>`;
  quantitativeSelect.innerHTML = `<option value="">Select Unit</option>`;
  colourCodeSelect.innerHTML = `<option value="">Select Colour</option>`;
  colourCodeSelect.disabled = true;

  if (brand && brandItems[brand]) {
    brandItems[brand].forEach(i => {
      const opt = document.createElement("option");
      opt.value = i; opt.textContent = i;
      itemNameSelect.appendChild(opt);
    });
    brandUnits[brand].forEach(u => {
      const opt = document.createElement("option");
      opt.value = u; opt.textContent = u;
      quantitativeSelect.appendChild(opt);
    });
  }
});

// --- Item Change ---
itemNameSelect.addEventListener("change", function () {
  const selectedBrand = brandNameSelect.value;
  const selectedItem = this.value;
  const lookupKey = `${selectedBrand}-${selectedItem}`;

  colourCodeSelect.innerHTML = '<option value="">Select Colour</option>';

  if (productOptions[lookupKey]) {
    productOptions[lookupKey].forEach(opt => {
      const el = document.createElement("option");
      el.value = `${opt.colour} (Code: ${opt.code})`;
      el.textContent = `${opt.colour} (Code: ${opt.code})`;
      colourCodeSelect.appendChild(el);
    });
    colourCodeSelect.disabled = false;
  } else {
    const el = document.createElement("option");
    el.value = "";
    el.textContent = "No Colour Required";
    colourCodeSelect.appendChild(el);
    colourCodeSelect.value = "";
    colourCodeSelect.disabled = true;
  }
});

function generateStockID(itemName) {
  return `${(itemName || "PRO").slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-5)}`;
}

// --- Add Product ---
function addProduct() {
  const brandName = brandNameSelect.value;
  const itemName = itemNameSelect.value;
  let colourName = colourCodeSelect.value;
  const qty = quantitativeSelect.value;
  const totalProduct = parseInt(document.getElementById("totalProduct").value);
  const rate = parseFloat(document.getElementById("rate").value);

  if (!brandName || !itemName || isNaN(totalProduct) || isNaN(rate)) {
    alert("⚠️ Please fill all required fields!");
    return;
  }

  if (!colourName || colourName.toUpperCase() === "N/A") {
    colourName = "";
  }

  // Random number add kiya taake stockID kabhi duplicate na ho
  const stockID = `${(itemName || "PRO").slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-5)}${Math.floor(Math.random() * 10)}`;

  tempProducts.push({
    stockID,
    brandName, itemName, colourName, qty, totalProduct, rate,
    total: totalProduct * rate
  });

  renderTable();
  clearFields();
}

// --- Render Table (Faster Version) ---
function renderTable() {
  const tbody = document.getElementById("tableBody");
  
  if (tempProducts.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" class="no-data">No products added yet</td></tr>`;
    return;
  }

  // String builder approach (Fast Performance)
  let tableHTML = "";
  tempProducts.forEach((p, i) => {
    tableHTML += `
      <tr>
        <td>${p.brandName}</td>
        <td>${p.itemName}</td>
        <td>${p.colourName }</td> 
        <td>${p.qty }</td>
        <td>${p.totalProduct}</td>
        <td>Rs ${p.rate.toFixed(2)}</td>
        <td>Rs ${p.total.toFixed(2)}</td>
        <td><button type="button" class="delete-temp delete-btn" data-index="${i}" id="delete" >Delete</button></td>
      </tr>`;
  });

  tbody.innerHTML = tableHTML; // Ek hi baar mein DOM update
  attachDeleteButtons();
}

function attachDeleteButtons() {
  document.querySelectorAll(".delete-temp").forEach(btn => {
    btn.onclick = function () {
      const index = parseInt(this.getAttribute("data-index"));
      tempProducts.splice(index, 1);
      renderTable();
    };
  });
}

function clearFields() {
  brandNameSelect.value = "";
  itemNameSelect.innerHTML = `<option value="">Select Item</option>`;
  colourCodeSelect.innerHTML = '<option value="">Select Colour</option>';
  colourCodeSelect.disabled = true;
  quantitativeSelect.innerHTML = `<option value="">Select Unit</option>`;
  document.getElementById("totalProduct").value = "";
  document.getElementById("rate").value = "";
}


// --- Updated Submit Data (Vercel Friendly) ---
async function submitData() {
  if (tempProducts.length === 0) {
    alert("⚠️ Please add at least one product!");
    return;
  }

  const submitBtn = document.querySelector(".submit-btn");
  const originalText = submitBtn.innerHTML;
  
  submitBtn.disabled = true;
  submitBtn.innerHTML = `<span class="spinner"></span> Saving Products...`;

  try {
    const res = await fetch("/products/add-multiple", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ products: tempProducts }),
    });
    
    const data = await res.json();
    
    if (res.ok && data.success) {
      alert("✅ Saved Successfully!");

      // ✅ STEP 1: Data ko URL mein bhejne ke bajaye LocalStorage mein save karein
      localStorage.setItem("lastAddedProducts", JSON.stringify(tempProducts));

      // ✅ STEP 2: Khali URL open karein (Koi data string nahi jayegi)
      window.open(`/products/print`, "_blank");

      tempProducts = [];
      renderTable();
    } else {
      throw new Error(data.message || "Failed to save");
    }
  } catch (err) { 
    alert("Error: " + err.message); 
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalText;
  }
}

document.getElementById("add").addEventListener("click", addProduct);
document.querySelector(".submit-btn").addEventListener("click", submitData);
renderTable();

