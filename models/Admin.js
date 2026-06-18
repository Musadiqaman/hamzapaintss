import mongoose from "mongoose";

const adminSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true, 
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ["admin", "worker"],
    required: true
  },
  otp: {
    type: Number,
    default: null,
    index: true
  },
  otpExpires: {
    type: Date,
    default: null
  },
  syncedToAtlas: { type: Boolean, default: false }
}, { timestamps: true });

// ✅ createdAt index
adminSchema.index({ createdAt: -1 });

export default mongoose.model("Admin", adminSchema);