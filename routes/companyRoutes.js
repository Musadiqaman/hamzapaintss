import express from "express";
const router = express.Router();
import Company from '../models/Company.js';
import CompanayItem from '../models/CompanayItem.js';
import CompanyPaymentHistory from '../models/CompanyPaymentHistory.js';
import { isLoggedIn } from "../middleware/isLoggedIn.js";
import { allowRoles } from "../middleware/allowRoles.js";
import moment from 'moment-timezone';
import { deleteAndSync } from "../app.js";

const PKT_TIMEZONE = "Asia/Karachi";


/* ================================
   🟢 1️⃣ Add Company Page (GET)
================================ */
router.get('/add', isLoggedIn, allowRoles("admin", "worker"), (req, res) => {
    const role = req.user.role;
    res.render('addCompany', { role });
});


/* ================================
   🟢 2️⃣ Add Company (POST)
================================ */
router.post("/add", isLoggedIn, allowRoles("admin", "worker"), async (req, res) => {
    try {
        const { name, phone, cnic } = req.body;

        if (!name || !phone) {
            return res.json({ success: false, message: "Name and Phone are required." });
        }

        // Check if phone already exists
        const exists = await Company.findOne({ phone });
        if (exists) {
            return res.json({ success: false, message: "Company already registered with this phone number." });
        }

        // Generate Company ID
        const randomNum = Math.floor(1000 + Math.random() * 9000);
        const companyID = "CP" + randomNum;

        const newCompany = await Company.create({
            companyID,
            name,
            phone,
            cnic
        });

        res.json({
            success: true,
            message: "Company created successfully",
            company: newCompany
        });

    } catch (err) {
        console.error("❌ Add Company Error:", err);
        res.json({ success: false, message: "Server error occurred." });
    }
});


/* ================================
   🟢 3️⃣ All Companies (GET)
================================ */
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

        // Search query
        let companyQuery = {};
        if (search && search.trim() !== "") {
            const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            companyQuery = {
                $or: [
                    { name:  new RegExp(escaped, 'i') },
                    { phone: new RegExp(escaped, 'i') }
                ]
            };
        }

        const totalCount = await Company.countDocuments(companyQuery);

        const companies = await Company.find(companyQuery)
            .populate("items")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        // Payment stats via aggregation
        const paymentStats = await CompanyPaymentHistory.aggregate([
            {
                $group: {
                    _id: "$companyId",
                    totalPaid: { $sum: { $toDouble: "$amountPaid" } }
                }
            }
        ]);

        const paymentMap = {};
        paymentStats.forEach(p => {
            if (p._id) paymentMap[p._id.toString()] = p.totalPaid;
        });

        const companiesWithStats = companies.map(company => {
            const lifeTimeOut  = (company.items || []).reduce((sum, i) => sum + Number(i.totalProductAmount || 0), 0);
            const lifeTimePaid = paymentMap[company._id.toString()] || 0;
            return { ...company, calculatedLeft: lifeTimeOut - lifeTimePaid };
        });

        // Global stats
        let filteredTotal  = 0;
        let filteredPaid   = 0;
        let grandTotalLeft = 0;

        const allCompaniesForStats  = await Company.find().populate("items").lean();
        const allPaymentsForStats   = await CompanyPaymentHistory.find().lean();

        allCompaniesForStats.forEach(company => {
            const lifeTimeOut  = (company.items || []).reduce((sum, i) => sum + Number(i.totalProductAmount || 0), 0);
            const lifeTimePaid = allPaymentsForStats
                .filter(p => p.companyId?.toString() === company._id.toString())
                .reduce((sum, p) => sum + Number(p.amountPaid || 0), 0);

            grandTotalLeft += (lifeTimeOut - lifeTimePaid);

            if (filter === 'all' || !start) {
                filteredTotal += lifeTimeOut;
                filteredPaid  += lifeTimePaid;
            } else {
                const fItems = (company.items || []).filter(i =>
                    new Date(i.createdAt) >= start && new Date(i.createdAt) <= end
                );
                filteredTotal += fItems.reduce((sum, i) => sum + Number(i.totalProductAmount || 0), 0);

                const fPayments = allPaymentsForStats.filter(p =>
                    p.companyId?.toString() === company._id.toString() &&
                    new Date(p.createdAt) >= start && new Date(p.createdAt) <= end
                );
                filteredPaid += fPayments.reduce((sum, p) => sum + Number(p.amountPaid || 0), 0);
            }
        });

        const totalPages = Math.ceil(totalCount / limit);

        const responseData = {
            role,
            companies: companiesWithStats,
            filter, from, to, search: search || "",
            stats: {
                totalCompanies:              totalCount,
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

        if (req.xhr || (req.headers.accept && req.headers.accept.indexOf('json') > -1)) {
            return res.json({ success: true, ...responseData });
        }
        res.render("allCompanys", responseData);

    } catch (err) {
        console.error("❌ All Companies Route Error:", err);
        res.status(500).send("Server Error");
    }
});


/* ================================
   🟢 4️⃣ Find Companies (GET) — Search
================================ */
router.get("/find", isLoggedIn, allowRoles("admin", "worker"), async (req, res) => {
    const role = req.user.role;
    try {
        let { filter = 'all', from, to, search } = req.query;
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
            start = moment.tz(from, PKT_TIMEZONE).startOf('day').toDate();
            end   = to
                ? moment.tz(to, PKT_TIMEZONE).endOf('day').toDate()
                : moment.tz(from, PKT_TIMEZONE).endOf('day').toDate();
        }

        let query = {};
        if (search && search.trim() !== "") {
            query.$or = [
                { name:      { $regex: search, $options: "i" } },
                { companyID: { $regex: search, $options: "i" } },
                { phone:     { $regex: search, $options: "i" } }
            ];
        }

        const companies   = await Company.find(query).populate("items").sort({ createdAt: -1 }).lean();
        const allPayments = await CompanyPaymentHistory.find().lean();

        let filteredTotal  = 0;
        let filteredPaid   = 0;
        let grandTotalLeft = 0;

        const companiesWithStats = companies.map(company => {
            const lifeTimeOut  = (company.items || []).reduce((sum, i) => sum + Number(i.totalProductAmount || 0), 0);
            const lifeTimePaid = allPayments
                .filter(p => p.companyId?.toString() === company._id.toString())
                .reduce((sum, p) => sum + Number(p.amountPaid || 0), 0);

            const companyLeft = lifeTimeOut - lifeTimePaid;
            grandTotalLeft += companyLeft;

            if (start && end) {
                const fItems = (company.items || []).filter(i =>
                    i.createdAt >= start && i.createdAt <= end
                );
                filteredTotal += fItems.reduce((sum, i) => sum + Number(i.totalProductAmount || 0), 0);

                const fHistory = allPayments.filter(p =>
                    p.companyId?.toString() === company._id.toString() &&
                    p.createdAt >= start && p.createdAt <= end
                );
                filteredPaid += fHistory.reduce((sum, p) => sum + Number(p.amountPaid || 0), 0);
            }

            return { ...company, calculatedLeft: companyLeft };
        });

        if (filter === 'all' || !start) {
            filteredTotal = companies.reduce((acc, c) =>
                acc + (c.items || []).reduce((s, i) => s + Number(i.totalProductAmount || 0), 0), 0);
            filteredPaid  = allPayments.reduce((acc, p) => acc + Number(p.amountPaid || 0), 0);
        }

        const stats = {
            totalCompanies:              companiesWithStats.length,
            totalOutstandingAmount:      filteredTotal,
            totalOutstandingAmountGiven: filteredPaid,
            totalOutstandingAmountLeft:  grandTotalLeft
        };

        const responseData = { role, companies: companiesWithStats, filter, from, to, stats };

        if (req.xhr || (req.headers.accept && req.headers.accept.indexOf('json') > -1)) {
            return res.json({ success: true, ...responseData });
        }
        res.render("allCompanies", responseData);

    } catch (err) {
        console.error("❌ Find Company Error:", err);
        res.status(500).json({ success: false, message: "Server error occurred while searching." });
    }
});


/* ================================
   🟢 5️⃣ View Company (GET)
================================ */
router.get('/view/:id', isLoggedIn, allowRoles("admin", "worker"), async (req, res) => {
    const role = req.user.role;
    try {
        let { filter = "month", from, to } = req.query;

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
            start = moment.tz(from, PKT_TIMEZONE).startOf('day').toDate();
            end   = to
                ? moment.tz(to, PKT_TIMEZONE).endOf('day').toDate()
                : moment.tz(from, PKT_TIMEZONE).endOf('day').toDate();
        }

        const company = await Company.findById(req.params.id).populate({
            path: "items",
            options: { sort: { createdAt: -1 } },
            populate: { path: "billId", select: "billID createdAt" }
        }).lean();

        if (!company) return res.status(404).send("Company not found");

        // Payment history (filtered)
        let historyQuery = { companyId: company._id };
        if (filter !== 'all' && start && end) {
            historyQuery.createdAt = { $gte: start, $lte: end };
        }
        const paymentsInPeriod = await CompanyPaymentHistory.find(historyQuery).lean();

        // Stats
        let totalOutInPeriod  = 0;
        let totalPaidInPeriod = paymentsInPeriod.reduce((sum, p) => sum + Number(p.amountPaid || 0), 0);
        let lifetimeLeft      = 0;

        (company.items || []).forEach(item => {
            const itemDate = new Date(item.createdAt);
            const amt      = Number(item.totalProductAmount || 0);
            const paid     = Number(item.paidAmount || 0);

            if (filter === 'all' || (!start || (itemDate >= start && itemDate <= end))) {
                totalOutInPeriod += amt;
            }

            lifetimeLeft += (amt - paid);
        });

        const stats = {
            totalOutstandingAmount:      totalOutInPeriod,
            totalOutstandingAmountGiven: totalPaidInPeriod,
            totalOutstandingAmountLeft:  lifetimeLeft
        };

        const responseData = { role, company, stats, filter, from, to };

        if (req.xhr || (req.headers.accept && req.headers.accept.indexOf('json') > -1)) {
            return res.json({ success: true, ...responseData });
        }
        res.render("viewCompany", responseData);

    } catch (err) {
        console.error("❌ Company View Error:", err);
        res.status(500).send("Error loading company page");
    }
});


/* ================================
   🟢 6️⃣ Update Company Profile (POST)
================================ */
router.post('/update/:id', isLoggedIn, allowRoles("admin"), async (req, res) => {
    try {
        const { name, phone } = req.body;
        const company = await Company.findByIdAndUpdate(
            req.params.id,
            { $set: { name, phone, syncedToAtlas: false } },
            { new: true }
        );

        if (!company) {
            return res.status(404).json({ success: false, message: "Company not found" });
        }

        res.json({ success: true, message: "Profile updated successfully", company });
    } catch (err) {
        console.error("❌ Update Error:", err);
        res.status(500).json({ success: false, message: "Server error" });
    }
});


/* ================================
   🟢 7️⃣ Get Payment History (GET)
================================ */
router.get('/payment-history/:id', isLoggedIn, allowRoles("admin", "worker"), async (req, res) => {
    try {
        const history = await CompanyPaymentHistory.find({ companyId: req.params.id })
            .sort({ createdAt: -1 })
            .lean();

        res.json({ success: true, history });
    } catch (err) {
        console.error("❌ History Error:", err);
        res.status(500).json({ success: false, message: "Error fetching history" });
    }
});


/* ================================
   🟢 8️⃣ Pay Item (POST) — Simple amount based
================================ */
router.post("/pay-item/:id", isLoggedIn, allowRoles("admin", "worker"), async (req, res) => {
    try {
        const item = await CompanayItem.findById(req.params.id);
        if (!item) return res.json({ success: false, message: "❌ Record not found" });

        const amount = Number(req.body.amount);
        if (isNaN(amount) || amount <= 0) {
            return res.json({ success: false, message: "❌ Invalid amount" });
        }

        const remainingToPay = item.totalProductAmount - item.paidAmount;
        if (amount > remainingToPay) {
            return res.json({
                success: false,
                message: `❌ Over payment not allowed. Max: ${remainingToPay}`
            });
        }

        // Save payment history
        await new CompanyPaymentHistory({
            companyId:     item.company,
            companyItemId: item._id,
            amountPaid:    amount,
            originalAmountPaid: amount,
            paymentDate:   new Date()
        }).save();

        // Update item
        item.paidAmount += amount;
        if (item.paidAmount >= item.totalProductAmount) {
            item.paidStatus = "Paid";
        } else if (item.paidAmount > 0) {
            item.paidStatus = "Partial";
        } else {
            item.paidStatus = "Unpaid";
        }
        item.syncedToAtlas = false;
        await item.save();

        res.json({ success: true, message: "✅ Payment processed successfully!" });

    } catch (err) {
        console.error("❌ Pay Item Error:", err);
        res.status(500).json({ success: false, message: "❌ Server error." });
    }
});


/* ================================
   🔴 9️⃣ Delete Company (DELETE)
================================ */
router.delete("/delete-company/:id", isLoggedIn, allowRoles("admin"), async (req, res) => {
    try {
        const company = await Company.findById(req.params.id);
        if (!company) {
            return res.status(404).json({ success: false, message: "Company not found" });
        }

        await deleteAndSync(Company, req.params.id);

        res.json({ success: true, message: "Company deleted successfully! 🗑️" });
    } catch (err) {
        console.error("🔴 Error deleting company:", err);
        res.status(500).json({ success: false, message: "Error deleting company" });
    }
});


/* ================================
   🔴 1️⃣0️⃣ Delete Item (DELETE)
================================ */
router.delete("/delete-item/:id", isLoggedIn, allowRoles("admin"), async (req, res) => {
    try {
        const item = await CompanayItem.findById(req.params.id);
        if (!item) {
            return res.status(404).json({ success: false, message: "Item not found" });
        }

        await deleteAndSync(CompanayItem, req.params.id);

        // Associated payments bhi delete karo
        const associatedPayments = await CompanyPaymentHistory.find({ companyItemId: req.params.id });
        for (const payment of associatedPayments) {
            await deleteAndSync(CompanyPaymentHistory, payment._id);
        }

        res.json({
            success: true,
            message: "Item and its payment history deleted successfully! 🗑️"
        });
    } catch (err) {
        console.error("❌ Delete Error:", err);
        res.status(500).json({ success: false, message: "Error deleting item and history" });
    }
});


export default router;