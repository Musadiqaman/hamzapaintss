import mongoose from 'mongoose';

const refundProductHistorySchema = new mongoose.Schema({
    productId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Product', 
        required: true 
    },
    refundQty: { 
        type: Number, 
        required: true 
    },
    refundAmount: { 
        type: Number, 
        required: true 
    },
    syncedToAtlas: { type: Boolean, default: false }
}, { timestamps: true });

// ✅ createdAt index
refundProductHistorySchema.index({ createdAt: -1 });

export default mongoose.model('RefundProductHistory', refundProductHistorySchema);