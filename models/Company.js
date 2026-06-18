import mongoose from "mongoose";

const companySchema = new mongoose.Schema({
  companyID: {
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
      ref: "CompanyItem"
    }
  ],
  syncedToAtlas: { type: Boolean, default: false }
}, { timestamps: true });

// ✅ createdAt index
companySchema.index({ createdAt: -1 });

export default mongoose.model("Company", companySchema);