import mongoose from "mongoose";

const agentItemSchema = new mongoose.Schema({
  agent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Agent",
    required: true
  },

  // ✅ Bill ka reference (PrintSale model se connect kar diya)
  billId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "PrintSale" // Isay check kar len ke aapke Bill model ka exact naam yahi hai
  },

  totalProductSold: {
    type: Number,
    required: true
  },

  totalProductAmount: {
    type: Number,
    required: true
  },

  percentage: {
    type: Number,
    required: true
  },

  percentageAmount: {
    type: Number,
    required: true
  },

  paidStatus: {
    type: String,
    enum: ["Paid", "Unpaid", "Partial"],
    default: "Unpaid"
  },

  paidAmount: {
    type: Number,
    default: 0
  }

}, { timestamps: true });

export default mongoose.model("AgentItem", agentItemSchema);