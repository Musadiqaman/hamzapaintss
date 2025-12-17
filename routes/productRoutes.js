import express from 'express';
import Product from "../models/Product.js";
import Sale from "../models/Sale.js";
import { isLoggedIn } from "../middleware/isLoggedIn.js";
import { allowRoles } from "../middleware/allowRoles.js";
import moment from 'moment-timezone'; // 🟢 Library Import


const router = express.Router();

/* ================================
   🟢 1️⃣ Add Product Page (GET)
   -> Renders the Add Product form (EJS)
================================ */
// 🟢 Add Product Page (GET)
router.get("/add",isLoggedIn,allowRoles("admin", "worker"), async (req, res) => {
  const role=req.user.role;
  try {
   const products = await Product.find().sort({ itemName: 1 }); // Fetch existing products
   res.render("addProduct", { products, layout: false ,role});


  } catch (err) {
    console.error("❌ Error loading Add Product page:", err);
    res.status(500).send("Error loading Add Product page");
  }
});


/* ================================
   🟢 2️⃣ Add Multiple Products (POST)
   -> Adds multiple products at once
================================ */
// 🔹 Add multiple products at once
router.post("/add-multiple",isLoggedIn,allowRoles("admin", "worker"), async (req, res) => {
  try {
    const { products } = req.body;

    if (!products || products.length === 0) {
      return res.status(400).json({ success: false, message: "No products provided." });
    }

    // Validate and prepare data
    const formatted = products.map((p) => ({
      brandName:p.brandName,
      itemName: p.itemName,
      colourName: p.colourName,
      qty: p.qty,
      totalProduct: p.totalProduct,
      remaining: p.totalProduct, // starting remaining = total
      rate: p.rate,
      stockID: p.stockID  // Pass the stockID here
    }));

    // Save all to database
    await Product.insertMany(formatted);

    res.json({ success: true, message: "Products added successfully!" });
  } catch (err) {
    console.error("❌ Failed to save products:", err);
    res.status(500).json({ success: false, message: "Server error: " + err.message });
  }
});



/* ================================
   🟢 3️⃣ All Products Page (GET)
   -> Shows all products with stats
================================ */
// 🟢 3️⃣ All Products Page (GET) — with filters

const PKT_TIMEZONE = "Asia/Karachi"; // 🟢 Standard Timezone

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// 🟢 ALL PRODUCTS ROUTE
router.get("/all", isLoggedIn, allowRoles("admin", "worker"), async (req, res) => {
    const role = req.user.role;

    try {
        let { filter, from, to, brand, itemName, colourName, unit, stockStatus, refund } = req.query;
        let query = {};
        let start, end;

        // --- 🟢 Moment Timezone Logic (Same as All Sales) ---
        if (filter === "today") {
            start = moment.tz(PKT_TIMEZONE).startOf('day').toDate();
            end = moment.tz(PKT_TIMEZONE).endOf('day').toDate();
        } else if (filter === "yesterday") {
            start = moment.tz(PKT_TIMEZONE).subtract(1, 'days').startOf('day').toDate();
            end = moment.tz(PKT_TIMEZONE).subtract(1, 'days').endOf('day').toDate();
        } else if (filter === "month") {
            start = moment.tz(PKT_TIMEZONE).startOf('month').toDate();
            end = moment.tz(PKT_TIMEZONE).endOf('day').toDate();
        } else if (filter === "lastMonth") {
            start = moment.tz(PKT_TIMEZONE).subtract(1, 'months').startOf('month').toDate();
            end = moment.tz(PKT_TIMEZONE).subtract(1, 'months').endOf('month').toDate();
        } else if (filter === "custom" && (from || to)) {
            const fromDate = from ? moment.tz(from, PKT_TIMEZONE).startOf('day') : null;
            const toDate = to ? moment.tz(to, PKT_TIMEZONE).endOf('day') : (fromDate ? fromDate.clone().endOf('day') : null);
            if (fromDate) start = fromDate.toDate();
            if (toDate) end = toDate.toDate();
        }

        if (start && end) {
            query.createdAt = { $gte: start, $lte: end };
        }

        // 🔵 CONSOLE LOGS (Debugging for Atlas)
        console.log("--- 🟢 PRODUCT FILTER DEBUG ---");
        console.log("Filter Type:", filter);
        console.log("PKT Start:", start ? moment(start).tz(PKT_TIMEZONE).format() : "N/A");
        console.log("PKT End:", end ? moment(end).tz(PKT_TIMEZONE).format() : "N/A");
        console.log("UTC Start (Atlas):", start ? start.toISOString() : "N/A");
        console.log("UTC End (Atlas):", end ? end.toISOString() : "N/A");
        console.log("-------------------------------");

        // --- Brand filter mapping ---
        if (brand && brand !== "all") {
            if (brand === "Weldon Paints") query.brandName = /^Weldon Paints$/i;
            else if (brand === "Sparco Paints") query.brandName = /^Sparco Paints$/i;
            else if (brand === "Value Paints") query.brandName = /^Value Paints$/i;
            else if (brand === "Corona Paints") query.brandName = /^Corona Paints$/i;
            else if (brand === "Other Paints") query.brandName = /Other Paints|Other/i;
        }

        // --- Item filter ---
        if (itemName && itemName !== "all") {
            const knownNames = ["Weather Shield", "Emulsion", "Enamel"];
            if (itemName === "Other") {
                query.itemName = { $nin: knownNames };
            } else {
                query.itemName = new RegExp(`^${itemName}$`, "i");
            }
        }

        // --- Colour filter ---
       // Pehle yahan (brand === "Weldon Paints") laga tha, maine wo hata diya hai
        if (colourName && colourName !== "all") {
            const escapedColourName = escapeRegExp(colourName);
            query.colourName = new RegExp(`^${escapedColourName}$`, "i");
        }

        // --- Unit filter ---
        if (unit && unit !== "all") {
            query.qty = new RegExp(unit, "i");
        }

        // --- Stock status ---
        if (stockStatus && stockStatus !== "all") {
            query.remaining = stockStatus === "in" ? { $gt: 0 } : { $eq: 0 };
        }

        // --- Refund status ---
        if (refund && refund !== "all") query.refundStatus = refund;

        // --- Fetch & Sort ---
        const filteredProducts = await Product.find(query).sort({ createdAt: -1 });

        // --- Stats Calculation ---
        let totalStock = 0, totalRemaining = 0, totalValue = 0, remainingValue = 0, totalRefundedValue = 0;
        filteredProducts.forEach(p => {
            totalStock += p.totalProduct || 0;
            totalValue += (p.totalProduct || 0) * (p.rate || 0);
            totalRemaining += Math.min(p.remaining || 0, p.totalProduct || 0);
            totalRefundedValue += Math.min(p.refundQuantity || 0, p.totalProduct || 0) * (p.rate || 0);
            remainingValue += (p.remaining || 0) * (p.rate || 0);
        });

        res.render("allProducts", {
            products: filteredProducts,
            stats: { totalStock, totalRemaining, totalValue, remaining: remainingValue, totalRefundedValue },
            filter, from, to,
            selectedBrand: brand || "all",
            selectedItem: itemName || "all",
            selectedColour: colourName || "all",
            selectedUnit: unit || "all",
            stockStatus: stockStatus || "all",
            selectedRefund: refund || "all",
            role
        });
    } catch (err) {
        console.error("❌ Error loading All Products:", err);
        res.status(500).send("Error loading products page");
    }
});




/* ================================
   🟢  Delete Product (DELETE)
================================ */
router.delete("/delete-product/:id",isLoggedIn,allowRoles("admin"), async (req, res) => {
  try {
    const productId = req.params.id;
    const deletedProduct = await Product.findByIdAndDelete(productId);
    if (!deletedProduct) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }
    res.json({ success: true, message: "Product deleted successfully!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Error deleting Product" });
  }
});



router.get('/refund',isLoggedIn,allowRoles("admin", "worker"),(req,res)=>{
const role=req.user.role;
res.render('refundProducts',{role});
});




router.post('/refund',isLoggedIn,allowRoles("admin", "worker"), async (req, res) => {
  try {
    let { stockID, saleID, productQuantity } = req.body;

    saleID = saleID.trim(); // 🆕 added

    stockID = stockID.trim();
    productQuantity = parseInt(productQuantity);

    if (!stockID || !productQuantity || productQuantity <= 0) {
      return res.status(400).send("❌ Invalid StockID or quantity");
    }

    const sale = await Sale.findOne({ stockID, saleID }); // 🔄 changed
    const product = await Product.findOne({ stockID });

    if (!sale || !product) {
      return res.status(404).send("❌ Sale or Product not found");
    }

    // Maximum refundable quantity based on sale
    const maxRefundable = sale.quantitySold - sale.refundQuantity;
    if (productQuantity > maxRefundable) {
      return res.status(400).send(`❌ Refund quantity exceeds remaining sold quantity. Max allowed: ${maxRefundable}`);
    }

    const refundQty = productQuantity;

    // --- Update Sale ---
    const purchaseRate = product.rate || 0;
    const refundProfit = parseFloat(((sale.rate - purchaseRate) * refundQty).toFixed(2));
    sale.profit = parseFloat((sale.profit - refundProfit).toFixed(2));
    if (sale.profit < 0) sale.profit = 0;
    sale.refundQuantity += refundQty;

    if (sale.refundQuantity === 0) sale.refundStatus = "Not Refunded";
    else if (sale.refundQuantity >= sale.quantitySold) sale.refundStatus = "Fully Refunded";
    else sale.refundStatus = "Partially Refunded";

    await sale.save();

    // --- Update Product ---
    product.remaining = Math.min(product.remaining + refundQty, product.totalProduct);
    
    const allSales = await Sale.find({ stockID });
    const totalRefundedQty = allSales.reduce((acc, s) => acc + (s.refundQuantity || 0), 0);
    product.refundQuantity = Math.min(totalRefundedQty, product.totalProduct);

    if (product.refundQuantity === 0) product.refundStatus = "Not Refunded";
    else if (product.refundQuantity >= product.totalProduct) product.refundStatus = "Fully Refunded";
    else product.refundStatus = "Partially Refunded";

    await product.save();

    res.send(`✅ Refund successful. ${refundQty} items returned to stock for SaleID: ${saleID}`); // 🔄 changed


  } catch (err) {
    console.error(err);
    res.status(500).send("❌ Internal Server Error");
  }
});





router.get('/print',isLoggedIn,allowRoles("admin", "worker"), (req, res) => {
  let products = [];
  if (req.query.data) {
    try {
      products = JSON.parse(decodeURIComponent(req.query.data));
    } catch (err) {
      console.error("Error parsing print data:", err);
    }
  }
 let currentDate;
if (process.env.NODE_ENV === 'production') {
  // deployed server, force PKT
  currentDate = new Date().toLocaleString('en-US', { 
    timeZone: 'Asia/Karachi',
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });
} else {
  // localhost, just use local time
  currentDate = new Date().toLocaleString('en-US', { 
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });
}

  res.render('printProducts', { products, currentDate });
});






// Use export default to export the router in ES Modules
export default router;
