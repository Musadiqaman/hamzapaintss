import express from 'express';
const router = express.Router();
import Agent from '../models/Agent.js';
import AgentItem from '../models/AgentItem.js';
import AgentPaymentHistory from '../models/AgentPaymentHistory.js'
import { isLoggedIn } from "../middleware/isLoggedIn.js";
import { allowRoles } from "../middleware/allowRoles.js";
import moment from 'moment-timezone';
import { deleteAndSync } from "../app.js";

router.get("/add",isLoggedIn,allowRoles("admin", "worker"),(req,res)=>{
const role=req.user.role;
res.render('addAgent',{role});
});



router.post("/add",isLoggedIn,allowRoles("admin", "worker"), async (req, res) => {
  try {
    const { name, phone, cnic } = req.body;

    if (!name || !phone) {
      return res.json({ success: false, message: "Name and Phone are required." });
    }

    // Check if phone already exists
    const exists = await Agent.findOne({ phone });
    if (exists) {
      return res.json({ success: false, message: "Agent already registered with this phone number." });
    }

    // Generate Agent ID
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const agentID = "AG" + randomNum;

    // Create agent
    const newAgent = await Agent.create({
      agentID,
      name,
      phone,
      cnic
    });

    res.json({
      success: true,
      message: "Agent created successfully",
      agent: newAgent
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
        let { filter = 'month', from, to } = req.query;

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
            start = moment.tz(from, PKT_TIMEZONE).startOf('day').toDate();
            end   = to ? moment.tz(to, PKT_TIMEZONE).endOf('day').toDate() : moment.tz(from, PKT_TIMEZONE).endOf('day').toDate();
        }

        const agents      = await Agent.find().populate("items").sort({ createdAt: -1 }).lean();
        const allPayments = await AgentPaymentHistory.find().lean();

        let filteredTotalComm = 0;
        let filteredPaidComm  = 0;
        let grandTotalLeft    = 0;

        const agentsWithStats = agents.map(agent => {
            const lifeTimeComm = (agent.items || []).reduce((sum, i) => sum + Number(i.percentageAmount || 0), 0);
            const lifeTimePaid = allPayments
                .filter(p => p.agentId.toString() === agent._id.toString())
                .reduce((sum, p) => sum + Number(p.amountPaid || 0), 0);

            const agentLeft = lifeTimeComm - lifeTimePaid;
            grandTotalLeft += agentLeft;

            if (start && end) {
                const filteredItems = (agent.items || []).filter(i => i.createdAt >= start && i.createdAt <= end);
                filteredTotalComm += filteredItems.reduce((sum, i) => sum + Number(i.percentageAmount || 0), 0);

                const filteredHistory = allPayments.filter(p =>
                    p.agentId.toString() === agent._id.toString() &&
                    p.createdAt >= start && p.createdAt <= end
                );
                filteredPaidComm += filteredHistory.reduce((sum, p) => sum + Number(p.amountPaid || 0), 0);
            }

            return { ...agent, calculatedLeft: agentLeft };
        });

        if (filter === 'all') {
            filteredTotalComm = agents.reduce((acc, a) => acc + (a.items || []).reduce((s, i) => s + Number(i.percentageAmount || 0), 0), 0);
            filteredPaidComm  = allPayments.reduce((acc, p) => acc + Number(p.amountPaid || 0), 0);
        }

        const stats = {
            totalAgents:               agentsWithStats.length,
            totalPercentageAmount:     filteredTotalComm,
            totalPercentageAmountGiven: filteredPaidComm,
            totalPercentageAmountLeft: grandTotalLeft
        };

        const totalCount      = agentsWithStats.length;
        const totalPages      = Math.ceil(totalCount / limit);
        const paginatedAgents = agentsWithStats.slice(skip, skip + limit);

        const pagination = {
            page, limit, totalCount, totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1
        };

        const responseData = {
            role,
            agents: paginatedAgents,
            filter, from, to,
            stats,
            pagination
        };

        if (req.xhr || req.headers.accept.indexOf('json') > -1) {
            return res.json({ success: true, ...responseData });
        }
        res.render("allAgents", responseData);

    } catch (err) {
        console.error("❌ Error:", err);
        res.status(500).send("Server Error");
    }
});


router.get("/find", isLoggedIn, allowRoles("admin", "worker"), async (req, res) => {
    const role = req.user.role;
    try {
        let { filter = 'all', from, to, search } = req.query;
        const nowPKT = moment.tz("Asia/Karachi");
        let start, end;

        // 1. Base Query for Search
        let dbQuery = {};
        if (search) {
            const searchTerm = search.trim();
            dbQuery.$or = [
                { name: { $regex: searchTerm, $options: "i" } },
                { phone: { $regex: searchTerm, $options: "i" } }
            ];
        }

        // 2. Date Logic (Start aur End define karna)
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
            start = moment.tz(from, "Asia/Karachi").startOf('day').toDate();
            end = to ? moment.tz(to, "Asia/Karachi").endOf('day').toDate() : moment.tz(from, "Asia/Karachi").endOf('day').toDate();
        }

        // --- IMPORTANT FIX: Date query ko dbQuery mein shamil karna ---
        // Agar aap chahte hain ke search ke sath date filter bhi database level par apply ho
        if (start && end) {
            dbQuery.createdAt = { $gte: start, $lte: end };
        }

        // 3. Data Fetching
        const agents = await Agent.find(dbQuery).populate("items").sort({ createdAt: -1 }).lean();
        const allPayments = await AgentPaymentHistory.find().lean();

        let filteredTotalComm = 0;
        let filteredPaidComm = 0;
        let grandTotalLeft = 0;

        const agentsWithStats = agents.map(agent => {
            // Lifetime Balance (Hamesha poora dikhana hai)
            const lifeTimeComm = (agent.items || []).reduce((sum, i) => sum + Number(i.percentageAmount || 0), 0);
            const lifeTimePaid = allPayments
                .filter(p => p.agentId.toString() === agent._id.toString())
                .reduce((sum, p) => sum + Number(p.amountPaid || 0), 0);
            
            const agentLeft = lifeTimeComm - lifeTimePaid;
            grandTotalLeft += agentLeft;

            // Stats Cards ke liye calculation
            if (start && end) {
                const filteredItems = (agent.items || []).filter(i => i.createdAt >= start && i.createdAt <= end);
                filteredTotalComm += filteredItems.reduce((sum, i) => sum + Number(i.percentageAmount || 0), 0);

                const filteredHistory = allPayments.filter(p => 
                    p.agentId.toString() === agent._id.toString() && 
                    p.createdAt >= start && p.createdAt <= end
                );
                filteredPaidComm += filteredHistory.reduce((sum, p) => sum + Number(p.amountPaid || 0), 0);
            } else {
                // Agar 'all' filter hai
                filteredTotalComm += lifeTimeComm;
                filteredPaidComm += lifeTimePaid;
            }

            return { ...agent, calculatedLeft: agentLeft };
        });

        const stats = {
            totalAgents: agentsWithStats.length,
            totalPercentageAmount: filteredTotalComm,
            totalPercentageAmountGiven: filteredPaidComm,
            totalPercentageAmountLeft: grandTotalLeft 
        };

        const responseData = { role, agents: agentsWithStats, filter, from, to, stats };

        // 4. AJAX / JSON Response
        if (req.xhr || req.headers.accept.indexOf('json') > -1) {
            return res.json({ success: true, ...responseData });
        }
        res.render("allAgents", responseData);

    } catch (err) {
        console.error("❌ Find Error:", err);
        res.status(500).send("Server Error");
    }
});


router.delete("/delete-agent/:id", isLoggedIn, allowRoles("admin"), async (req, res) => {
  try {
    const agentId = req.params.id;

    // 1. Pehle check karo ke agent database mein hai ya nahi
    const agent = await Agent.findById(agentId);
    if (!agent) {
      return res.status(404).json({ success: false, message: "Agent not found" });
    }

    // 2. deleteAndSync helper ka use karo (Local se delete + Sync logging)
    await deleteAndSync(Agent, agentId);

    res.json({ success: true, message: "Agent deleted successfully! 🗑️" });
  } catch (err) {
    console.error("🔴 Error deleting agent:", err);
    res.status(500).json({ success: false, message: "Error deleting agent" });
  }
});




router.get('/view/:id', isLoggedIn, allowRoles("admin", "worker"), async (req, res) => {
    const role = req.user.role;
    try {
        // 1. DEFAULT FILTER LOGIC: Agar filter nahi hai to 'month' set karein
        let { filter, from, to } = req.query;
        if (!filter) {
            filter = "month"; 
        }

        const nowPKT = moment.tz(PKT_TIMEZONE);
        let start, end;

        // --- Date Logic for Stats ---
        if (filter === "today") {
            start = nowPKT.clone().startOf('day').toDate();
            end = nowPKT.clone().endOf('day').toDate();
        } else if (filter === "yesterday") {
            const yesterday = nowPKT.clone().subtract(1, 'days');
            start = yesterday.clone().startOf('day').toDate();
            end = yesterday.clone().endOf('day').toDate();
        } else if (filter === "month") {
            start = nowPKT.clone().startOf('month').toDate();
            end = nowPKT.clone().endOf('day').toDate();
        } else if (filter === "lastMonth") {
            const lastMonth = nowPKT.clone().subtract(1, 'months');
            start = lastMonth.clone().startOf('month').toDate();
            end = lastMonth.clone().endOf('month').toDate();
        } else if (filter === "custom" && from) {
            start = moment.tz(from, PKT_TIMEZONE).startOf('day').toDate();
            end = to ? moment.tz(to, PKT_TIMEZONE).endOf('day').toDate() : moment.tz(from, PKT_TIMEZONE).endOf('day').toDate();
        }

        // 2. Fetch Agent & ALL Items (Table hamesha poora rahega)
        const agent = await Agent.findById(req.params.id).populate({
            path: "items",
            options: { sort: { createdAt: -1 } },
            populate: { path: "billId", select: "customerName createdAt" }
        }).lean();

        if (!agent) return res.status(404).send("Agent not found");

        // 3. Fetch Payment History (Is mahine/period mein kitna cash diya)
        let historyQuery = { agentId: agent._id };
        if (filter !== 'all' && start && end) {
            historyQuery.createdAt = { $gte: start, $lte: end };
        }
        const payments = await AgentPaymentHistory.find(historyQuery).lean();

        // 4. Stats Calculation
        let totalCommissionInPeriod = 0; // Is period mein kitne ka commission 'Bana'
        let totalPaidInPeriod = payments.reduce((sum, p) => sum + Number(p.amountPaid || 0), 0);

        // Commission calculation (Filter ke mutabiq items check karein)
        (agent.items || []).forEach(item => {
            const itemDate = new Date(item.createdAt);
            // Agar filter 'all' hai ya item date range mein hai
            if (filter === 'all' || (!start || (itemDate >= start && itemDate <= end))) {
                totalCommissionInPeriod += Number(item.percentageAmount || 0);
            }
        });

        // 5. Lifetime Outstanding (Fixed: Total Kitna Dena Baaki Hai)
        let lifetimeLeft = 0;
        const allItemsForBalance = await AgentItem.find({ agent: agent._id }).lean();
        allItemsForBalance.forEach(i => {
            lifetimeLeft += (Number(i.percentageAmount || 0) - Number(i.paidAmount || 0));
        });

        const stats = {
            totalPercentageAmount: totalCommissionInPeriod, 
            totalPercentageAmountGiven: totalPaidInPeriod,   
            totalPercentageAmountLeft: lifetimeLeft         
        };

        const responseData = { role, agent, stats, filter, from, to };

        // 6. XHR (AJAX) Response
        if (req.xhr || (req.headers.accept && req.headers.accept.indexOf('json') > -1)) {
            return res.json({ success: true, ...responseData });
        }

        // 7. Regular Page Render
        res.render("viewAgent", responseData);

    } catch (err) {
        console.error("❌ Stats Error:", err);
        res.status(500).send("Error loading agent page");
    }
});




//  UPDATE AGENT PROFILE (Name & Phone)
router.post('/update/:id', isLoggedIn, allowRoles("admin"), async (req, res) => {
    try {
        const { name, phone } = req.body;
        const agent = await Agent.findByIdAndUpdate(
            req.params.id, 
            { $set: { name, phone, syncedToAtlas: false } }, // ✅ bas yahi badla 
            { new: true }
        );

        if (!agent) {
            return res.status(404).json({ success: false, message: "Agent not found" });
        }

        res.json({ success: true, message: "Profile updated successfully", agent });
    } catch (err) {
        console.error("❌ Update Error:", err);
        res.status(500).json({ success: false, message: "Server error" });
    }
});


// 2. GET PAYMENT HISTORY (For Modal)
router.get('/payment-history/:id', isLoggedIn, allowRoles("admin", "worker"), async (req, res) => {
    try {
        // Agent ki saari payment history fetch karein, latest upar
        const history = await AgentPaymentHistory.find({ agentId: req.params.id })
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
    // 1. Item ko find karein (Reference model 'Item')
    const item = await AgentItem.findById(req.params.id);

    if (!item) return res.json({ success: false, message: "Item not found" });

    const amount = Number(req.body.amount);

    // Basic validation
    if (isNaN(amount) || amount <= 0) {
      return res.json({ success: false, message: "Invalid amount" });
    }

    // Prevent overpayment
    if (item.paidAmount + amount > item.percentageAmount) {
      return res.json({ success: false, message: "Over payment not allowed" });
    }

    // --- 🟢 Naya History Logic Start ---
    // Jab bhi payment hogi, history mein record save hoga
    // Isse 'This Month' filter mein exact amount show hoga
    const paymentRecord = new AgentPaymentHistory({
      agentId: item.agent,        // Agent ka reference (Ref from Item model)
      agentItemId: item._id,      // Item ka reference
      amountPaid: amount          // Jitni payment abhi ki gayi
    });
    await paymentRecord.save();
    // --- 🟢 Naya History Logic End ---

    // 2. Main item ki payment update karein
    item.paidAmount += amount;

    // Status update logic
    if (item.paidAmount >= item.percentageAmount) {
      item.paidStatus = "Paid";
    } else if (item.paidAmount > 0) {
      item.paidStatus = "Partial";
    } else {
      item.paidStatus = "Unpaid";
    }
    item.syncedToAtlas = false; // ✅ yeh add karo
    await item.save();

    res.json({ 
      success: true, 
      message: "Payment saved in history and balance updated!" 
    });

  } catch (err) {
    console.error("❌ Pay Item Error:", err);
    res.json({ success: false, message: "Server error" });
  }
});




router.delete("/delete-item/:id", isLoggedIn, allowRoles("admin"), async (req, res) => {
  try {
    const itemId = req.params.id;

    // 1. Pehle check karein ke item exist karta hai ya nahi
    const item = await AgentItem.findById(itemId);
    if (!item) {
      return res.status(404).json({ success: false, message: "Item not found" });
    }

    // 2. Main Item ko deleteAndSync se delete karein (Local delete + Sync track)
    await deleteAndSync(AgentItem, itemId);

    // 3. 🟢 History Cleanup: Is item se judi saari payments dhoondhein aur unhein bhi deleteAndSync se urayein
    const associatedPayments = await AgentPaymentHistory.find({ agentItemId: itemId });
    
    // Har payment record ko loop chala kar deleteAndSync se delete karein taake sync track kharab na ho
    for (const payment of associatedPayments) {
      await deleteAndSync(AgentPaymentHistory, payment._id);
    }

    res.json({ 
      success: true, 
      message: "Item and associated payment history deleted successfully! 🗑️" 
    });

  } catch (err) {
    console.error("❌ Delete Error:", err);
    res.status(500).json({ success: false, message: "Error deleting Item and history" });
  }
});


// Agent Collective Payment — export default se pehle paste karo
router.post("/collective-pay/:agentId", isLoggedIn, allowRoles("admin", "worker"), async (req, res) => {
  try {
    const { agentId } = req.params;
    const totalAmount = parseFloat(req.body.amount);

    if (!totalAmount || totalAmount <= 0) {
      return res.json({ success: false, message: "Valid amount darj karo." });
    }

    // Saare unpaid/partial items — purane pehle
    const items = await AgentItem.find({
      agent: agentId,
      paidStatus: { $in: ["Unpaid", "Partial"] }
    }).sort({ createdAt: 1 });

    if (!items || items.length === 0) {
      return res.json({ success: false, message: "Koi outstanding commission nahi mili." });
    }

    const totalRemaining = items.reduce(function(sum, i) {
      return sum + (Number(i.percentageAmount) - Number(i.paidAmount));
    }, 0);

    if (totalAmount > totalRemaining) {
      return res.json({
        success: false,
        message: "Amount zyada hai. Maximum outstanding: Rs. " + totalRemaining.toFixed(2)
      });
    }

    let amountLeft    = totalAmount;
    const historyDocs = [];
    const itemUpdates = [];

    for (const item of items) {
      if (amountLeft <= 0) break;

      const remainingOnThis = Number(item.percentageAmount) - Number(item.paidAmount);
      if (remainingOnThis <= 0) continue;

      const payThis = Math.min(amountLeft, remainingOnThis);

      historyDocs.push({
        agentId:     item.agent,
        agentItemId: item._id,
        amountPaid:  payThis,
        paymentDate: new Date()
      });

      const newPaid   = Number(item.paidAmount) + payThis;
      const newStatus = newPaid >= Number(item.percentageAmount) ? "Paid"
                      : newPaid > 0 ? "Partial" : "Unpaid";

      itemUpdates.push(
        AgentItem.findByIdAndUpdate(item._id, {
          $set: { paidAmount: newPaid, paidStatus: newStatus, syncedToAtlas: false }
        })
      );

      amountLeft = parseFloat((amountLeft - payThis).toFixed(2));
    }

    await Promise.all([
      AgentPaymentHistory.insertMany(historyDocs),
      ...itemUpdates
    ]);

    res.json({
      success:           true,
      message:           "Rs. " + totalAmount.toFixed(2) + " successfully distribute ho gaye " + historyDocs.length + " commission(s) mein.",
      billsSettled:      historyDocs.length,
      amountDistributed: totalAmount
    });

  } catch (err) {
    console.error("Agent Collective Pay Error:", err);
    res.status(500).json({ success: false, message: "Server error." });
  }
});







export default router;






