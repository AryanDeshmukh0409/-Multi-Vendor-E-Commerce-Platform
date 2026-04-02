const mongoose = require('mongoose');

const shipmentSchema = new mongoose.Schema({
    orderId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    sellerId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    carrier: { type: String, enum: ['FedEx', 'UPS', 'DHL', 'Canada Post', 'Other'], required: true },
    trackingNumber: { type: String, required: true },
    status: {
        type: String,
        enum: ['created', 'in_transit', 'out_for_delivery', 'delivered', 'failed'],
        default: 'created',
    },
    estimatedDelivery: { type: Date, default: null },
    timeline: [{
        status: String,
        timestamp: { type: Date, default: Date.now },
        location: { type: String, default: '' },
    }],
    updatedAt: { type: Date, default: Date.now },
}, { timestamps: true });

shipmentSchema.index({ orderId: 1, sellerId: 1 }, { unique: true }); // one shipment per seller per order

module.exports = mongoose.model('Shipment', shipmentSchema);