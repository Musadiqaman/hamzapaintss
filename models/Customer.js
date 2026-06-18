import mongoose from "mongoose";

const customerSchema = new mongoose.Schema({
  customerID: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    required: true,
    index: true
  },
  cnic: {
    type: String
  },
  items: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CustomerItem"
    }
  ],
  syncedToAtlas: { type: Boolean, default: false }
}, { timestamps: true });

// ✅ createdAt index
customerSchema.index({ createdAt: -1 });

export default mongoose.model("Customer", customerSchema);