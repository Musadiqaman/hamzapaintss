import mongoose from 'mongoose';

const refundSaleHistorySchema = new mongoose.Schema({
    saleId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Sale', 
        required: true 
    },
    refundQty: { 
        type: Number, 
        required: true 
    },
    refundAmount:{
        type:Number,
        require:true
    },
    refundStock: { 
        type: Number, 
        required: true 
    },
    refundProfit: { 
        type: Number, 
        required: true 
    },
    syncedToAtlas: { type: Boolean, default: false }
}, { timestamps: true });

// ✅ createdAt index
refundSaleHistorySchema.index({ createdAt: -1 });

export default mongoose.model('RefundSaleHistory', refundSaleHistorySchema);