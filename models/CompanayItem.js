import mongoose from "mongoose";

const companyItemSchema = new mongoose.Schema({
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Company",
    required: true,
    index: true
  },
  billId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "PrintProduct" 
  },
  totalProductBuy: {
    type: Number,
    required: true
  },
  totalProductAmount: { 
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
companyItemSchema.index({ createdAt: -1 });

export default mongoose.model("CompanyItem", companyItemSchema);