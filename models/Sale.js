import mongoose from 'mongoose';

const saleSchema = new mongoose.Schema({
  brandName:{ 
    type: String,
    index: true
  },
  itemName: { 
    type: String, 
    required: true,
    index: true
  },
  colourName:{ 
    type: String,
    index: true
  },
  qty: { 
    type: String,
    index: true
  },
  quantitySold: { type: Number, required: true },
  rate: { type: Number, required: true },
  productRate: { type: Number, required: true },
  stockID: { 
    type: String, 
    required: true,
    index: true
  },
  profit: { type: Number },
  refundQuantity:{ type: Number, default: 0 }, 
  refundStatus:{ type: String, default: "none" },
  saleID:{
    type: String, 
    required: true,
    index: true
  },
  agentItemId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "AgentItem",
    default: null 
  },
  billId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "PrintSale" 
  },
  customerItemId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "CustomerItem",
    default: null 
  },
  syncedToAtlas: { type: Boolean, default: false }
}, { timestamps: true });

// ✅ createdAt index
saleSchema.index({ createdAt: -1 });

export default mongoose.model("Sale", saleSchema);