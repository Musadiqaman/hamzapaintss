import mongoose from "mongoose";

const companyPaymentHistorySchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Company",
    required: true
  },
  companyItemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "CompanyItem",
    required: true
  },
  amountPaid: { type: Number, required: true },
  originalAmountPaid: { type: Number, required: true, default: 0 },
  paymentDate: { type: Date, default: Date.now },
  syncedToAtlas: { type: Boolean, default: false }
}, { timestamps: true });

// ✅ createdAt index
companyPaymentHistorySchema.index({ createdAt: -1 });

export default mongoose.model("CompanyPaymentHistory", companyPaymentHistorySchema);