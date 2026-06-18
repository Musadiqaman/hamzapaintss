import express from "express";
import { isLoggedIn } from "../middleware/isLoggedIn.js";
import { allowRoles } from "../middleware/allowRoles.js";
import moment from 'moment-timezone';
import { deleteAndSync } from "../app.js";
import Guest from "../models/Guest.js";

const router = express.Router();


router.get('/add', isLoggedIn, allowRoles("admin", "worker"), async (req, res) => {
    const role = req.user.role;
    res.render('addGuest', { role });
});


router.post('/add', isLoggedIn, allowRoles("admin", "worker"), async (req, res) => {
    try {
        const { guestName, title, amount, remarks } = req.body;

        const newGuest = new Guest({
            guestName,
            title: title || "Chai / Cold Drink (Mehman)", 
            amount: parseFloat(amount),
            remarks: remarks || ""
        });

        await newGuest.save();
        
        // Response direct send hoga bina page jhatke ke
        return res.status(200).json({ 
            success: true, 
            message: "✅ Guest entry successfully added!" 
        });

    } catch (error) {
        console.error("🔴 Error adding guest:", error);
        return res.status(500).json({ 
            success: false, 
            message: "Server error: Entry save nahi ho saki." 
        });
    }
});



const PKT_TIMEZONE = "Asia/Karachi";


router.get('/all', isLoggedIn, allowRoles("admin", "worker"), async (req, res) => {
    try {
        const filter = req.query.filter || 'month';
        const role = req.user.role; 

        // Pagination parameters parse karein
        const page  = parseInt(req.query.page)  || 1;
        const limit = parseInt(req.query.limit) || 25;
        const skip  = (page - 1) * limit;

        let start, end;
        const nowPKT = moment.tz(PKT_TIMEZONE);

        switch (filter) {   
            case 'today':
                start = nowPKT.clone().startOf('day');
                end = nowPKT.clone().endOf('day');
                break;
            case 'yesterday':
                start = nowPKT.clone().subtract(1, 'day').startOf('day');
                end = nowPKT.clone().subtract(1, 'day').endOf('day');
                break;
            case 'month':
                start = nowPKT.clone().startOf('month');
                end = nowPKT.clone().endOf('day'); // real-time today end tak
                break;
            case 'lastMonth':
                start = nowPKT.clone().subtract(1, 'month').startOf('month');
                end = nowPKT.clone().subtract(1, 'month').endOf('month');
                break;
            case 'custom':
                if (req.query.from) {
                    start = moment.tz(req.query.from, 'YYYY-MM-DD', PKT_TIMEZONE).startOf('day');
                    end = req.query.to
                        ? moment.tz(req.query.to, 'YYYY-MM-DD', PKT_TIMEZONE).endOf('day')
                        : moment.tz(req.query.from, 'YYYY-MM-DD', PKT_TIMEZONE).endOf('day');
                } else {
                    start = null; end = null;
                }
                break;
            case 'all':
            default:
                start = null;
                end = null;
        }   

        // Filter query parameters build karein
        const query = start && end ? { createdAt: { $gte: start.toDate(), $lte: end.toDate() } } : {};
        
        // 1. Filtered dynamic parameters count karein pagination ke liye
        const totalCount = await Guest.countDocuments(query);
        const totalPages = Math.ceil(totalCount / limit);

        // 2. Paginated data fetch karein chunk data optimize rakhne ke liye
        const guests = await Guest.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        // 3. Stats Calculation (Filtered Range ke hisab se total amount sum)
        const totalAmountAgg = await Guest.aggregate([
            { $match: query },
            { $group: { _id: null, totalSum: { $sum: { $toDouble: "$amount" } } } }
        ]);
        const totalAmountSum = totalAmountAgg.length > 0 ? totalAmountAgg[0].totalSum : 0;

        const responseData = { 
            guests, 
            stats: { 
                totalGuests: totalCount, // Filtered database entries counter
                totalAmountSum: totalAmountSum
            }, 
            pagination: {
                page,
                limit,
                totalCount,
                totalPages,
                hasNext: page < totalPages,
                hasPrev: page > 1
            },
            filter,
            from: req.query.from || "",
            to: req.query.to || "",
            role 
        };

        // AJAX Request response logic handler
        if (req.xhr || (req.headers['x-requested-with'] === 'XMLHttpRequest') || (req.headers.accept && req.headers.accept.indexOf('json') > -1)) {
            return res.json({ success: true, ...responseData });
        }

        // Standard direct template compilation state
        res.render('allGuests', responseData);

    } catch (error) {
        console.error("🔴 Error fetching guests:", error);
        res.status(500).send("Server error: Guests fetch nahi ho saki.");
    }
});



router.delete('/delete-guest/:id', isLoggedIn, allowRoles("admin"), async (req, res) => {
    try {
        const guestId = req.params.id;

        // 1. Pehle check karo ke record database mein exist karta hai ya nahi
        const guestEntry = await Guest.findById(guestId);
        if (!guestEntry) {
            return res.status(404).json({ 
                success: false, 
                message: "Record not found: This guest entry has already been deleted." 
            });
        }

        // 2. deleteAndSync call karo (Yeh local se delete bhi karega aur PendingDelete mein track save karega)
        await deleteAndSync(Guest, guestId);

        // Success response
        return res.json({ 
            success: true, 
            message: "Guest expense record has been successfully deleted! 🗑️" 
        });

    } catch (error) {
        console.error("🔴 Error deleting guest entry:", error);
        return res.status(500).json({ 
            success: false, 
            message: "Server error: Unable to delete the guest entry." 
        });
    }
});




export default router;