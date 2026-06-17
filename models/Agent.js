import mongoose from "mongoose";

const agentSchema = new mongoose.Schema({
  agentID: {
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
      ref: "AgentItem"
    }
  ],
  syncedToAtlas: { type: Boolean, default: false }
}, { timestamps: true });

// ✅ createdAt index
agentSchema.index({ createdAt: -1 });

export default mongoose.model("Agent", agentSchema);