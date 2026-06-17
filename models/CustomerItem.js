import mongoose from "mongoose";

const customerItemSchema = new mongoose.Schema({
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Customer",
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
  totalStockValue: { 
    type: Number,
    default: 0
  },
  totalProfitValue: { 
    type: Number,
    default: 0
  },
  originalProductAmount: { 
    type: Number,
    required: true,
    default: 0
  },
  originalStockValue: { 
    type: Number,
    required: true,
    default: 0
  },
  originalProfitValue: { 
    type: Number,
    required: true,
    default: 0
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
customerItemSchema.index({ createdAt: -1 });

export default mongoose.model("CustomerItem", customerItemSchema);