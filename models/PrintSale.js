import mongoose from 'mongoose';

const printSaleSchema = new mongoose.Schema({
    customerName: {
        type: String,
        required: true,
        trim: true
    },
    billtype:{
        type: String,
        require: true
    },
    salesItems: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Sale'
    }],
    agentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Agent',
        default: null,
        index: true
    },
    customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer',
        default: null
    },
    billID:{
        type: String,
        require: true,
        index: true
    },
    syncedToAtlas: { type: Boolean, default: false }
}, { timestamps: true });

// ✅ createdAt index
printSaleSchema.index({ createdAt: -1 });

const PrintSale = mongoose.model('PrintSale', printSaleSchema);
export default PrintSale;