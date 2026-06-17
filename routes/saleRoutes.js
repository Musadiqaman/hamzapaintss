import express from 'express';  
import Product from "../models/Product.js";
import Sale from "../models/Sale.js";
import Agent from '../models/Agent.js';
import AgentItem from '../models/AgentItem.js';
import PrintSale from '../models/PrintSale.js'
import Customer from '../models/Customer.js';
import CustomerItem from '../models/CustomerItem.js';
import CustomerPaymentHistory from "../models/CustomerPaymentHistory.js";
import RefundSaleHistory from "../models/RefundSaleHistory.js";
import ItemDefinition from "../models/ItemDefinition.js";
import { isLoggedIn } from "../middleware/isLoggedIn.js";
import { allowRoles } from "../middleware/allowRoles.js";
import moment from 'moment-timezone';
import { deleteAndSync } from "../app.js";


const router = express.Router();



/* ================================
   🟢 1️⃣ Add Sale Page (GET) 
================================ */
router.get("/add", isLoggedIn, allowRoles("admin", "worker"), async (req, res) => {
  const role = req.user.role;
  try {
    // ✅ Sirf woh products jo in stock hain
    const products = await Product.find({ 
      remaining: { $gt: 0 }
    }).lean(); // ✅ lean() bhi lagao - faster hoga

    const agents = await Agent.find().lean();
    const customers = await Customer.find().lean();

    res.render("addSale", { products, agents, customers, role });
  } catch (err) {
    console.error("❌ Error loading Add Sale page:", err);
    res.status(500).send("Error loading Add Sale page");
  }
});


/* ================================
   🟢 2️⃣ Add Sale (POST)

================================ */
// Add Sale (POST) - with FIFO logic removed but ensuring proper profit/loss calculation
/* ================================
   🟢 2️⃣ Add Sale (POST) - UPDATED
================================ */
router.post("/add", isLoggedIn, allowRoles("admin", "worker"), async (req, res) => {
  try {
    const { sales, agentID, percentage, customerId, customerName, billID, billtype } = req.body;
  
    if (!customerName || !sales || sales.length === 0 || !billID) {
      return res.status(400).json({ success: false, message: "Required fields missing." });
    }

    // 1. Fetching Products from DB
    const stockIDs = sales.map(s => s.stockID);
    const products = await Product.find({ stockID: { $in: stockIDs } });
    const productMap = new Map(products.map(p => [p.stockID, p]));

    let totalQty = 0;
    let totalBillAmount = 0;
    const salesToCreate = [];
    const productUpdates = [];

    // 2. Prepare Sales and Stock Updates
    for (const s of sales) {
      const product = productMap.get(s.stockID);
      if (!product || s.quantitySold > product.remaining) {
        throw new Error(`Stock error for item: ${s.itemName}. Only ${product ? product.remaining : 0} left.`);
      }

      const profit = Math.round(((s.rate - product.rate) * s.quantitySold) * 100) / 100;
      
      salesToCreate.push({
        ...s,
        productRate: product.rate, 
        profit: profit,
        refundQuantity: 0,
        refundStatus: "none"
      });

      // Yeh line badlo:
  productUpdates.push({
  updateOne: {
    filter: { _id: product._id },
    update: { 
      $inc: { remaining: -s.quantitySold },
      $set: { syncedToAtlas: false } // ✅ yeh add karo
    }
  }
});

      totalQty += s.quantitySold;
      totalBillAmount += (s.quantitySold * s.rate);
    }

    // 3. Database Execution
    const savedSales = await Sale.insertMany(salesToCreate);
    await Product.bulkWrite(productUpdates);

    // 4. Create the Bill
    const savedBill = await PrintSale.create({
        customerName: customerName,
        billtype: billtype,
        customerId: customerId || null,
        agentId: agentID,
        billID: billID,
        salesItems: savedSales.map(sale => sale._id)
    });

    const saleIds = savedSales.map(s => s._id);
    let customerItemRef = null;

    // 5. 🟢 Customer Khata Logic (Nayi 3 Keys Ke Sath)
    if (customerId) {
        const stockValueSum = salesToCreate.reduce((acc, s) => acc + (s.quantitySold * s.productRate), 0);
        const profitSum = salesToCreate.reduce((acc, s) => acc + s.profit, 0);

        const newCustomerItem = await CustomerItem.create({
            customer: customerId,
            billId: savedBill._id,
            totalProductSold: totalQty,
            
            // Dynamic Keys (Refund par minus hoti rahengi)
            totalProductAmount: totalBillAmount, 
            totalStockValue: stockValueSum,      
            totalProfitValue: profitSum,         
            
            // ✅ Nayi Permanent Keys (Yeh hamesha same rahengi)
            originalProductAmount: totalBillAmount,
            originalStockValue: stockValueSum,
            originalProfitValue: profitSum,

            paidStatus: "Unpaid",
            paidAmount: 0
        });
        customerItemRef = newCustomerItem._id;
        
        await Customer.findByIdAndUpdate(customerId, {
            $push: { items: newCustomerItem._id },
            $set: { syncedToAtlas: false }
        });
    }

    // 6. Agent Commission logic
    let agentItemRef = null;
    if (agentID && percentage > 0) {
      const dbAgent = await Agent.findById(agentID);
      if (dbAgent) {
        const percentageAmount = Math.round((totalBillAmount * percentage / 100) * 100) / 100;
        
        const agentItem = await AgentItem.create({
          agent: dbAgent._id,
          billId: savedBill._id,
          totalProductSold: totalQty,
          totalProductAmount: totalBillAmount,
          percentage,
          percentageAmount,
          paidStatus: "Unpaid"
        });
        agentItemRef = agentItem._id;
        dbAgent.items.push(agentItem._id);
        dbAgent.syncedToAtlas = false; 
        await dbAgent.save();
      }
    }

    // Step 7 mein yeh already $set use kar raha hai — bas syncedToAtlas add karo:
await Sale.updateMany(
  { _id: { $in: saleIds } },
  { 
    $set: { 
      billId: savedBill._id,
      customerItemId: customerItemRef,
      agentItemId: agentItemRef,
      syncedToAtlas: false // ✅ yeh add karo
    } 
  }
);

    res.json({ 
        success: true, 
        message: "Sale processed successfully!", 
        billId: savedBill._id 
    });

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
const PKT_TIMEZONE = 'Asia/Karachi';

// Regex escape function - Isko hamesha route se bahar rakhein
function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

router.get("/all", isLoggedIn, allowRoles("admin","worker"), async (req, res) => {
    const role = req.user.role;
    try {
        let { filter = 'month', from, to, brand, itemName, colourName, unit, refund } = req.query;
        
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 25;
        const skip = (page - 1) * limit;

        const definitions = await ItemDefinition.find({}).lean();

        const nowPKT = moment().tz(PKT_TIMEZONE);
        let start, end;

        if (filter === "today") {
            start = nowPKT.clone().startOf('day').toDate();
            end = nowPKT.clone().endOf('day').toDate();
        } else if (filter === "yesterday") {
            const y = nowPKT.clone().subtract(1, 'days');
            start = y.startOf('day').toDate();
            end = y.endOf('day').toDate();
        } else if (filter === "month") {
            start = nowPKT.clone().startOf('month').toDate();
            end = nowPKT.clone().endOf('day').toDate();
        } else if (filter === "lastMonth") {
            const lm = nowPKT.clone().subtract(1, 'months');
            start = lm.startOf('month').toDate();
            end = lm.endOf('month').toDate();
        } else if (filter === "custom" && from && to) {
            start = moment.tz(from, 'YYYY-MM-DD', PKT_TIMEZONE).startOf('day').toDate();
            end = moment.tz(to, 'YYYY-MM-DD', PKT_TIMEZONE).endOf('day').toDate();
        } else if (filter === "all") {
            start = new Date(0);
            end = new Date(nowPKT.clone().add(100, 'years'));
        }

        // ✅ Simple date query - no $or
        let mainQuery = {};
        if (start && end) {
            mainQuery = { createdAt: { $gte: start, $lte: end } };
        }

        let finalCriteria = { $and: [mainQuery] };

        if (brand && brand !== "all") finalCriteria.$and.push({ brandName: new RegExp(`^${escapeRegExp(brand)}$`, "i") });
        if (itemName && itemName !== "all") finalCriteria.$and.push({ itemName: new RegExp(`^${escapeRegExp(itemName)}$`, "i") });
        if (colourName && colourName !== "all") finalCriteria.$and.push({ colourName: new RegExp(`^${escapeRegExp(colourName)}$`, "i") });
        if (unit && unit !== "all") finalCriteria.$and.push({ qty: new RegExp(escapeRegExp(unit), "i") });
        if (refund && refund !== "all") {
            const refundCond = refund === "both" ? { $in: ["Partially Refunded", "Fully Refunded"] } : refund;
            finalCriteria.$and.push({ refundStatus: refundCond });
        }

        // ✅ Sab kuch parallel - aggregate + count + paginated data + refunds
        const refundDateQuery = start && end ? { createdAt: { $gte: start, $lte: end } } : {};

        const [statsResult, totalCount, refundAgg, sales] = await Promise.all([
            Sale.aggregate([
                { $match: finalCriteria },
                {
                    $group: {
                        _id: null,
                        totalRevenue: { $sum: { $multiply: ["$quantitySold", "$productRate"] } },
                        totalProfit: { $sum: { $cond: [{ $gt: ["$profit", 0] }, "$profit", 0] } },
                        totalLoss: { $sum: { $cond: [{ $lt: ["$profit", 0] }, { $abs: "$profit" }, 0] } }
                    }
                }
            ]),
            Sale.countDocuments(finalCriteria),
            RefundSaleHistory.aggregate([
                { $match: refundDateQuery },
                { $group: { _id: null, totalRefunded: { $sum: "$refundStock" }, totalRefundedprofit: { $sum: "$refundProfit" } } }
            ]),
            Sale.find(finalCriteria)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean()
        ]);

        const s = statsResult[0] || {};
        const r = refundAgg[0] || {};
        const totalPages = Math.ceil(totalCount / limit);

        const responseData = {
            sales,
            definitions,
            stats: {
                totalRevenue: parseFloat((s.totalRevenue || 0).toFixed(2)),
                totalProfit: parseFloat((s.totalProfit || 0).toFixed(2)),
                totalLoss: parseFloat((s.totalLoss || 0).toFixed(2)),
                totalRefunded: parseFloat((r.totalRefunded || 0).toFixed(2)),
                totalRefundedprofit: parseFloat((r.totalRefundedprofit || 0).toFixed(2))
            },
            pagination: {
                page, limit, totalCount, totalPages,
                hasNext: page < totalPages,
                hasPrev: page > 1
            },
            role, filter, from, to,
            selectedBrand: brand || "all",
            selectedItem: itemName || "all",
            selectedColour: colourName || "all",
            selectedUnit: unit || "all",
            selectedRefund: refund || "all"
        };

        if (req.xhr || (req.headers.accept && req.headers.accept.indexOf('json') > -1)) {
            return res.json({ success: true, ...responseData });
        }
        res.render("allSales", responseData);

    } catch (err) {
        console.error("❌ All Sales Route Error:", err);
        res.status(500).send("Internal Server Error");
    }
});




/* ================================
   🟢 4️⃣ Delete Sale (DELETE)
================================ */
router.delete("/delete-sale/:id", isLoggedIn, allowRoles("admin"), async (req, res) => {
  try {
    const saleId = req.params.id;
    
    // 1. Pehle check karo ke sale exist karti hai ya nahi
    const sale = await Sale.findById(saleId);
    if (!sale) {
      return res.status(404).json({ success: false, message: "Sale not found" });
    }

    // 2. deleteAndSync function call karo (Yeh local se delete bhi karega aur PendingDelete mein daalega)
    await deleteAndSync(Sale, saleId);
    
    res.json({ success: true, message: "Sale deleted successfully!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Error deleting sale" });
  }
});



router.delete("/delete-bulk", isLoggedIn, allowRoles("admin"), async (req, res) => {
    try {
        const { ids } = req.body;
        if (!ids || ids.length === 0) {
            return res.status(400).json({ success: false, message: "Koi sale select nahi ki!" });
        }

        // Har ek sale ko loop ke zariye deleteAndSync se delete karo
        for (const id of ids) {
            const sale = await Sale.findById(id);
            if (sale) {
                await deleteAndSync(Sale, id);
            }
        }

        res.json({ success: true, message: `${ids.length} sales deleted successfully!` });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Error deleting sales" });
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


// Sale model mein yeh add karo (one time):
// saleID: { type: String, index: true }   ← INDEX — 4s → <50ms ho jayegi

// YA directly MongoDB shell mein:
// db.sales.createIndex({ saleID: 1 })

router.get('/refund', isLoggedIn, allowRoles("admin", "worker"), (req, res) => {
  res.render('refundSales', { role: req.user.role });
});

router.post('/refund', isLoggedIn, allowRoles("admin", "worker"), async (req, res) => {
  try {
    let { saleID, productQuantity, returnCash } = req.body;
    saleID = saleID ? saleID.trim() : "";
    productQuantity = parseInt(productQuantity);

   if (!saleID || !productQuantity || productQuantity <= 0) {
  return res.status(200).json({ success: false, message: "❌ Invalid Input. Sale ID and Quantity are required." });
}

    const sale = await Sale.findOne({ saleID }).lean();
   if (!sale) {
  return res.status(200).json({ success: false, message: "❌ Sale record not found." });
}

    // ✅ Product fetch karo — stockID se, lekin ab fields bhi check karo
    const product = await Product.findOne({ stockID: sale.stockID }).lean();
    // product empty aa raha tha — isliye sale se hi fields lete hain as fallback

    const maxRefundable = sale.quantitySold - (sale.refundQuantity || 0);
   if (productQuantity > maxRefundable) {
  return res.status(200).json({
    success: false,
    message: `❌ Refund quantity exceeds remaining sold quantity. Max allowed: ${maxRefundable}`
  });
}

    const refundQty = productQuantity;
    const productRate = sale.productRate || (product ? product.rate : 0) || 0;
    const originalRefundStockValue  = refundQty * productRate;
    const originalRefundProfitValue = parseFloat(((sale.rate - productRate) * refundQty).toFixed(2));
    const originalRefundAmountValue = refundQty * sale.rate;

    let finalRefundAmount = originalRefundAmountValue;
    let finalRefundStock  = originalRefundStockValue;
    let finalRefundProfit = originalRefundProfitValue;

    await Promise.all([
      Sale.findByIdAndUpdate(sale._id, {
        $inc: { refundQuantity: refundQty },
        $set: {
          refundStatus: (sale.refundQuantity || 0) + refundQty >= sale.quantitySold
            ? "Fully Refunded" : "Partially Refunded",
          syncedToAtlas: false
        }
      }),
      product
        ? Product.findByIdAndUpdate(product._id, {
            $inc: { remaining: refundQty },
            $set: { syncedToAtlas: false }
          })
        : Promise.resolve()
    ]);

    let isHistoryCreated = false;

    if (sale.customerItemId) {
      const customerItem = await CustomerItem.findById(sale.customerItemId);
      if (customerItem) {
        if (returnCash === true || returnCash === "true") {
          const amountToAdjust = Math.min(customerItem.paidAmount, originalRefundAmountValue);
          if (amountToAdjust > 0) {
            const ratio            = amountToAdjust / customerItem.totalProductAmount;
            const stockAdjustment  = parseFloat((ratio * customerItem.totalStockValue).toFixed(2));
            const profitAdjustment = parseFloat((ratio * customerItem.totalProfitValue).toFixed(2));

            await new CustomerPaymentHistory({
              customerId:      customerItem.customer,
              customerItemId:  customerItem._id,
              amountPaid:      -amountToAdjust,
              paidStockValue:  -stockAdjustment,
              paidProfitValue: -profitAdjustment,
              paymentDate:     new Date()
            }).save();

            finalRefundAmount = amountToAdjust;
            finalRefundStock  = stockAdjustment;
            finalRefundProfit = profitAdjustment;
            customerItem.paidAmount -= amountToAdjust;
            isHistoryCreated = true;
          } else {
            finalRefundAmount = 0; finalRefundStock = 0; finalRefundProfit = 0;
          }
        } else {
          finalRefundAmount = 0; finalRefundStock = 0; finalRefundProfit = 0;
        }

        customerItem.totalProductSold   -= refundQty;
        customerItem.totalProductAmount -= originalRefundAmountValue;
        customerItem.totalStockValue    -= originalRefundStockValue;
        customerItem.totalProfitValue   -= originalRefundProfitValue;

        if (customerItem.paidAmount         < 0) customerItem.paidAmount = 0;
        if (customerItem.totalProductAmount < 0) customerItem.totalProductAmount = 0;
        if (customerItem.totalStockValue    < 0) customerItem.totalStockValue = 0;
        if (customerItem.totalProfitValue   < 0) customerItem.totalProfitValue = 0;

        customerItem.paidStatus =
          customerItem.totalProductAmount === 0 ? "Paid"
          : customerItem.paidAmount >= customerItem.totalProductAmount ? "Paid"
          : customerItem.paidAmount > 0 ? "Partial" : "Unpaid";

        customerItem.syncedToAtlas = false;
        await customerItem.save();
      }
    }

    const shouldCreateHistory = !sale.customerItemId ||
      ((returnCash === true || returnCash === "true") && isHistoryCreated);

    const savePromises = [];

    if (shouldCreateHistory) {
      savePromises.push(new RefundSaleHistory({
        saleId: sale._id, refundQty,
        refundAmount: finalRefundAmount,
        refundStock:  finalRefundStock,
        refundProfit: finalRefundProfit
      }).save());
    }

    if (sale.agentItemId) {
      savePromises.push(
        AgentItem.findById(sale.agentItemId).then(async agentItem => {
          if (!agentItem) return;
          agentItem.totalProductSold   -= refundQty;
          agentItem.totalProductAmount -= originalRefundAmountValue;
          const newCommission = (agentItem.totalProductAmount * agentItem.percentage) / 100;
          agentItem.percentageAmount = Math.round(newCommission * 100) / 100;
          agentItem.paidStatus =
            agentItem.paidAmount >= agentItem.percentageAmount && agentItem.percentageAmount > 0 ? "Paid"
            : agentItem.paidAmount > 0 ? "Partial" : "Unpaid";
          agentItem.syncedToAtlas = false;
          await agentItem.save();
        })
      );
    }

    if (savePromises.length) await Promise.all(savePromises);

    res.json({
      success: true,
      message: "✅ Refund successful. Stock, Customer History, and Khata updated perfectly.",
      billId:  sale.billId || null,
      isPaid:  shouldCreateHistory,
      saleDetail: {
        saleID:      sale.saleID,
        productName: sale.itemName   || "",
        brand:       sale.brandName  || "",
        color:       sale.colourName || "",
        unit:        sale.qty        || "",
        soldQty:     sale.quantitySold,
        qty:         refundQty,
        rate:        sale.rate,
        total:       originalRefundAmountValue,
        cashAmount:  finalRefundAmount
      }
    });

  } catch (err) {
    console.error("❌ Refund Error:", err);
    res.status(500).json({ success: false, message: "❌ Internal Server Error" });
  }
});


/* ================================
   🟢 Sales History (GET) — Pagination Added
================================ */
router.get('/history', isLoggedIn, allowRoles("admin", "worker"), async (req, res) => {
    try {
        let { filter = 'month', agentId, from, to, ajax, page = 1, limit = 25 } = req.query;

        page  = parseInt(page);
        limit = parseInt(limit);
        const skip = (page - 1) * limit;

        const PKT_TIMEZONE = 'Asia/Karachi';
        const nowPKT = moment().tz(PKT_TIMEZONE);

        // --- 1. Filter Logic ---
        let query = {};
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

        // --- 2. DB Query with Pagination ---
        const [history, totalDocs, agents] = await Promise.all([
            PrintSale.find(query)
                .populate('agentId', 'name')
                .populate('salesItems')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            PrintSale.countDocuments(query),
            Agent.find({}, 'name phone').lean()
        ]);

        // --- 3. Revenue Calculate ---
        let totalRevenue = 0;
        history.forEach(bill => {
            bill.formattedDate = moment(bill.createdAt).tz(PKT_TIMEZONE).format('DD/MM/YYYY');
            bill.formattedTime = moment(bill.createdAt).tz(PKT_TIMEZONE).format('hh:mm A');
            if (bill.salesItems) {
                bill.salesItems.forEach(item => {
                    const actualQty = (item.quantitySold || 0) - (item.refundQuantity || 0);
                    totalRevenue += (actualQty * (item.rate || 0));
                });
            }
        });

        const totalPages = Math.ceil(totalDocs / limit);

        // --- 4. Response ---
        if (ajax === 'true') {
            return res.json({
                success: true,
                history,
                totalRevenue,
                totalDocs,
                totalPages,
                currentPage: page,
                limit
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
            totalDocs,
            totalPages,
            currentPage: page,
            limit,
            moment
        });

    } catch (err) {
        console.error("❌ History Filter Error:", err);
        if (req.query.ajax === 'true') return res.status(500).json({ success: false });
        res.status(500).send("Error loading history");
    }
});


/* ================================
   🔍 Find Bill — BILKUL ORIGINAL
================================ */
router.get('/findbill', isLoggedIn, async (req, res) => {
    try {
        const { billID } = req.query;
        const PKT_TIMEZONE = 'Asia/Karachi';

        if (!billID) {
            return res.status(400).json({ success: false, message: "Bill ID is required" });
        }

        // Naya
const searchTerm = billID.trim();
const history = await PrintSale.find({
    $or: [
        { billID:       { $regex: searchTerm, $options: "i" } },
        { customerName: { $regex: searchTerm, $options: "i" } }
    ]
})
        .populate('agentId', 'name')
        .populate('salesItems')
        .sort({ createdAt: -1 })
        .lean();

        let totalRevenue = 0;
        history.forEach(bill => {
            bill.formattedDate = moment(bill.createdAt).tz(PKT_TIMEZONE).format('DD/MM/YYYY');
            bill.formattedTime = moment(bill.createdAt).tz(PKT_TIMEZONE).format('hh:mm A');
            if (bill.salesItems) {
                bill.salesItems.forEach(item => {
                    const actualQty = (item.quantitySold || 0) - (item.refundQuantity || 0);
                    totalRevenue += (actualQty * (item.rate || 0));
                });
            }
        });

        res.json({ success: true, history, totalRevenue, count: history.length });

    } catch (err) {
        console.error("❌ Search Error:", err);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
});


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
        
        // 1. Bill ka data nikaalein taake check ho sake ke record exist karta hai ya nahi
        const bill = await PrintSale.findById(billId);
        if (!bill) {
            return res.status(404).json({ success: false, message: "Bill not found" });
        }
        
        // 2. deleteAndSync se delete karein (Yeh local se delete bhi karega aur Atlas ke liye sync track bhi banayega)
        await deleteAndSync(PrintSale, billId);

        res.json({ success: true, message: "Bill deleted successfully! 🗑️" });
    } catch (err) {
        console.error("🔴 Error deleting bill:", err);
        res.status(500).json({ success: false, message: "Error deleting bill" });
    }
});




export default router;
