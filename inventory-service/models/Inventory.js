const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
    productId: { type: mongoose.Schema.Types.ObjectId, required: true, unique: true },
    sellerId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    storeId: { type: mongoose.Schema.Types.ObjectId, required: true },
    quantity: { type: Number, default: 0, min: 0 },
    reserved: { type: Number, default: 0, min: 0 },
    lowStockThreshold: { type: Number, default: 5 },
    updatedAt: { type: Date, default: Date.now },
}, { timestamps: true });

// Virtual: available = quantity - reserved
inventorySchema.virtual('available').get(function () {
    return Math.max(0, this.quantity - this.reserved);
});

inventorySchema.set('toJSON', { virtuals: true });
inventorySchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Inventory', inventorySchema);
