import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
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
  totalProduct: { 
    type: Number, 
    required: true 
  },
  remaining: { 
    type: Number, 
    default: 0,
    index: true
  },
  rate: { 
    type: Number, 
    required: true 
  },
  saleRate: {
    type: Number,
    required: true
  },
  stockID: {
    type: String,
    required: true,
    unique: true,
  },
  qrCode: {
    type: String 
  },
  refundQuantity:{ 
    type: Number, 
    default: 0 
  }, 
  refundStatus:{ 
    type: String, 
    default: "none" 
  },
  stockStatus: { 
    type: String, 
    enum: ['Available', 'Out of Stock', 'Archived'], 
    default: 'Available' 
  },
  billId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "PrintProduct" 
  },
  companyItemId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "CompanyItem",
    default: null 
  },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Company",
    default: null
  },
  companyName: {
    type: String,
    default: null
  },
  companyPhone: {
    type: String,
    default: null
  },
  syncedToAtlas: { type: Boolean, default: false }
}, { timestamps: true });

// ✅ createdAt index
productSchema.index({ createdAt: -1 });

export default mongoose.model("Product", productSchema);