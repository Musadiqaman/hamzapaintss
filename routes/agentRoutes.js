import express from 'express';
const router = express.Router();
import Agent from '../models/Agent.js';
import Item from '../models/Item.js';
import { isLoggedIn } from "../middleware/isLoggedIn.js";
import { allowRoles } from "../middleware/allowRoles.js";
import moment from 'moment-timezone';

router.get('/add',isLoggedIn,allowRoles("admin", "worker"),(req,res)=>{
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
        let { filter = 'all', from, to } = req.query; // Default 'all' hi rakha hai
        let query = {};
        const nowPKT = moment.tz(PKT_TIMEZONE);
        let start, end;

        // Date Logic (Keep as is)
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

        if (start && end) {
            query.createdAt = { $gte: start, $lte: end };
        }

        // Fetching Agents with Populated Items
        const agents = await Agent.find(query).populate("items").sort({ createdAt: -1 }).lean();

        // Stats Calculation
        let totalPercentageAmount = 0, totalPercentageAmountGiven = 0;
        agents.forEach(agent => {
            (agent.items || []).forEach(item => {
                totalPercentageAmount += Number(item.percentageAmount || 0);
                totalPercentageAmountGiven += Number(item.paidAmount || 0);
            });
        });

        const stats = {
            totalAgents: agents.length,
            totalPercentageAmount: totalPercentageAmount,
            totalPercentageAmountGiven: totalPercentageAmountGiven,
            totalPercentageAmountLeft: (totalPercentageAmount - totalPercentageAmountGiven)
        };

        const responseData = { role, agents, filter, from, to, stats };

        // 🟢 AJAX Request Handling
        if (req.xhr || req.headers.accept.indexOf('json') > -1) {
            return res.json({ success: true, ...responseData });
        }

        res.render("allAgents", responseData);
    } catch (err) {
        console.error("❌ Error:", err);
        res.status(500).send("Server Error");
    }
});





router.delete("/delete-agent/:id",isLoggedIn,allowRoles("admin"), async (req, res) => {
  try {
    const agentId = req.params.id;
    const deletedAgent = await Agent.findByIdAndDelete(agentId);
    if (!deletedAgent) {
      return res.status(404).json({ success: false, message: "Agent not found" });
    }
    res.json({ success: true, message: "Agent deleted successfully!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Error deleting agent" });
  }
});




router.get('/view-agent/:id', isLoggedIn, allowRoles("admin", "worker"), async (req, res) => {
    const role = req.user.role;
    try {
        let { filter, from, to } = req.query;
        let query = {};
        const nowPKT = moment.tz(PKT_TIMEZONE);
        let start, end;

        // Default "all" handle karne ke liye
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

        if (start && end) query.createdAt = { $gte: start, $lte: end };

        const agent = await Agent.findById(req.params.id).populate({
            path: "items",
            match: query,
            options: { sort: { createdAt: -1 } }
        }).lean();

        if (!agent) return res.status(404).send("Agent not found");

        let totalPercentageAmount = 0, totalPercentageAmountGiven = 0;
        (agent.items || []).forEach(item => {
            totalPercentageAmount += Number(item.percentageAmount || 0);
            totalPercentageAmountGiven += Number(item.paidAmount || 0);
        });

        const stats = {
            totalPercentageAmount,
            totalPercentageAmountGiven,
            totalPercentageAmountLeft: totalPercentageAmount - totalPercentageAmountGiven
        };

        const responseData = { role, agent, stats, filter: filter || 'all', from, to };

        // 🟢 AJAX Request Handle (Ye page ko refresh hone se bachayega)
        if (req.xhr || req.headers.accept.indexOf('json') > -1) {
            return res.json({ success: true, ...responseData });
        }

        res.render("viewAgent", responseData);
    } catch (err) {
        console.error(err);
        res.status(500).send("Error loading agent page");
    }
});




router.delete("/delete-item/:id",isLoggedIn,allowRoles("admin"), async (req, res) => {
  try {
    const itemId = req.params.id;
    const deletedItem = await Item.findByIdAndDelete(itemId);
    if (!deletedItem) {
      return res.status(404).json({ success: false, message: "Item not found" });
    }
    res.json({ success: true, message: "Item deleted successfully!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Error deleting Item" });
  }
});




router.post("/pay-item/:id",isLoggedIn,allowRoles("admin", "worker"), async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);

    if (!item) return res.json({ success: false });

    const amount = Number(req.body.amount);

    // Prevent overpayment
    if (item.paidAmount + amount > item.percentageAmount) {
      return res.json({ success: false, message: "Over payment not allowed" });
    }
    
    // Update payment
    item.paidAmount += amount;

    // Update status
    if (item.paidAmount >= item.percentageAmount) {
      item.paidStatus = "Paid";
    } else if (item.paidAmount > 0) {
      item.paidStatus = "Partial";
    } else {
      item.paidStatus = "Unpaid";
    }

    await item.save();

    res.json({ success: true });

  } catch (err) {
    console.log(err);
    res.json({ success: false });
  }
});






export default router;