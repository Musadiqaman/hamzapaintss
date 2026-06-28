import express  from "express";
const router=express.Router();
import Customer from '../models/Customer.js';
import CustomerItem from '../models/CustomerItem.js';
import CustomerPaymentHistory from '../models/CustomerPaymentHistory.js'
import { isLoggedIn } from "../middleware/isLoggedIn.js";
import { allowRoles } from "../middleware/allowRoles.js";
import moment from 'moment-timezone';
import { deleteAndSync } from "../app.js";


router.get('/add',isLoggedIn,allowRoles("admin","worker"),(req,res)=>{
const role=req.user.role; 
res.render('addCustomer',{role});
});


router.post("/add",isLoggedIn,allowRoles("admin", "worker"), async (req, res) => {
  try {
    const { name, phone, cnic } = req.body;

    if (!name || !phone) {
      return res.json({ success: false, message: "Name and Phone are required." });
    }

    // Check if phone already exists
    const exists = await Customer.findOne({ phone });
    if (exists) {
      return res.json({ success: false, message: "Customer already registered with this phone number." });
    }

    // Generate Customer ID
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const customerID = "CT" + randomNum;

    // Create customer
    const newCustomer = await Customer.create({
      customerID,
      name,
      phone,
      cnic
    });

    res.json({
      success: true,
      message: "Customer created successfully",
      customer: newCustomer
    });

  } catch (err) {
    console.log("Error:", err);
    res.json({ success: false, message: "Server error occurred." });
  }
});


const PKT_TIMEZONE = "Asia/Karachi";

router.get("/all", isLoggedIn, allowRoles("admin", "worker"), async (req, res) => {
    const role = req.user.role; 
    try {
        let { filter = 'month', from, to, search } = req.query;

        const page  = parseInt(req.query.page)  || 1;
        const limit = parseInt(req.query.limit) || 25;
        const skip  = (page - 1) * limit;

        const nowPKT = moment.tz(PKT_TIMEZONE);
        let start, end;

        if (filter === "today") {
            start = nowPKT.clone().startOf('day').toDate();
            end   = nowPKT.clone().endOf('day').toDate();
        } else if (filter === "yesterday") {
            start = nowPKT.clone().subtract(1, 'days').startOf('day').toDate();
            end   = nowPKT.clone().subtract(1, 'days').endOf('day').toDate();
        } else if (filter === "month") {
            start = nowPKT.clone().startOf('month').toDate();
            end   = nowPKT.clone().endOf('day').toDate();
        } else if (filter === "lastMonth") {
            start = nowPKT.clone().subtract(1, 'months').startOf('month').toDate();
            end   = nowPKT.clone().subtract(1, 'months').endOf('month').toDate();
        } else if (filter === "custom" && from) {
            start = moment.tz(from, 'YYYY-MM-DD', PKT_TIMEZONE).startOf('day').toDate();
            end   = to
                ? moment.tz(to, 'YYYY-MM-DD', PKT_TIMEZONE).endOf('day').toDate()
                : moment.tz(from, 'YYYY-MM-DD', PKT_TIMEZONE).endOf('day').toDate();
        } else if (filter === "all") {
            start = new Date(0);
            end   = nowPKT.clone().add(100, 'years').toDate();
        }

        // Search query build
        let customerQuery = {};
        if (search && search.trim() !== "") {
            const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            customerQuery = {
                $or: [
                    { name:  new RegExp(escaped, 'i') },
                    { phone: new RegExp(escaped, 'i') }
                ]
            };
        }

        // 1. Total filtered count for pagination
        const totalCount = await Customer.countDocuments(customerQuery);

        // 2. Fetch paginated customers
        const customers = await Customer.find(customerQuery)
            .populate("items")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        // 3. Optimize Stats calculation using Aggregation (Memory safe)
        const paymentStats = await CustomerPaymentHistory.aggregate([
            {
                $group: {
                    _id: "$customerId",
                    totalPaid: { $sum: { $toDouble: "$amountPaid" } }
                }
            }
        ]);

        const paymentMap = {};
        paymentStats.forEach(p => {
            if (p._id) paymentMap[p._id.toString()] = p.totalPaid;
        });

        // Current page customers statistics logic
        const customersWithStats = customers.map(customer => {
            const lifeTimeOut  = (customer.items || []).reduce((sum, i) => sum + Number(i.totalProductAmount || 0), 0);
            const lifeTimePaid = paymentMap[customer._id.toString()] || 0;
            return { ...customer, calculatedLeft: lifeTimeOut - lifeTimePaid };
        });

        // Global stats calculation safely
        let filteredTotal = 0;
        let filteredPaid  = 0;
        let grandTotalLeft = 0;

        const allCustomersForStats = await Customer.find().populate("items").lean();
        const allPaymentsForStats = await CustomerPaymentHistory.find().lean();

        allCustomersForStats.forEach(customer => {
            const lifeTimeOut  = (customer.items || []).reduce((sum, i) => sum + Number(i.totalProductAmount || 0), 0);
            const lifeTimePaid = allPaymentsForStats
                .filter(p => p.customerId?.toString() === customer._id.toString())
                .reduce((sum, p) => sum + Number(p.amountPaid || 0), 0);
            
            grandTotalLeft += (lifeTimeOut - lifeTimePaid);

            if (filter === 'all' || !start) {
                filteredTotal += lifeTimeOut;
                filteredPaid  += lifeTimePaid;
            } else {
                const fItems = (customer.items || []).filter(i =>
                    new Date(i.createdAt) >= start && new Date(i.createdAt) <= end
                );
                filteredTotal += fItems.reduce((sum, i) => sum + Number(i.totalProductAmount || 0), 0);

                const fPayments = allPaymentsForStats.filter(p =>
                    p.customerId?.toString() === customer._id.toString() &&
                    new Date(p.createdAt) >= start && new Date(p.createdAt) <= end
                );
                filteredPaid += fPayments.reduce((sum, p) => sum + Number(p.amountPaid || 0), 0);
            }
        });

        const totalPages = Math.ceil(totalCount / limit);

        const responseData = {
            role,
            customers: customersWithStats,
            filter, from, to, search: search || "",
            stats: {
                totalCustomers:              totalCount,
                totalOutstandingAmount:      filteredTotal,
                totalOutstandingAmountGiven: filteredPaid,
                totalOutstandingAmountLeft:  grandTotalLeft
            },
            pagination: {
                page, limit, totalCount, totalPages,
                hasNext: page < totalPages,
                hasPrev: page > 1
            }
        };

        // AJAX/JSON Request response handler
        if (req.xhr || (req.headers.accept && req.headers.accept.indexOf('json') > -1)) {
            return res.json({ success: true, ...responseData });
        }
        res.render("allCustomers", responseData);

    } catch (err) {
        console.error("❌ All Customers Route Error:", err);
        res.status(500).send("Server Error");
    }
});




// --- GET CUSTOMERS WITH SEARCH & FILTERS ---
router.get("/find", isLoggedIn, allowRoles("admin", "worker"), async (req, res) => {
    const role = req.user.role;
    try {
        let { filter = 'all', from, to, search } = req.query;
        const nowPKT = moment.tz(PKT_TIMEZONE);
        let start, end;

        // 1. Date Filter Logic
        if (filter === "today") {
            start = nowPKT.clone().startOf('day').toDate();
            end = nowPKT.clone().endOf('day').toDate();
        } else if (filter === "yesterday") {
            start = nowPKT.clone().subtract(1, 'days').startOf('day').toDate();
            end = nowPKT.clone().subtract(1, 'days').endOf('day').toDate();
        } else if (filter === "month") {
            start = nowPKT.clone().startOf('month').toDate();
            end = nowPKT.clone().endOf('day').toDate();
        } else if (filter === "lastMonth") {
            start = nowPKT.clone().subtract(1, 'months').startOf('month').toDate();
            end = nowPKT.clone().subtract(1, 'months').endOf('month').toDate();
        } else if (filter === "custom" && from) {
            start = moment.tz(from, PKT_TIMEZONE).startOf('day').toDate();
            end = to ? moment.tz(to, PKT_TIMEZONE).endOf('day').toDate() : moment.tz(from, PKT_TIMEZONE).endOf('day').toDate();
        }

        // 2. Search Query Building
        let query = {};
        if (search && search.trim() !== "") {
            query.$or = [
                { name: { $regex: search, $options: "i" } },
                { customerID: { $regex: search, $options: "i" } },
                { phone: { $regex: search, $options: "i" } }
            ];
        }

        // 3. Fetch Data
        const customers = await Customer.find(query).populate("items").sort({ createdAt: -1 }).lean();
        const allPayments = await CustomerPaymentHistory.find().lean();

        let filteredTotal = 0;
        let filteredPaid = 0;
        let grandTotalLeft = 0;

        // 4. Processing Stats & Calculations
        const customersWithStats = customers.map(customer => {
            // Lifetime Calculation (For individual row balance)
            const lifeTimeOut = (customer.items || []).reduce((sum, i) => sum + Number(i.totalProductAmount || 0), 0);
            const lifeTimePaid = allPayments
                .filter(p => p.customerId?.toString() === customer._id.toString())
                .reduce((sum, p) => sum + Number(p.amountPaid || 0), 0);
            
            const customerLeft = lifeTimeOut - lifeTimePaid;
            grandTotalLeft += customerLeft;

            // Filtered Calculation for Stats Boxes
            if (start && end) {
                // Filtered Outstanding (Bills created in this range)
                const fItems = (customer.items || []).filter(i => i.createdAt >= start && i.createdAt <= end);
                filteredTotal += fItems.reduce((sum, i) => sum + Number(i.totalProductAmount || 0), 0);

                // Filtered Paid (Payments made in this range)
                const fHistory = allPayments.filter(p => 
                    p.customerId?.toString() === customer._id.toString() && 
                    p.createdAt >= start && p.createdAt <= end
                );
                filteredPaid += fHistory.reduce((sum, p) => sum + Number(p.amountPaid || 0), 0);
            }

            return { ...customer, calculatedLeft: customerLeft };
        });

        // Agar 'all' filter ho ya date range na ho toh full totals dikhayen
        if (filter === 'all' || !start) {
            filteredTotal = customers.reduce((acc, c) => acc + (c.items || []).reduce((s, i) => s + Number(i.totalProductAmount || 0), 0), 0);
            filteredPaid = allPayments.reduce((acc, p) => acc + Number(p.amountPaid || 0), 0);
        }

        const stats = {
            totalCustomers: customersWithStats.length,
            totalOutstandingAmount: filteredTotal,
            totalOutstandingAmountGiven: filteredPaid,
            totalOutstandingAmountLeft: grandTotalLeft
        };

        const responseData = { role, customers: customersWithStats, filter, from, to, stats };

        // Support for AJAX and Direct Page Load
        if (req.xhr || (req.headers.accept && req.headers.accept.indexOf('json') > -1)) {
            return res.json({ success: true, ...responseData });
        }
        res.render("allCustomers", responseData);

    } catch (err) {
        console.error("❌ Find API Error:", err);
        res.status(500).json({ success: false, message: "Server error occurred while searching." });
    }
});


router.delete("/delete-customer/:id", isLoggedIn, allowRoles("admin"), async (req, res) => {
  try {
    const customerId = req.params.id;

    // 1. Pehle check karein ke customer database mein exist karta hai ya nahi
    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res.status(404).json({ success: false, message: "Customer not found" });
    }

    // 2. deleteAndSync helper ka use karo (Local se delete + Cloud sync logging)
    await deleteAndSync(Customer, customerId);

    res.json({ success: true, message: "Customer deleted successfully! 🗑️" });
  } catch (err) {
    console.error("🔴 Error deleting customer:", err);
    res.status(500).json({ success: false, message: "Error deleting customer" });
  }
});


router.get('/view/:id', isLoggedIn, allowRoles("admin", "worker"), async (req, res) => {
    const role = req.user.role;
    try {
        let { filter = "month", from, to } = req.query;

        const nowPKT = moment.tz(PKT_TIMEZONE);
        let start, end;

        // --- Date Logic ---
        if (filter === "today") {
            start = nowPKT.clone().startOf('day').toDate();
            end = nowPKT.clone().endOf('day').toDate();
        } else if (filter === "yesterday") {
            start = nowPKT.clone().subtract(1, 'days').startOf('day').toDate();
            end = nowPKT.clone().subtract(1, 'days').endOf('day').toDate();
        } else if (filter === "month") {
            start = nowPKT.clone().startOf('month').toDate();
            end = nowPKT.clone().endOf('day').toDate();
        } else if (filter === "lastMonth") {
            start = nowPKT.clone().subtract(1, 'months').startOf('month').toDate();
            end = nowPKT.clone().subtract(1, 'months').endOf('month').toDate();
        } else if (filter === "custom" && from) {
            start = moment.tz(from, PKT_TIMEZONE).startOf('day').toDate();
            end = to ? moment.tz(to, PKT_TIMEZONE).endOf('day').toDate() : moment.tz(from, PKT_TIMEZONE).endOf('day').toDate();
        }

        // 2. Fetch Customer & ALL Items (Table ke liye)
        const customer = await Customer.findById(req.params.id).populate({
            path: "items",
            options: { sort: { createdAt: -1 } },
            populate: { path: "billId", select: "customerName createdAt" }
        }).lean();

        if (!customer) return res.status(404).send("Customer not found");

        // 3. Fetch Payment History (Filtered for Stats)
        let historyQuery = { customerId: customer._id };
        if (filter !== 'all' && start && end) {
            historyQuery.createdAt = { $gte: start, $lte: end };
        }
        const paymentsInPeriod = await CustomerPaymentHistory.find(historyQuery).lean();

        // 4. Stats Calculation
        let totalOutInPeriod = 0;
        let totalPaidInPeriod = paymentsInPeriod.reduce((sum, p) => sum + Number(p.amountPaid || 0), 0);
        let lifetimeLeft = 0;

        // Loop through all items once for both stats
        (customer.items || []).forEach(item => {
            const itemDate = new Date(item.createdAt);
            const amt = Number(item.totalProductAmount || 0);
            const paid = Number(item.paidAmount || 0);

            // Period Total (Filter ke mutabiq)
            if (filter === 'all' || (!start || (itemDate >= start && itemDate <= end))) {
                totalOutInPeriod += amt;
            }

            // Lifetime Remaining (Hamesha Total)
            lifetimeLeft += (amt - paid);
        });

        const stats = {
            totalOutstandingAmount: totalOutInPeriod, 
            totalOutstandingAmountGiven: totalPaidInPeriod,   
            totalOutstandingAmountLeft: lifetimeLeft         
        };

        const responseData = { role, customer, stats, filter, from, to };

        if (req.xhr || (req.headers.accept && req.headers.accept.indexOf('json') > -1)) {
            return res.json({ success: true, ...responseData });
        }

        res.render("viewCustomer", responseData);

    } catch (err) {
        console.error("❌ Customer View Error:", err);
        res.status(500).send("Error loading customer page");
    }
});



//  UPDATE CUSTOMER PROFILE (Name & Phone)
router.post('/update/:id', isLoggedIn, allowRoles("admin"), async (req, res) => {
    try {
        const { name, phone } = req.body;
        const customer = await Customer.findByIdAndUpdate(
            req.params.id, 
            { $set: { name, phone, syncedToAtlas: false } }, // ✅ bas yahi badla 
            { new: true }
        );

        if (!customer) {
            return res.status(404).json({ success: false, message: "Customer not found" });
        }

        res.json({ success: true, message: "Profile updated successfully", customer });
    } catch (err) {
        console.error("❌ Update Error:", err);
        res.status(500).json({ success: false, message: "Server error" });
    }
});



//  GET PAYMENT HISTORY (For Modal)
router.get('/payment-history/:id', isLoggedIn, allowRoles("admin", "worker"), async (req, res) => {
    try {
        // Customer ki saari payment history fetch karein, latest upar
        const history = await CustomerPaymentHistory.find({ customerId: req.params.id })
            .sort({ createdAt: -1 })
            .lean();

        res.json({ success: true, history });
    } catch (err) {
        console.error("❌ History Error:", err);
        res.status(500).json({ success: false, message: "Error fetching history" });
    }
});




router.post("/pay-item/:id", isLoggedIn, allowRoles("admin", "worker"), async (req, res) => {
  try {
    const item = await CustomerItem.findById(req.params.id);
    if (!item) return res.json({ success: false, message: "❌ Record not found" });

    const amount = Number(req.body.amount);
    if (isNaN(amount) || amount <= 0) return res.json({ success: false, message: "❌ Invalid amount" });

    const remainingToPay = item.totalProductAmount - item.paidAmount;
    if (amount > remainingToPay) {
      return res.json({ success: false, message: `❌ Over payment not allowed. Max: ${remainingToPay}` });
    }

    // --- 🟢 RATIO CALCULATION ---
    const totalBill = item.totalProductAmount;
    const paymentRatio = amount / totalBill;

    const paidStock = parseFloat((paymentRatio * item.totalStockValue).toFixed(2));
    const paidProfit = parseFloat((paymentRatio * item.totalProfitValue).toFixed(2));

    // --- 🟢 Save History (Dono dynamic aur original keys bharenge) ---
    const paymentRecord = new CustomerPaymentHistory({
      customerId: item.customer,      
      customerItemId: item._id,       
      paymentDate: new Date(),

      // Dynamic Keys
      amountPaid: amount,            
      paidStockValue: paidStock,      
      paidProfitValue: paidProfit,    

      // ✅ Original Keys (Real cash entry save ho gayi)
      originalAmountPaid: amount,
      originalPaidStockValue: paidStock,
      originalPaidProfitValue: paidProfit
    });
    await paymentRecord.save();

    item.paidAmount += amount;
    if (item.paidAmount >= item.totalProductAmount) {
      item.paidStatus = "Paid";
    } else if (item.paidAmount > 0) {
      item.paidStatus = "Partial";
    } else {
      item.paidStatus = "Unpaid";
    }
    item.syncedToAtlas = false; // ✅ yeh add karo
    await item.save();

    res.json({ success: true, message: "✅ Payment processed successfully!" });

  } catch (err) {
    console.error("❌ Pay Item Error:", err);
    res.status(500).json({ success: false, message: "❌ Server error." });
  }
});




router.delete("/delete-item/:id", isLoggedIn, allowRoles("admin"), async (req, res) => {
  try {
    const itemId = req.params.id;

    // 1. Pehle check karein ke item exist karta hai ya nahi
    const item = await CustomerItem.findById(itemId);
    if (!item) {
      return res.status(404).json({ success: false, message: "Item not found" });
    }

    // 2. Main Customer Item ko deleteAndSync se delete karein (Local delete + Sync track)
    await deleteAndSync(CustomerItem, itemId);

    // 3. 🟢 History Cleanup: Is item se judi saari customer payments dhoondhein
    const associatedPayments = await CustomerPaymentHistory.find({ customerItemId: itemId });
    
    // Har payment record par loop chala kar deleteAndSync se delete karein taake cloud sync barqarar rahe
    for (const payment of associatedPayments) {
      await deleteAndSync(CustomerPaymentHistory, payment._id);
    }

    res.json({ 
      success: true, 
      message: "Item and its payment history deleted successfully! 🗑️" 
    });

  } catch (err) {
    console.error("❌ Delete Error:", err);
    res.status(500).json({ success: false, message: "Error deleting Item and history" });
  }
});



// ✅ COLLECTIVE PAYMENT — Customer ke saare unpaid bills mein ek saath payment distribute karo
router.post("/collective-pay/:customerId", isLoggedIn, allowRoles("admin", "worker"), async (req, res) => {
  try {
    const { customerId } = req.params;
    const totalAmount = parseFloat(req.body.amount);

    if (!totalAmount || totalAmount <= 0) {
      return res.json({ success: false, message: "❌ Valid amount darj karo." });
    }

    // ✅ Saare unpaid/partial items fetch karo — purane pehle
    const items = await CustomerItem.find({
      customer: customerId,
      paidStatus: { $in: ["Unpaid", "Partial"] }
    }).sort({ createdAt: 1 }); // Purane bills pehle settle honge

    if (!items || items.length === 0) {
      return res.json({ success: false, message: "❌ Koi outstanding bill nahi mila." });
    }

    // ✅ Total remaining calculate karo
    const totalRemaining = items.reduce((sum, i) => {
      return sum + (Number(i.totalProductAmount) - Number(i.paidAmount));
    }, 0);

    if (totalAmount > totalRemaining) {
      return res.json({
        success: false,
        message: `❌ Amount zyada hai. Maximum outstanding: Rs. ${totalRemaining.toFixed(2)}`
      });
    }

    let amountLeft   = totalAmount;
    const historyDocs = [];
    const itemUpdates = [];

    for (const item of items) {
      if (amountLeft <= 0) break;

      const remainingOnThisBill = Number(item.totalProductAmount) - Number(item.paidAmount);
      if (remainingOnThisBill <= 0) continue;

      // Is bill pe kitna lagao
      const payThisBill = Math.min(amountLeft, remainingOnThisBill);

      // Ratio se stock aur profit calculate karo
      const ratio       = payThisBill / Number(item.totalProductAmount);
      const paidStock   = parseFloat((ratio * Number(item.totalStockValue)).toFixed(2));
      const paidProfit  = parseFloat((ratio * Number(item.totalProfitValue)).toFixed(2));

      // Payment history record
      historyDocs.push({
        customerId:        item.customer,
        customerItemId:    item._id,
        amountPaid:        payThisBill,
        paidStockValue:    paidStock,
        paidProfitValue:   paidProfit,
        originalAmountPaid:        payThisBill,
        originalPaidStockValue:    paidStock,
        originalPaidProfitValue:   paidProfit,
        paymentDate:       new Date()
      });

      // Item update
      const newPaid = Number(item.paidAmount) + payThisBill;
      const newStatus =
        newPaid >= Number(item.totalProductAmount) ? "Paid"
        : newPaid > 0 ? "Partial" : "Unpaid";

      itemUpdates.push(
        CustomerItem.findByIdAndUpdate(item._id, {
          $set: {
            paidAmount:    newPaid,
            paidStatus:    newStatus,
            syncedToAtlas: false
          }
        })
      );

      amountLeft = parseFloat((amountLeft - payThisBill).toFixed(2));
    }

    // ✅ Sab ek saath save karo
    await Promise.all([
      CustomerPaymentHistory.insertMany(historyDocs),
      ...itemUpdates
    ]);

    res.json({
      success: true,
      message: `✅ Rs. ${totalAmount.toFixed(2)} successfully distribute ho gaye ${historyDocs.length} bill(s) mein.`,
      billsSettled: historyDocs.length,
      amountDistributed: totalAmount
    });

  } catch (err) {
    console.error("❌ Collective Pay Error:", err);
    res.status(500).json({ success: false, message: "❌ Server error." });
  }
});





export default router;
