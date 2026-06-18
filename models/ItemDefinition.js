import mongoose from 'mongoose';

const itemDefinitionSchema = new mongoose.Schema({
  brandName: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true 
  },
  units: [ {unitname:{type: String }}], 
  products: [{
    itemName: { type: String, required: true },
    hasColors: { type: Boolean, default: false },
    colors: [{
      code: { type: String },
      colour: { type: String }
    }]
  }],
  syncedToAtlas: { type: Boolean, default: false }
}, { timestamps: true });

// ✅ createdAt index
itemDefinitionSchema.index({ createdAt: -1 });

const ItemDefinition = mongoose.model('ItemDefinition', itemDefinitionSchema);
export default ItemDefinition;