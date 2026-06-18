import mongoose from "mongoose";

const agentItemSchema = new mongoose.Schema({
  agent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Agent",
    required: true,
    index: true
  },
  billId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "PrintSale"
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
  },
  syncedToAtlas: { type: Boolean, default: false }

}, { timestamps: true });

// ✅ createdAt index
agentItemSchema.index({ createdAt: -1 });

export default mongoose.model("AgentItem", agentItemSchema);