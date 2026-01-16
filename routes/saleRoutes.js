import express from 'express';  
import Product from "../models/Product.js";
import Sale from "../models/Sale.js";
import Agent from '../models/Agent.js';
import PrintSale from '../models/PrintSale.js'
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
/* ================================
   🟢 2️⃣ Add Sale (POST) - UPDATED
================================ */
router.post("/add", isLoggedIn, allowRoles("admin", "worker"), async (req, res) => {
  try {
    const { sales, agentID, percentage, customerName } = req.body;

    if (!customerName || !sales || sales.length === 0) {
      return res.status(400).json({ success: false, message: "Missing data." });
    }

    const stockIDs = sales.map(s => s.stockID);
    const products = await Product.find({ stockID: { $in: stockIDs } });
    const productMap = new Map(products.map(p => [p.stockID, p]));

    let totalQuantityForAgent = 0;
    let totalAmountForAgent = 0;
    const salesToCreate = [];
    const productUpdates = [];

    for (const s of sales) {
      const product = productMap.get(s.stockID);
      if (!product || s.quantitySold > product.remaining) {
        throw new Error(`Stock error for ${s.itemName}`);
      }

      const profit = Math.round(((s.rate - product.rate) * s.quantitySold) * 100) / 100;
      
      salesToCreate.push({
        ...s,
        profit,
        refundQuantity: 0,
        refundStatus: "none"
      });

      productUpdates.push({
        updateOne: {
          filter: { _id: product._id },
          update: { $inc: { remaining: -s.quantitySold } }
        }
      });

      totalQuantityForAgent += s.quantitySold;
      totalAmountForAgent += (s.quantitySold * s.rate);
    }

    // 1. Sales & Products Update
    const savedSales = await Sale.insertMany(salesToCreate);
    await Product.bulkWrite(productUpdates);

    // 2. Bill Create karen (Ye hamesha banna chahiye)
    let dbAgent = null;
    if (agentID) {
        dbAgent = await Agent.findOne({ agentID });
    }

    const savedBill = await PrintSale.create({
        customerName: customerName,
        salesItems: savedSales.map(sale => sale._id),
        agentId: dbAgent ? dbAgent._id : null
    });

    // 3. ✅ Bill ID ko hamesha update karen (Agent ho ya na ho)
    const saleIds = savedSales.map(s => s._id);
    
    // Default update (Sirf Bill ID)
    await Sale.updateMany(
      { _id: { $in: saleIds } },
      { $set: { billId: savedBill._id } }
    );

    // 4. Agent Commission Logic (Sirf agar Agent ho)
    if (dbAgent && percentage > 0) {
      const percentageAmount = Math.round((totalAmountForAgent * percentage / 100) * 100) / 100;
      
      const agentItem = await Item.create({
        agent: dbAgent._id,
        billId: savedBill._id,
        totalProductSold: totalQuantityForAgent,
        totalProductAmount: totalAmountForAgent,
        percentage,
        percentageAmount,
        paidStatus: "Unpaid"
      });

      // ✅ Agent Item ID bhi update karen unhi sales par
      await Sale.updateMany(
        { _id: { $in: saleIds } },
        { $set: { agentItemId: agentItem._id } }
      );

      dbAgent.items.push(agentItem._id);
      await dbAgent.save();
    }

    res.json({ success: true, message: "Sale and History Saved!", billId: savedBill._id });

  } catch (err) {
    console.error("❌ Add Sale Error:", err);
    res.status(400).json({ success: false, message: err.message });
  }
});







/* ================================
   🟢 3️⃣ All Sales Page (GET)
   ✅ Includes Total Stats
================================ */
// PKT Time Zone Identifier
// PKT Time Zone Identifier
// PKT Time Zone Identifier
const PKT_TIMEZONE = 'Asia/Karachi';

// Regex escape function jo aapne manga tha
function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

router.get("/all", isLoggedIn, allowRoles("admin"), async (req, res) => {
    const role = req.user.role;
    try {
        // 🟢 DEFAULT FILTER: Agar koi filter na ho to 'month' auto-select hoga
        let { filter = 'month', from, to, brand, itemName, colourName, unit, refund } = req.query;
        
        let query = {};
        let start, end;
        let dateOperator = '$lte'; 

        const nowPKT = moment().tz(PKT_TIMEZONE);
        
        // 🟢 Date Logic with Default 'month' behavior
        if (filter === "today" || filter === "yesterday" || filter === "month" || filter === "lastMonth") {
            if (filter === "today") {
                start = nowPKT.clone().startOf('day').toDate();
                end = nowPKT.clone().endOf('day').toDate();
            } else if (filter === "yesterday") {
                const yesterdayPKT = nowPKT.clone().subtract(1, 'days');
                start = yesterdayPKT.startOf('day').toDate();
                end = yesterdayPKT.endOf('day').toDate();
            } else if (filter === "month") {
                // This Month logic
                start = nowPKT.clone().startOf('month').toDate();
                end = nowPKT.clone().endOf('day').toDate(); 
            } else if (filter === "lastMonth") {
                const lastMonthPKT = nowPKT.clone().subtract(1, 'months');
                start = lastMonthPKT.startOf('month').toDate();
                end = lastMonthPKT.endOf('month').toDate();
            }
        } else if (filter === "custom" && from && to) {
            dateOperator = '$lt'; 
            const f = moment.tz(from, 'YYYY-MM-DD', PKT_TIMEZONE);
            let t = moment.tz(to, 'YYYY-MM-DD', PKT_TIMEZONE);
            
            t.add(1, 'days').startOf('day'); 
            
            if (f.isValid() && t.isValid()) {
                start = f.startOf('day').toDate();
                end = t.toDate(); 
            }
        }
        
        // Apply date query if start/end exists
        if (start && end) {
            query.createdAt = { $gte: start, [dateOperator]: end };
        }

        // 🟢 Brand Filters
        if (brand && brand !== "all") {
            if (brand === "Weldon Paints") query.brandName = /weldon/i;
            else if (brand === "Sparco Paints") query.brandName = /sparco/i;
            else if (brand === "Value Paints") query.brandName = /value/i;
            else if (brand === "Corona Paints") query.brandName = /Corona/i;
            else if (brand === "Other Paints") query.brandName = /Other Paints|Other/i;
        }

        // 🟢 Item Name Filter
        if (itemName && itemName !== "all") {
            const knownNames = ["Weather Shield", "Emulsion", "Enamel"];
            if (itemName === "Other") query.itemName = { $nin: knownNames };
            else query.itemName = new RegExp(`^${escapeRegExp(itemName)}$`, "i");
        }

        // 🟢 Colour Filter
        if (colourName && colourName !== "all") {
            query.colourName = new RegExp(`^${escapeRegExp(colourName)}$`, "i");
        }

        // 🟢 Unit/Qty Filter
        if (unit && unit !== "all") {
            query.qty = new RegExp(escapeRegExp(unit), "i");
        }

        // 🟢 Refund Filter
       // Sale Refund Filter Logic
if (refund && refund !== "all") {
    if (refund === "both") {
        // Dono refunded status ko filter mein shamil karein
        query.refundStatus = { $in: ["Partially Refunded", "Fully Refunded"] };
    } else {
        // Normal filter (none, Partially, ya Fully)
        query.refundStatus = refund;
    }
}

        // 🟢 Data Fetching (Optimized)
        const filteredSales = await Sale.find(query).sort({ createdAt: -1 }).lean();
        const allProducts = await Product.find({}, 'stockID rate').lean();
        
        const productMap = {};
        allProducts.forEach(p => {
            productMap[p.stockID] = parseFloat(p.rate || 0);
        });

        let totalSold = 0, totalRevenue = 0, totalProfit = 0, totalLoss = 0, totalRefunded = 0;
        const enrichedSales = [];

        for (const s of filteredSales) {
            const purchaseRate = productMap[s.stockID] || 0;
            let netSoldQty = Math.max(0, (s.quantitySold || 0) - (s.refundQuantity || 0));

            totalSold += netSoldQty;
            totalRevenue += (netSoldQty * (s.rate || 0));
            totalRefunded += ((s.refundQuantity || 0) * (s.rate || 0));

            const saleProfit = ((s.rate || 0) - purchaseRate) * netSoldQty;
            if (saleProfit > 0) totalProfit += saleProfit;
            else totalLoss += Math.abs(saleProfit);

            // Row level profit calculation for frontend display
            const rowProfit = parseFloat(saleProfit.toFixed(2));
            enrichedSales.push({ ...s, purchaseRate, profit: rowProfit });
        }

        const responseData = {
            sales: enrichedSales,
            stats: { 
                totalSold, 
                totalRevenue: parseFloat(totalRevenue.toFixed(2)), 
                totalProfit: parseFloat(totalProfit.toFixed(2)), 
                totalLoss: parseFloat(totalLoss.toFixed(2)), 
                totalRefunded: parseFloat(totalRefunded.toFixed(2)) 
            },
            role, 
            filter, 
            from, 
            to,
            selectedBrand: brand || "all",
            selectedItem: itemName || "all",
            selectedColour: colourName || "all",
            selectedUnit: unit || "all",
            selectedRefund: refund || "all"
        };

        // 🟢 Handle AJAX and Regular Request
        if (req.xhr || req.headers.accept.indexOf('json') > -1) {
            return res.json({ success: true, ...responseData });
        }
        res.render("allSales", responseData);

    } catch (err) {
        console.error("❌ Sales Route Error:", err);
        res.status(500).send("Server Error");
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



router.get('/print', isLoggedIn, allowRoles("admin", "worker"), async (req, res) => {
  let currentDate;
  if (process.env.NODE_ENV === 'production') {
    currentDate = new Date().toLocaleString('en-US', { 
      timeZone: 'Asia/Karachi',
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  } else {
    currentDate = new Date().toLocaleString('en-US', { 
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  }

  // ✅ Sirf page render karein, data LocalStorage se ayega
  res.render('printSales', { currentDate });
});





router.get('/refund',isLoggedIn,allowRoles("admin", "worker"),(req,res)=>{
const role=req.user.role;
res.render('refundSales',{role});
});



router.post('/refund', isLoggedIn, allowRoles("admin", "worker"), async (req, res) => {
  try {
    let { stockID, saleID, productQuantity } = req.body;
    saleID = saleID ? saleID.trim() : "";
    stockID = stockID ? stockID.trim() : "";
    productQuantity = parseInt(productQuantity);

    if (!stockID || !productQuantity || productQuantity <= 0) {
      return res.status(400).json({ success: false, message: "❌ Invalid Input" });
    }

    const sale = await Sale.findOne({ stockID, saleID });
    const product = await Product.findOne({ stockID });

    if (!sale || !product) {
      return res.status(404).json({ success: false, message: "❌ Sale or Product not found" });
    }

    // Maximum refundable quantity check
    const maxRefundable = sale.quantitySold - (sale.refundQuantity || 0);
    if (productQuantity > maxRefundable) {
      return res.status(400).json({ success: false, message: `❌ Refund quantity exceeds remaining sold quantity. Max allowed: ${maxRefundable}` });
    }

    const refundQty = productQuantity;
    const refundAmount = refundQty * sale.rate;

    // --- 1. Update Sale (Profit & Qty) ---
    const purchaseRate = product.rate || 0;
    const refundProfit = parseFloat(((sale.rate - purchaseRate) * refundQty).toFixed(2));
    
    sale.profit = Math.max(0, parseFloat((sale.profit - refundProfit).toFixed(2)));
    sale.refundQuantity = (sale.refundQuantity || 0) + refundQty;

    if (sale.refundQuantity >= sale.quantitySold) {
        sale.refundStatus = "Fully Refunded";
    } else {
        sale.refundStatus = "Partially Refunded";
    }
    await sale.save();

    // --- 2. Update Product (Stock wapas barhao) ---
    product.remaining = product.remaining + refundQty;
    await product.save();

    // --- 3. Update Agent Commission ---
    if (sale.agentItemId) {
        const agentItem = await Item.findById(sale.agentItemId);
        if (agentItem) {
            agentItem.totalProductSold -= refundQty;
            agentItem.totalProductAmount -= refundAmount;

            const newCommission = (agentItem.totalProductAmount * agentItem.percentage) / 100;
            agentItem.percentageAmount = Math.round(newCommission * 100) / 100;

            if (agentItem.paidAmount >= agentItem.percentageAmount) {
                agentItem.paidStatus = "Paid";
            } else if (agentItem.paidAmount > 0) {
                agentItem.paidStatus = "Partial";
            } else {
                agentItem.paidStatus = "Unpaid";
            }
            await agentItem.save();
        }
    }

    

    // ✅ Simple and Clean Response
   res.json({ 
    success: true, 
    message: sale.billId 
        ? "✅ Refund successful." 
        : "✅ Refund successful, but Bill ID not found.",
    billId: sale.billId || null 
});


  } catch (err) {
    console.error("❌ Refund Error:", err);
    res.status(500).json({ success: false, message: "❌ Internal Server Error" });
  }
});



// Sales History Page Route
/* ================================
   🟢 3️⃣ Sales History (GET)
================================ */
/* ================================
   🟢 Sales History (GET) 
================================ */
router.get('/history', isLoggedIn, allowRoles("admin","worker"), async (req, res) => {
    try {
        let { filter = 'month', agentId, from, to, ajax } = req.query;
        let query = {};
        const PKT_TIMEZONE = 'Asia/Karachi'; 
        const nowPKT = moment().tz(PKT_TIMEZONE);

        // --- 1. Filter Logic ---
        if (filter === 'today') {
            query.createdAt = { $gte: nowPKT.clone().startOf('day').toDate(), $lte: nowPKT.clone().endOf('day').toDate() };
        } else if (filter === 'yesterday') {
            const yesterday = nowPKT.clone().subtract(1, 'days');
            query.createdAt = { $gte: yesterday.startOf('day').toDate(), $lte: yesterday.endOf('day').toDate() };
        } else if (filter === 'month') {
            query.createdAt = { $gte: nowPKT.clone().startOf('month').toDate(), $lte: nowPKT.clone().endOf('day').toDate() };
        } else if (filter === 'lastMonth') {
            const lastMonth = nowPKT.clone().subtract(1, 'months');
            query.createdAt = { $gte: lastMonth.startOf('month').toDate(), $lte: lastMonth.endOf('month').toDate() };
        } else if (filter === 'custom' && from && to) {
            query.createdAt = { 
                $gte: moment.tz(from, PKT_TIMEZONE).startOf('day').toDate(), 
                $lte: moment.tz(to, PKT_TIMEZONE).endOf('day').toDate() 
            };
        }

        if (agentId && agentId !== 'all') {
            query.agentId = agentId;
        }

        // --- 2. Database Query ---
        const history = await PrintSale.find(query)
            .populate('agentId', 'name')
            .populate('salesItems') 
            .sort({ createdAt: -1 })
            .lean(); 

        const agents = await Agent.find({}, 'name phone').lean();
        
        // --- 3. Timezone Correction & Revenue Calculation ---
        let totalRevenue = 0;
        history.forEach(bill => {
        // 1. Timezone Fix (Moment-Timezone use karte hue)
        bill.formattedDate = moment(bill.createdAt).tz(PKT_TIMEZONE).format('DD/MM/YYYY');
        bill.formattedTime = moment(bill.createdAt).tz(PKT_TIMEZONE).format('hh:mm A');

         if (bill.salesItems) {
         bill.salesItems.forEach(item => {
            // 2. Refund Minus Logic: Revenue sirf asali sale par calculate hoga
            // Actual Qty = Jitni bechi thi - Jitni refund hui
            const actualQty = (item.quantitySold || 0) - (item.refundQuantity || 0);
            const itemRate = item.rate || 0;

            // Revenue mein sirf bachi hui quantity ka paisa jama hoga
            totalRevenue += (actualQty * itemRate);
        });
    }
});

        // --- 4. Responses ---
        if (ajax === 'true') {
            return res.json({ 
                success: true, 
                history, // Isme ab formattedDate aur formattedTime shamil hai
                totalRevenue,
                count: history.length 
            });
        }

        res.render('salesHistory', { 
            history, 
            agents, 
            role: req.user.role, 
            filter, 
            selectedAgent: agentId || 'all', 
            from, to, 
            totalRevenue,
            moment // EJS mein direct use karne ke liye
        });

    } catch (err) {
        console.error("❌ History Filter Error:", err);
        if (req.query.ajax === 'true') return res.status(500).json({ success: false });
        res.status(500).send("Error loading history");
    }
});



/* ================================
   🟢 6️⃣ View Individual Bill (GET)
================================ */
/* ================================
   🟢 View Bill Route
================================ */
router.get('/bill/:id', isLoggedIn, allowRoles("admin", "worker"), async (req, res) => {
    try {
        // 🟢 Optimized Population: Hum specify kar rahe hain ke SalesItems se kya kya chahiye
        const bill = await PrintSale.findById(req.params.id)
            .populate({
                path: 'salesItems',
                select: 'stockID saleID itemName brandName refundQuantity colourName qty quantitySold rate createdAt' 
            })
            .populate('agentId', 'name');

        if (!bill) return res.status(404).send("Bill not found");

        // 🟢 Total calculation (Safety check ke saath)
        const totalAmount = bill.salesItems.reduce((acc, item) => {
        const itemRate = item.rate || 0;
        // Refund ko minus kar ke asali sold qty nikalna
        const actualQty = (item.quantitySold || 0) - (item.refundQuantity || 0);
        return acc + (actualQty * itemRate);
        }, 0);

        // Render with all data
        res.render('viewBill', { 
            bill, 
            totalAmount, 
            role: req.user.role,
            moment // Timezone fix ke liye moment pass karna zaroori hai
        });
    } catch (err) {
        console.error("❌ View Bill Error:", err);
        res.status(500).send("Error loading bill details");
    }
});



/* ================================
   🔴 Delete Bill Route
================================ */
router.delete("/delete-bill/:id", isLoggedIn, allowRoles("admin"), async (req, res) => {
    try {
        const billId = req.params.id;
        
        // 1. Bill ka data nikaalein taake pata chale isme kaunse sales items hain
        const bill = await PrintSale.findById(billId);
        if (!bill) return res.status(404).json({ success: false, message: "Bill not found" });
        
        // 2. PrintSale (History record) delete karein
        await PrintSale.findByIdAndDelete(billId);

        res.json({ success: true, message: "Bill deleted successfully!" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Error deleting bill" });
    }
});



// Ye script aapke purane data ko link karne ke liye hai
router.get("/fix-old-sales", isLoggedIn, allowRoles("admin"), async (req, res) => {
  try {
    // 1. Saare Bills uthaein
    const allBills = await PrintSale.find({});
    let updatedCount = 0;

    for (const bill of allBills) {
      if (bill.salesItems && bill.salesItems.length > 0) {
        // 2. Is Bill ke andar jitni sales hain, un sab mein billId save kar do
        await Sale.updateMany(
          { _id: { $in: bill.salesItems } }, 
          { $set: { billId: bill._id } }
        );
        updatedCount += bill.salesItems.length;
      }
    }

    res.send(`✅ Success! ${updatedCount} purani sales ko unke Bills ke sath link kar diya gaya hai.`);
  } catch (err) {
    console.error(err);
    res.status(500).send("❌ Error fixing data: " + err.message);
  }
});




export default router;
