import express from 'express';  
import Product from "../models/Product.js";
import Sale from "../models/Sale.js";
import Agent from '../models/Agent.js';
import Item from '../models/Item.js';
import { isLoggedIn } from "../middleware/isLoggedIn.js";
import { allowRoles } from "../middleware/allowRoles.js";
import moment from 'moment-timezone';


const router = express.Router();

/* ================================
   🟢 1️⃣ Add Sale Page (GET)
================================ */
router.get("/add",isLoggedIn,allowRoles("admin", "worker"), async (req, res) => {
  const role=req.user.role;
  try {
    // Fetch all products
    const products = await Product.find();

    // Fetch all agents
    const agents = await Agent.find();

    // Render EJS with products and agents
    res.render("addSale", { products, agents,role });
  } catch (err) {
    console.error("❌ Error loading Add Sale page:", err);
    res.status(500).send("Error loading Add Sale page");
  }
});





/* ================================
   🟢 2️⃣ Add Sale (POST)
   ✅ No FIFO logic, directly decrease stock
================================ */
// Add Sale (POST) - with FIFO logic removed but ensuring proper profit/loss calculation
router.post("/add",isLoggedIn,allowRoles("admin", "worker"), async (req, res) => {
  try {
    const { sales, agentID, percentage } = req.body; // frontend se pura tempSales array bhejna

    if (!sales || !Array.isArray(sales) || sales.length === 0) {
      return res.status(400).json({ success: false, message: "No sales provided." });
    }

    let totalQuantityForAgent = 0;
    let totalAmountForAgent = 0;

    // loop through all sales and create Sale documents
    for (const s of sales) {
      const { brandName, itemName, colourName, qty, quantitySold, rate, stockID, saleID } = s;

      const product = await Product.findOne({ stockID });
      if (!product) return res.status(404).json({ success: false, message: `Product not found: ${itemName}` });

      if (quantitySold > product.remaining)
        return res.status(400).json({ success: false, message: `Only ${product.remaining} left for ${itemName}!` });

      const profit = Math.round(((rate - (product.rate || 0)) * quantitySold + Number.EPSILON) * 100)/100;
      product.remaining -= quantitySold;
      await product.save();

      await Sale.create({
        brandName,
        itemName,
        colourName,
        qty,
        quantitySold,
        rate,
        stockID,
        saleID,
        profit,
        refundQuantity: 0,
        refundStatus: "none"
      });

      if (agentID && percentage > 0) {
        totalQuantityForAgent += quantitySold;
        totalAmountForAgent += quantitySold * rate;
      }
    }

    // ✅ Agent Item creation once
    if (agentID && percentage > 0) {
      const agent = await Agent.findOne({ agentID });
      if (agent) {
        const percentageAmount = Math.round((totalAmountForAgent * percentage / 100 + Number.EPSILON) * 100) / 100;

        const agentItem = await Item.create({
          agent: agent._id,
          totalProductSold: totalQuantityForAgent,
          totalProductAmount: totalAmountForAgent,
          percentage,
          percentageAmount,
          paidStatus: "Unpaid"
        });

        agent.items.push(agentItem._id);
        await agent.save();
      }
    }

    res.json({ success: true, message: `All sales completed successfully.` });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error: " + err.message });
  }
});







/* ================================
   🟢 3️⃣ All Sales Page (GET)
   ✅ Includes Total Stats
================================ */

// PKT Time Zone Identifier
const PKT_TIMEZONE = 'Asia/Karachi';

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

router.get("/all", isLoggedIn, allowRoles("admin"), async (req, res) => {
    const role = req.user.role;
    try {
        let { filter, from, to, brand, itemName, colourName, unit, refund } = req.query;
        let query = {};
        let start, end;
        let dateOperator = '$lte'; // Default: For 'today', 'month', etc.

        // --- PKT AWARE Date Filters ---
        const nowPKT = moment().tz(PKT_TIMEZONE);
        
        // 1. NON-CUSTOM FILTERS (Use $lte and endOf('day'))
        if (filter === "today" || filter === "yesterday" || filter === "month" || filter === "lastMonth") {
            
            if (filter === "today") {
                start = nowPKT.clone().startOf('day').toDate();
                end = nowPKT.clone().endOf('day').toDate();
            } else if (filter === "yesterday") {
                const yesterdayPKT = nowPKT.clone().subtract(1, 'days');
                start = yesterdayPKT.startOf('day').toDate();
                end = yesterdayPKT.endOf('day').toDate();
            } else if (filter === "month") {
                start = nowPKT.clone().startOf('month').toDate();
                end = nowPKT.clone().endOf('day').toDate(); 
            } else if (filter === "lastMonth") {
                const lastMonthPKT = nowPKT.clone().subtract(1, 'months');
                start = lastMonthPKT.startOf('month').toDate();
                end = lastMonthPKT.endOf('month').toDate();
            }
        
        // 2. CUSTOM FILTER (FINAL ROBUST $lt$ Logic - Fixed Mutability)
        } else if (filter === "custom" && from && to) {
            
            dateOperator = '$lt'; // Operator changed to LESS THAN
            
            const f = moment.tz(from, 'YYYY-MM-DD', PKT_TIMEZONE);
            
            // Step 1: 'to' date ko sahi se parse karo
            let t = moment.tz(to, 'YYYY-MM-DD', PKT_TIMEZONE);

            // Step 2: Date ko ek din aage badhao (Mutation guaranteed)
            // Ab t khud 15 Dec 2025 ban jayega
            t.add(1, 'days').startOf('day'); 
            
            if (f.isValid() && t.isValid()) {
                // $gte: 'from' date ka 00:00:00 PKT
                start = f.startOf('day').toDate();
                
                // $lt: 'to' date se agle din ka 00:00:00 PKT. 
                end = t.toDate(); // Ab yeh 15 Dec 00:00 PKT (14 Dec 19:00 UTC) hona chahiye
            }
        }
        
        // Final MongoDB Query Construction: Date operator dynamically set hoga
        if (start && end) {
            query.createdAt = { $gte: start, [dateOperator]: end };
        }

        // 🛑 YAHAN LOG HAMESHA RAKHEIN 🛑
        console.log("PKT Start Time (UTC):", start);
        console.log(`PKT End Time (${dateOperator}):`, end);
        console.log("Final MongoDB Query:", query.createdAt);
        // ------------------------------------

        // --- Brand filter mapping (match exact brand strings used in Add Product) ---
        if (brand && brand !== "all") {
            if (brand === "Weldon Paints") query.brandName = /weldon/i;
            else if (brand === "Sparco Paints") query.brandName = /sparco/i;
            else if (brand === "Value Paints") query.brandName = /value/i;
            else if (brand === "Corona Paints") query.brandName = /Corona/i;
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

        // --- Colour filter
        // Pehle yahan (brand === "Weldon Paints") laga tha, maine wo hata diya hai
        if (colourName && colourName !== "all") {
            const escapedColourName = escapeRegExp(colourName);
            query.colourName = new RegExp(`^${escapedColourName}$`, "i");
        }

        // --- Unit filter
        if (unit && unit !== "all") {
            query.qty = new RegExp(unit, "i");
        }

        // --- Refund status
        if (refund && refund !== "all") query.refundStatus = refund;

        // --- Fetch Sales and Stats Calculation ---
        const filteredSales = await Sale.find(query).sort({ createdAt: -1 });

        let totalSold = 0;
        let totalRevenue = 0.0;
        let totalProfit = 0.0;
        let totalLoss = 0.0;
        let totalRefunded = 0.0;

        for (const s of filteredSales) {
            const product = await Product.findOne({ stockID: s.stockID });
            const purchaseRate = product ? parseFloat(product.rate || 0) : 0;

            let netSoldQty = s.quantitySold - (s.refundQuantity || 0);
            if (netSoldQty < 0) netSoldQty = 0;

            totalSold += netSoldQty;
            totalRevenue += parseFloat((netSoldQty * s.rate).toFixed(2));

            totalRefunded += parseFloat(((s.refundQuantity || 0) * (s.rate || 0)).toFixed(2));

            const saleProfit = parseFloat(((s.rate - purchaseRate) * netSoldQty).toFixed(2));
            if (saleProfit > 0) totalProfit += saleProfit;
            else totalLoss += Math.abs(saleProfit);
        }

        // --- Rendering ---
        res.render("allSales", {
            role,
            sales: filteredSales,
            stats: { totalSold, totalRevenue, totalProfit, totalLoss, totalRefunded },
            filter,
            from,
            to,
            selectedBrand: brand || "all",
            selectedItem: itemName || "all",
            selectedColour: colourName || "all",
            selectedUnit: unit || "all",
            selectedRefund: refund || "all"
        });

    } catch (err) {
        console.error("❌ Error loading All Sales:", err);
        res.status(500).send("Error loading sales page");
    }
});






/* ================================
   🟢 4️⃣ Delete Sale (DELETE)
================================ */
router.delete("/delete-sale/:id",isLoggedIn,allowRoles("admin"), async (req, res) => {
  try {
    const saleId = req.params.id;
    const deletedSale = await Sale.findByIdAndDelete(saleId);
    if (!deletedSale) {
      return res.status(404).json({ success: false, message: "Sale not found" });
    }
    res.json({ success: true, message: "Sale deleted successfully!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Error deleting sale" });
  }
});



router.get('/print',isLoggedIn,allowRoles("admin", "worker"), async (req, res) => {
  let sales = [];

  if (req.query.data) {
    // ✅ Data sent from frontend (tempSales)
    try {
      sales = JSON.parse(decodeURIComponent(req.query.data));
    } catch (err) {
      console.error("Error parsing print data:", err);
    }
  } else {
    // 🗄️ Fallback: load from DB if no query data found
    sales = await Sale.find().sort({ createdAt: -1 }).lean();
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



  res.render('printSales', { sales, currentDate });
  // console.log("Received print data:", req.query.data);

});



export default router;
