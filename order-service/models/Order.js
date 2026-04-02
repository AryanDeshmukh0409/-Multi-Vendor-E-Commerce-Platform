const mongoose = require('mongoose');

// Valid status transitions — enforced by the state machine
const TRANSITIONS = {
    pending: ['paid', 'cancelled'],
    paid: ['processing', 'cancelled'],
    processing: ['shipped'],
    shipped: ['delivered'],
    delivered: [],
    cancelled: [],
};

const itemSchema = new mongoose.Schema({
    productId: { type: mongoose.Schema.Types.ObjectId, required: true },
    sellerId: { type: mongoose.Schema.Types.ObjectId, required: true },
    title: { type: String, required: true },
    price: { type: Number, required: true },   // unit price in cents at time of order
    qty: { type: Number, required: true, min: 1 },
}, { _id: false });

const orderSchema = new mongoose.Schema({
    buyerId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    items: { type: [itemSchema], required: true },   // multi-seller line items
    status: {
        type: String,
        enum: ['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled'],
        default: 'pending',
    },
    shippingAddress: {
        street: { type: String, required: true },
        city: { type: String, required: true },
        zip: { type: String, required: true },
        country: { type: String, required: true },
    },
    totalAmount: { type: Number, required: true },   // sum of all items in cents
    timeline: [{
        status: String,
        timestamp: { type: Date, default: Date.now },
        note: String,
    }],
}, { timestamps: true });

orderSchema.index({ createdAt: -1 });
orderSchema.index({ 'items.sellerId': 1 });   // seller dashboard queries

/**
 * State machine transition — throws if invalid
 * @param {string} newStatus
 * @param {string} note
 */
orderSchema.methods.transition = function (newStatus, note = '') {
    const allowed = TRANSITIONS[this.status];
    if (!allowed) throw new Error(`Unknown current status: ${this.status}`);
    if (!allowed.includes(newStatus))
        throw new Error(`Invalid transition: ${this.status} → ${newStatus}`);

    this.status = newStatus;
    this.timeline.push({ status: newStatus, timestamp: new Date(), note });
};

// Virtual: group items by seller (useful for split payouts)
orderSchema.virtual('itemsBySeller').get(function () {
    return this.items.reduce((acc, item) => {
        const key = item.sellerId.toString();
        if (!acc[key]) acc[key] = [];
        acc[key].push(item);
        return acc;
    }, {});
});

orderSchema.set('toJSON', { virtuals: true });
orderSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Order', orderSchema);
module.exports.TRANSITIONS = TRANSITIONS;