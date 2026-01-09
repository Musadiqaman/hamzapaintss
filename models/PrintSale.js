import mongoose from 'mongoose';

const printSaleSchema = new mongoose.Schema({
    customerName: {
        type: String,
        required: true,
        trim: true
    },
    salesItems: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Sale'
    }],
    agentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Agent',
        default: null
    }
}, { timestamps: true });

// ✅ Ye line sabse zaroori hai
const PrintSale = mongoose.model('PrintSale', printSaleSchema);
export default PrintSale;