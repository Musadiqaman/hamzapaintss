import mongoose from 'mongoose';  // Correct way to import in ES Modules

const saleSchema = new mongoose.Schema({
  brandName:{ type: String },
  itemName: { type: String, required: true },
  colourName:{ type: String },
  qty: { type: String },  // If qty is a string, you might want to convert it to a number later
  quantitySold: { type: Number, required: true },
  rate: { type: Number, required: true },
  stockID: { type: String , required: true },  // Add stockID field to Sale schema
  profit: { type: Number },
  refundQuantity:{ type: Number, default: 0 }, 
  refundStatus:{ type: String, default: "none" },
  saleID:{type: String , required: true},
  agentItemId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "AgentItem",
    default: null 
  },
  billId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PrintSale" 
    }

}, { timestamps: true });

export default mongoose.model("Sale", saleSchema);
