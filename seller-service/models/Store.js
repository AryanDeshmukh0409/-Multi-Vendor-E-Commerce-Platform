const mongoose = require('mongoose');

const storeSchema = new mongoose.Schema({
    sellerId: { type: mongoose.Schema.Types.ObjectId, required: true, unique: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    email: { type: String, required: true, lowercase: true },
    phone: { type: String, default: '' },
    address: {
        street: String,
        city: String,
        zip: String,
        country: String,
    },
    logoUrl: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
    totalRevenue: { type: Number, default: 0 },      // updated by Payment service events
    totalOrders: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Store', storeSchema);
