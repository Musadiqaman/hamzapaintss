import mongoose from 'mongoose';

const guestSchema = new mongoose.Schema({
    guestName: {
        type: String,
        required: true,
        trim: true
    },
    title: { 
        type: String, 
        required: true, 
        default: "Chai / Cold Drink (Mehman)" 
    },
    amount: { 
        type: Number, 
        required: true 
    },
    remarks: { 
        type: String, 
        default: "" 
    },
    date: { 
        type: Date, 
        default: Date.now 
    },
    syncedToAtlas: { type: Boolean, default: false }
}, { timestamps: true });

// ✅ createdAt index
guestSchema.index({ createdAt: -1 });

const Guest = mongoose.model('Guest', guestSchema);
export default Guest;