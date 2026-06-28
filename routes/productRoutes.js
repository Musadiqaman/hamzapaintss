import express from 'express';
import Product from "../models/Product.js";
import PrintProduct from '../models/PrintProduct.js';
import Company from '../models/Company.js';
import CompanayItem from '../models/CompanayItem.js';
import CompanyPaymentHistory from '../models/CompanyPaymentHistory.js';
import RefundProductHistory from "../models/RefundProductHistory.js";
import ItemDefinition from "../models/ItemDefinition.js";
import { isLoggedIn } from "../middleware/isLoggedIn.js";
import { allowRoles } from "../middleware/allowRoles.js";
import moment from 'moment-timezone'; // 🟢 Library Import
import { deleteAndSync } from "../app.js";
import QRCode from 'qrcode';

const router = express.Router();

/* ================================
   🟢 1️⃣ Add Product Page (GET)
   -> Renders the Add Product form (EJS)
================================ */
// 🟢 Add Product Page (GET)
router.get("/add", isLoggedIn, allowRoles("admin", "worker"), async (req, res) => {
    const role = req.user.role;
    try {
        const definitions = await ItemDefinition.find().sort({ brandName: 1 });
        const companys    = await Company.find().lean();
        res.render("addProduct", { definitions, companys, layout: false, role });
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
router.post("/add-multiple", isLoggedIn, allowRoles("admin", "worker"), async (req, res) => {
    try {
        const { products, billID, companyId } = req.body;

        // Basic validation
        if (!products || products.length === 0 || !billID) {
            return res.status(400).json({ success: false, message: "Products aur billID zaroori hain." });
        }

        // 1. Company lookup pehle karo — taake products ke saath denormalized data save ho sake
        let finalBillType = "cash";
        let companyData   = null;

        if (companyId && companyId !== "") {
            const company = await Company.findById(companyId).lean();
            if (company) {
                finalBillType = `Obrai | ${company.name} | ${company.phone}`;
                companyData = {
                    companyId:    company._id,
                    companyName:  company.name,
                    companyPhone: company.phone
                };
            }
        }

        // 2. Products format karo aur DB mein save karo
        const formatted = products.map(p => ({
            brandName:    p.brandName,
            itemName:     p.itemName,
            colourName:   p.colourName || 'N/A',
            qty:          p.qty        || 'N/A',
            totalProduct: p.totalProduct,
            remaining:    p.totalProduct,
            rate:         p.rate,
            saleRate:     p.saleRate,
            stockID:      p.stockID,
            qrCode:       p.qrCode,

            // ✅ Odhar vs Cash pehchanne ke liye
            companyId:    companyData ? companyData.companyId    : null,
            companyName:  companyData ? companyData.companyName  : null,
            companyPhone: companyData ? companyData.companyPhone : null,

            syncedToAtlas: false
        }));

        const savedProducts = await Product.insertMany(formatted, { ordered: false });
        const productIds    = savedProducts.map(p => p._id);

        // 3. PrintProduct Bill banao
        const savedBill = await PrintProduct.create({
            productsItems: productIds,
            companyId:     companyId || null,
            billID:        billID,
            billtype:      finalBillType,
            syncedToAtlas: false
        });

        // 4. Har product ka billId update karo
        await Product.updateMany(
            { _id: { $in: productIds } },
            { $set: { billId: savedBill._id, syncedToAtlas: false } }
        );

        // 5. Agar company select hua hai to CompanyItem (Khata) banao
        if (companyId && companyId !== "") {

            const totalQty    = formatted.reduce((sum, p) => sum + p.totalProduct, 0);
            const totalAmount = formatted.reduce((sum, p) => sum + (p.totalProduct * p.rate), 0);

            const newCompanyItem = await CompanayItem.create({
                company:            companyId,
                billId:             savedBill._id,
                totalProductBuy:    totalQty,
                totalProductAmount: parseFloat(totalAmount.toFixed(2)),
                paidStatus:         "Unpaid",
                paidAmount:         0,
                syncedToAtlas:      false
            });

            await Company.findByIdAndUpdate(companyId, {
                $push: { items: newCompanyItem._id },
                $set:  { syncedToAtlas: false }
            });

            await Product.updateMany(
                { _id: { $in: productIds } },
                { $set: { companyItemId: newCompanyItem._id, syncedToAtlas: false } }
            );
        }

        res.json({
            success:  true,
            message:  "Products with QR codes saved!",
            billId:   savedBill._id,
            billtype: finalBillType
        });

    } catch (err) {
        console.error("❌ Add Multiple Products Error:", err);
        res.status(500).json({ success: false, message: err.message });
    }
});


/* ================================
   🟢 3️⃣ All Products Page (GET)
   -> Shows all products with stats
================================ */
// 🟢 3️⃣ All Products Page (GET) — with filters

const PKT_TIMEZONE = "Asia/Karachi";

function escapeRegExp(string) {
    if (!string) return "";
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

router.get("/all", isLoggedIn, allowRoles("admin", "worker"), async (req, res) => {
    const role = req.user.role;

    try {
        let { filter, from, to, brand, itemName, colourName, unit, stockStatus, refund } = req.query;

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const skip = (page - 1) * limit;

        const definitions = await ItemDefinition.find({}).lean();

        if (!filter) filter = "month";

        let start, end;
        let dateOperator = '$lte';
        const nowPKT = moment().tz(PKT_TIMEZONE);

        if (filter === "today") {
            start = nowPKT.clone().startOf('day').toDate();
            end = nowPKT.clone().endOf('day').toDate();
        } else if (filter === "yesterday") {
            const yesterday = nowPKT.clone().subtract(1, 'days');
            start = yesterday.startOf('day').toDate();
            end = yesterday.endOf('day').toDate();
        } else if (filter === "month") {
            start = nowPKT.clone().startOf('month').toDate();
            end = nowPKT.clone().endOf('day').toDate();
        } else if (filter === "lastMonth") {
            const lastMonth = nowPKT.clone().subtract(1, 'months');
            start = lastMonth.startOf('month').toDate();
            end = lastMonth.endOf('month').toDate();
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

        // ✅ Simple query - no $or
        let mainQuery = {};
        if (start && end) {
            mainQuery = { createdAt: { $gte: start, [dateOperator]: end } };
        }

        let finalCriteria = { $and: [mainQuery] };

        if (brand && brand !== "all") finalCriteria.$and.push({ brandName: new RegExp(`^${escapeRegExp(brand)}$`, "i") });
        if (itemName && itemName !== "all") finalCriteria.$and.push({ itemName: new RegExp(`^${escapeRegExp(itemName)}$`, "i") });
        if (colourName && colourName !== "all") finalCriteria.$and.push({ colourName: new RegExp(`^${escapeRegExp(colourName)}$`, "i") });
        if (unit && unit !== "all") finalCriteria.$and.push({ qty: new RegExp(escapeRegExp(unit), "i") });

        if (stockStatus === "out") {
            finalCriteria.$and.push({
                remaining: { $eq: 0 },
                stockStatus: { $ne: "Archived" },
                refundStatus: { $ne: "Fully Refunded" }
            });
        } else if (stockStatus === "in") {
            finalCriteria.$and.push({ remaining: { $gt: 0 } });
        } else if (stockStatus === "archived") {
            finalCriteria.$and.push({ stockStatus: "Archived" });
        }

        if (refund && refund !== "all") {
            const rCond = refund === "both" ? { $in: ["Partially Refunded", "Fully Refunded"] } : refund;
            finalCriteria.$and.push({ refundStatus: rCond });
        }

        // ✅ Refund aggregate - memory mein load nahi hoga
        const [statsResult, totalCount, refundAgg, products] = await Promise.all([
            Product.aggregate([
                { $match: finalCriteria },
                {
                    $group: {
                        _id: null,
                        totalStock: { $sum: "$totalProduct" },
                        totalValue: { $sum: { $multiply: ["$totalProduct", "$rate"] } },
                        totalRemaining: { $sum: "$remaining" },
                        remainingValue: { $sum: { $multiply: ["$remaining", "$rate"] } }
                    }
                }
            ]),
            Product.countDocuments(finalCriteria),
            RefundProductHistory.aggregate([
                { $match: start && end ? { createdAt: { $gte: start, [dateOperator]: end } } : {} },
                { $group: { _id: null, total: { $sum: "$refundAmount" } } }
            ]),
            Product.find(finalCriteria)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean()
        ]);

        const s = statsResult[0] || {};
        const periodRefundedValue = refundAgg[0]?.total || 0;
        const totalPages = Math.ceil(totalCount / limit);

        // ✅ Har product ke saath dateKey (YYYY-MM-DD, Asia/Karachi) bhejo
        // Yeh "View Company" link mein from/to filter ke liye use hoga
        // taake dukandar wahi date pe company ka kata dekh sake
        const productsWithDateKey = products.map(p => ({
            ...p,
            dateKey: moment(p.createdAt).tz(PKT_TIMEZONE).format('YYYY-MM-DD')
        }));

        const responseData = {
            products: productsWithDateKey,
            definitions,
            stats: {
                totalStock: s.totalStock || 0,
                totalRemaining: s.totalRemaining || 0,
                totalValue: parseFloat((s.totalValue || 0).toFixed(2)),
                remaining: parseFloat((s.remainingValue || 0).toFixed(2)),
                totalRefundedValue: parseFloat(periodRefundedValue.toFixed(2))
            },
            pagination: {
                page, limit, totalCount, totalPages,
                hasNext: page < totalPages,
                hasPrev: page > 1
            },
            filter, from, to,
            selectedBrand: brand || "all",
            selectedItem: itemName || "all",
            selectedColour: colourName || "all",
            selectedUnit: unit || "all",
            stockStatus: stockStatus || "all",
            selectedRefund: refund || "all",
            role
        };

        if (req.xhr || (req.headers.accept && req.headers.accept.indexOf('json') > -1)) {
            return res.json({ success: true, ...responseData });
        }
        res.render("allProducts", responseData);

    } catch (err) {
        console.error("❌ Error:", err);
        res.status(500).json({ success: false, message: "Server Error" });
    }
});



// --- 🔴 2. BULK ARCHIVE API ---
router.post("/archive-bulk", isLoggedIn, allowRoles("admin","worker"), async (req, res) => {
    try {
        const { ids } = req.body;
        if (!ids || ids.length === 0) return res.json({ success: false, message: "No items selected" });

        await Product.updateMany(
            { _id: { $in: ids } },
            { $set: { stockStatus: 'Archived',syncedToAtlas: false } }
        );
        res.json({ success: true, message: "Selected products archived" });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});


/* ================================
   🟢  Delete Product (DELETE)
================================ */


router.delete("/delete-product/:id", isLoggedIn, allowRoles("admin"), async (req, res) => {
  try {
    const productId = req.params.id;
    
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    await deleteAndSync(Product, productId);
    
    res.json({ success: true, message: "Product deleted successfully!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Error deleting Product" });
  }
});


router.delete("/delete-bulk", isLoggedIn, allowRoles("admin"), async (req, res) => {
    try {
        const { ids } = req.body;
        if (!ids || ids.length === 0) {
            return res.status(400).json({ success: false, message: "Koi product select nahi kiya!" });
        }

        // Har ek ko deleteAndSync se delete karo
        for (const id of ids) {
            const product = await Product.findById(id);
            if (product) {
                await deleteAndSync(Product, id);
            }
        }

        res.json({ success: true, message: `${ids.length} products deleted successfully!` });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Error deleting products" });
    }
});


// ================================
// Product Edit Route (POST)
// Sirf totalProduct, remaining, rate, saleRate update hoga
// Yeh route products router mein add karo
// ================================

router.post("/edit/:id", isLoggedIn, allowRoles("admin"), async (req, res) => {
    try {
        const { totalProduct, remaining, rate, saleRate } = req.body;

        // Basic validation
        if (
            isNaN(Number(totalProduct)) ||
            isNaN(Number(remaining))    ||
            isNaN(Number(rate))         ||
            isNaN(Number(saleRate))
        ) {
            return res.status(400).json({ success: false, message: "Invalid values provided." });
        }

        if (Number(remaining) > Number(totalProduct)) {
            return res.status(400).json({ success: false, message: "Remaining qty cannot exceed Total qty." });
        }

        const updated = await Product.findByIdAndUpdate(
            req.params.id,
            {
                $set: {
                    totalProduct:  Number(totalProduct),
                    remaining:     Number(remaining),
                    rate:          Number(rate),
                    saleRate:      Number(saleRate),
                    syncedToAtlas: false
                }
            },
            { new: true }
        );

        if (!updated) {
            return res.status(404).json({ success: false, message: "Product not found." });
        }

        res.json({ success: true, message: "Product updated successfully!", product: updated });

    } catch (err) {
        console.error("❌ Edit Product Error:", err);
        res.status(500).json({ success: false, message: "Server error." });
    }
});



router.get('/print', isLoggedIn, allowRoles("admin", "worker"), (req, res) => {
  let currentDate;
  
  // Timezone Logic (Same as before)
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

  // ✅ AB DATA NAHI BHEJNA: products array ko nikal diya
  // Kyunke data ab browser ki memory (LocalStorage) se aayega
  res.render('printProducts', { currentDate }); 
});



router.get('/refund', isLoggedIn, allowRoles("admin", "worker"), (req, res) => {
    const role = req.user.role;
    res.render('refundProducts', { role });
});

router.post('/refund', isLoggedIn, allowRoles("admin", "worker"), async (req, res) => {
    try {
        let { stockID, refundQuantity } = req.body;
        // returnCash completely hata diya — system khud calculate karega

        stockID = stockID ? stockID.trim() : "";
        const qty = parseInt(refundQuantity);

        if (!stockID || isNaN(qty) || qty <= 0) {
            return res.status(200).json({ success: false, message: "Invalid Input. Stock ID and Quantity are required." });
        }

        const product = await Product.findOne({ stockID });
        if (!product) {
            return res.status(200).json({ success: false, message: "Product not found." });
        }

        if (qty > product.remaining) {
            return res.status(200).json({
                success: false,
                message: "Short Stock! Available: " + product.remaining
            });
        }

        const productRate      = product.rate || 0;
        const refundAmountFull = qty * productRate;

        let finalRefundAmount   = 0;
        let shouldCreateHistory = false;
        let overpaidAmount      = 0;
        let refundType          = "";

        // =============================================
        // CASE 1: Company se Obrai liya hua product
        // =============================================
        if (product.companyItemId) {
            const companyItem = await CompanayItem.findById(product.companyItemId);

            if (companyItem) {
                const oldPaidAmount    = companyItem.paidAmount || 0;
                const oldTotalAmount   = companyItem.totalProductAmount || 0;

                // Pehle outstanding kam karo
                const newTotalAmount = Math.max(0, oldTotalAmount - refundAmountFull);

                // KEY LOGIC: outstanding kam hone ke baad overpaid check karo
                overpaidAmount = parseFloat((oldPaidAmount - newTotalAmount).toFixed(2));

                if (overpaidAmount > 0) {
                    // Company ko paid kia tha aur ab overpaid ho gaya — wapas lo ya adjust karo
                    refundType          = "obrai_return_cash";
                    finalRefundAmount   = overpaidAmount;
                    shouldCreateHistory = true;

                    // Negative history — sirf overpaid amount ki
                    await new CompanyPaymentHistory({
                        companyId:     companyItem.company,
                        companyItemId: companyItem._id,
                        amountPaid:    -overpaidAmount,
                        paymentDate:   new Date()
                    }).save();

                    companyItem.paidAmount = Math.max(0, oldPaidAmount - overpaidAmount);

                } else {
                    // Kuch paid nahi tha ya outstanding se kam paid tha — sirf khata kam
                    refundType          = "obrai_no_return";
                    finalRefundAmount   = 0;
                    shouldCreateHistory = false;
                }

                // Outstanding update karo
                companyItem.totalProductBuy    = Math.max(0, (companyItem.totalProductBuy || 0) - qty);
                companyItem.totalProductAmount = newTotalAmount;
                if (companyItem.totalProductAmount < 0) companyItem.totalProductAmount = 0;

                // PaidStatus recalculate
                companyItem.paidStatus =
                    companyItem.totalProductAmount === 0 ? "Paid"
                    : companyItem.paidAmount >= companyItem.totalProductAmount ? "Paid"
                    : companyItem.paidAmount > 0 ? "Partial" : "Unpaid";

                companyItem.syncedToAtlas = false;
                await companyItem.save();
            }

        } else {
            // =============================================
            // CASE 2: Cash par khareeda hua product
            // Hamesha pura cash wapas
            // =============================================
            refundType          = "cash_purchase";
            finalRefundAmount   = refundAmountFull;
            shouldCreateHistory = true;
        }

        // Product update — hamesha
        product.remaining      -= qty;
        product.refundQuantity  = (product.refundQuantity || 0) + qty;
        product.refundStatus    = product.refundQuantity >= product.totalProduct
            ? "Fully Refunded"
            : "Partially Refunded";
        product.syncedToAtlas   = false;
        await product.save();

        // RefundProductHistory — sirf jab cash exchange hua
        if (shouldCreateHistory) {
            await new RefundProductHistory({
                productId:    product._id,
                refundQty:    qty,
                refundAmount: finalRefundAmount
            }).save();
        }

        // User message — clear aur readable
        let userMessage = "";
        if (refundType === "cash_purchase") {
            userMessage = "Cash refund complete. Company se Rs. " + finalRefundAmount.toFixed(2) + " wapas lo.";
        } else if (refundType === "obrai_return_cash") {
            userMessage = "Obrai kam hua. Company ko zyada paid tha — Rs. " + overpaidAmount.toFixed(2) + " company se wapas lo ya doosri cheez le lo.";
        } else {
            userMessage = "Company ka obrai Rs. " + refundAmountFull.toFixed(2) + " kam hua. Company ko kuch wapas nahi karna.";
        }

        res.json({
            success:      true,
            message:      userMessage,
            refundType,
            overpaidAmount,
            billId:       product.billId || null,
            isPaid:       shouldCreateHistory,
            refundDetail: {
                stockID:    product.stockID,
                brandName:  product.brandName,
                itemName:   product.itemName,
                colourName: product.colourName,
                unit:       product.qty,
                totalQty:   product.totalProduct,
                remaining:  product.remaining,
                refundQty:  qty,
                rate:       productRate,
                cashAmount: finalRefundAmount
            }
        });

    } catch (err) {
        console.error("Company Refund Error:", err);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
});




/* ================================
   🟢 Products History (GET) — Pagination Added
================================ */
router.get('/history', isLoggedIn, allowRoles("admin", "worker"), async (req, res) => {
    try {
        let { filter = 'month', from, to, ajax, page = 1, limit = 25 } = req.query;

        page  = parseInt(page);
        limit = parseInt(limit);
        const skip = (page - 1) * limit;

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
        // filter === 'all' -> query khali rahegi

        // --- 2. DB Query with Pagination ---
        const [history, totalDocs] = await Promise.all([
            PrintProduct.find(query)
                .populate('companyId', 'name phone')
                .populate({ path: 'productsItems', select: 'totalProduct refundQuantity rate' })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            PrintProduct.countDocuments(query)
        ]);

        // --- 3. Total Value Calculate ---
        let totalValue = 0;
        history.forEach(bill => {
            bill.formattedDate = moment(bill.createdAt).tz(PKT_TIMEZONE).format('DD/MM/YYYY');
            bill.formattedTime = moment(bill.createdAt).tz(PKT_TIMEZONE).format('hh:mm A');
            if (bill.productsItems) {
                bill.productsItems.forEach(item => {
                    const actualQty = (item.totalProduct || 0) - (item.refundQuantity || 0);
                    totalValue += (actualQty * (item.rate || 0));
                });
            }
        });

        const totalPages = Math.ceil(totalDocs / limit);

        // --- 4. Response ---
        if (ajax === 'true') {
            return res.json({ success: true, history, totalValue, totalDocs, totalPages, currentPage: page, limit });
        }

        res.render('productsHistory', {
            history, role: req.user.role, filter, from, to,
            totalValue, totalDocs, totalPages, currentPage: page, limit, moment
        });

    } catch (err) {
        console.error("❌ Products History Filter Error:", err);
        if (req.query.ajax === 'true') return res.status(500).json({ success: false });
        res.status(500).send("Error loading history");
    }
});


/* ================================
   🔍 Find Product Bill
================================ */
router.get('/findbill', isLoggedIn, async (req, res) => {
    try {
        const { billID } = req.query;
        if (!billID) {
            return res.status(400).json({ success: false, message: "Bill ID is required" });
        }

        const searchTerm = billID.trim();

        const history = await PrintProduct.find({
            billID: { $regex: searchTerm, $options: "i" }
        })
            .populate('companyId', 'name phone')
            .populate({ path: 'productsItems', select: 'totalProduct refundQuantity rate' })
            .sort({ createdAt: -1 })
            .lean();

        let totalValue = 0;
        history.forEach(bill => {
            bill.formattedDate = moment(bill.createdAt).tz(PKT_TIMEZONE).format('DD/MM/YYYY');
            bill.formattedTime = moment(bill.createdAt).tz(PKT_TIMEZONE).format('hh:mm A');
            if (bill.productsItems) {
                bill.productsItems.forEach(item => {
                    const actualQty = (item.totalProduct || 0) - (item.refundQuantity || 0);
                    totalValue += (actualQty * (item.rate || 0));
                });
            }
        });

        res.json({ success: true, history, totalValue, count: history.length });

    } catch (err) {
        console.error("❌ Product Bill Search Error:", err);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
});



/* ================================
   🟢 View Bill Route
================================ */
router.get('/bill/:id', isLoggedIn, allowRoles("admin", "worker"), async (req, res) => {
    try {
        // 🟢 Optimized Population: Hum specify kar rahe hain ke SalesItems se kya kya chahiye
        const bill = await PrintProduct.findById(req.params.id)
            .populate({
                path: 'productsItems',
                select: 'stockID itemName brandName refundQuantity colourName qty totalProduct rate createdAt' 
            });

        if (!bill) return res.status(404).send("Bill not found");

        // 🟢 Total calculation (Safety check ke saath)
        const totalAmount = bill.productsItems.reduce((acc, item) => {
        const itemRate = item.rate || 0;
        // Refund ko minus kar ke asali product qty nikalna
        const actualQty = (item.totalProduct || 0) - (item.refundQuantity || 0);
        return acc + (actualQty * itemRate);
        }, 0);

        // Render with all data
        res.render('viewProductBill', { 
            bill, 
            totalAmount, 
            role: req.user.role,
            moment // Timezone fix ke liye moment pass karna zaroori hai
        });
    } catch (err) {
        console.error("❌ View Product Bill Error:", err);
        res.status(500).send("Error loading bill details");
    }
});


/* ================================
   🔴 Delete Product Bill Route
================================ */
router.delete("/delete-bill/:id", isLoggedIn, allowRoles("admin"), async (req, res) => {
    try {
        const billId = req.params.id;
        const bill = await PrintProduct.findById(billId);
        if (!bill) return res.status(404).json({ success: false, message: "Bill not found" });

        await deleteAndSync(PrintProduct, billId);
        res.json({ success: true, message: "Bill deleted successfully! 🗑️" });
    } catch (err) {
        console.error("🔴 Error deleting product bill:", err);
        res.status(500).json({ success: false, message: "Error deleting bill" });
    }
});




// Use export default to export the router in ES Modules
export default router;
