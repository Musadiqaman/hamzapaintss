import mongoose from "mongoose";

const customerPaymentHistorySchema = new mongoose.Schema({
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Customer",
    required: true,
    index: true
  },
  customerItemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "CustomerItem",
    required: true,
    index: true
  },
  amountPaid: { type: Number, required: true },
  paidStockValue: { type: Number, required: true },
  paidProfitValue: { type: Number, required: true },
  originalAmountPaid: { type: Number, required: true, default: 0 },
  originalPaidStockValue: { type: Number, required: true, default: 0 },
  originalPaidProfitValue: { type: Number, required: true, default: 0 },
  paymentDate: { type: Date, default: Date.now },
  syncedToAtlas: { type: Boolean, default: false }
}, { timestamps: true });

// ✅ createdAt index
customerPaymentHistorySchema.index({ createdAt: -1 });

export default mongoose.model("CustomerPaymentHistory", customerPaymentHistorySchema);