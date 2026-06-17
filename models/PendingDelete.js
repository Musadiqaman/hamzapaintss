import mongoose from "mongoose";

const pendingDeleteSchema = new mongoose.Schema({
    collectionName: { type: String, required: true },
    documentId: { type: mongoose.Schema.Types.ObjectId, required: true },
    syncedToAtlas: { type: Boolean, default: false }
}, { timestamps: true });

// ✅ createdAt index
pendingDeleteSchema.index({ createdAt: -1 });

export default mongoose.model("PendingDelete", pendingDeleteSchema);