import mongoose from "mongoose";

const blockedIPSchema = new mongoose.Schema({
  ip: { type: String, required: true, unique: true },
  blockedAt: { type: Date, default: Date.now },
  syncedToAtlas: { type: Boolean, default: false }
});

// ✅ createdAt index
blockedIPSchema.index({ createdAt: -1 });

export default mongoose.model("BlockedIP", blockedIPSchema);