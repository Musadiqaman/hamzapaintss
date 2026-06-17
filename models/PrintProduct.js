import mongoose from 'mongoose';

const printProductSchema = new mongoose.Schema({
    productsItems: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product'
    }],
    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        default: null
    },
    billID: {
        type: String,
        require: true,
        index: true
    },
    billtype: {
        type: String,
        default: "none"
    },
    syncedToAtlas: { type: Boolean, default: false }
}, { timestamps: true });

// ✅ createdAt index
printProductSchema.index({ createdAt: -1 });

const PrintProduct = mongoose.model('PrintProduct', printProductSchema);
export default PrintProduct;