const mongoose = require('mongoose');

// Raw event log — every business event lands here
const analyticsEventSchema = new mongoose.Schema({
    event: { type: String, required: true, index: true },  // e.g. 'order.placed'
    payload: { type: mongoose.Schema.Types.Mixed },
    timestamp: { type: Date, default: Date.now, index: true },
});

analyticsEventSchema.index({ event: 1, timestamp: -1 });

// Denormalised order summary for fast aggregation pipelines
const orderSummarySchema = new mongoose.Schema({
    orderId: { type: mongoose.Schema.Types.ObjectId, unique: true },
    buyerId: mongoose.Schema.Types.ObjectId,
    totalAmount: Number,                      // in cents
    itemCount: Number,
    sellers: [mongoose.Schema.Types.ObjectId],
    categories: [String],
    status: String,
    placedAt: { type: Date, index: true },
    deliveredAt: Date,
});

orderSummarySchema.index({ placedAt: -1 });
orderSummarySchema.index({ sellers: 1 });

const AnalyticsEvent = mongoose.model('AnalyticsEvent', analyticsEventSchema);
const OrderSummary = mongoose.model('OrderSummary', orderSummarySchema);

module.exports = { AnalyticsEvent, OrderSummary };