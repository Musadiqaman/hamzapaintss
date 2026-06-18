import mongoose from "mongoose";

const agentPaymentHistorySchema = new mongoose.Schema({
  agentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Agent",
    required: true,
    index: true
  },
  agentItemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "AgentItem",
    required: true,
    index: true
  },
  amountPaid: {
    type: Number,
    required: true
  },
  paymentDate: {
    type: Date,
    default: Date.now
  },
  syncedToAtlas: { type: Boolean, default: false }
}, { timestamps: true });

// ✅ createdAt index
agentPaymentHistorySchema.index({ createdAt: -1 });

export default mongoose.model("AgentPaymentHistory", agentPaymentHistorySchema);