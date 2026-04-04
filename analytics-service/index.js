const express = require('express');
const cors = require('cors');

const mongoose = require('mongoose');
require('dotenv').config();

const analyticsRoutes = require('./routes/analytics.routes');
const errorHandler = require('../shared/middleware/errorHandler');
const eventBus = require('../shared/events/eventBus');
const { AnalyticsEvent, OrderSummary } = require('./models/AnalyticsEvent');

// ── Subscribe to all major events and log them ──
const TRACKED_EVENTS = [
    'order.placed',
    'order.cancelled',
    'order.delivered',
    'payment.captured',
    'payment.refunded',
    'shipment.created',
    'shipment.delivered',
    'inventory.stock_low',
    'review.approved',
    'escrow.released',
];

TRACKED_EVENTS.forEach(event => {
    eventBus.subscribe(event, ({ payload, timestamp }) => {
        AnalyticsEvent.create({ event, payload, timestamp })
            .catch(err => console.error(`[analytics] Failed to log ${event}:`, err));
    });
});

// ── order.placed → build OrderSummary for fast queries ──
eventBus.subscribe('order.placed', ({ payload }) => {
    const { orderId, buyerId, items, totalAmount } = payload;
    const sellers = [...new Set(items.map(i => i.sellerId))];
    const categories = [...new Set(items.map(i => i.category).filter(Boolean))];

    OrderSummary.findOneAndUpdate(
        { orderId },
        {
            orderId, buyerId, totalAmount,
            itemCount: items.reduce((s, i) => s + i.qty, 0),
            sellers, categories,
            status: 'pending',
            placedAt: new Date(),
        },
        { upsert: true, new: true }
    ).catch(console.error);
});

// ── order.delivered → stamp deliveredAt ──
eventBus.subscribe('order.delivered', ({ payload }) => {
    OrderSummary.findOneAndUpdate(
        { orderId: payload.orderId },
        { $set: { status: 'delivered', deliveredAt: new Date() } }
    ).catch(console.error);
});

// ── order.cancelled → update status ──
eventBus.subscribe('order.cancelled', ({ payload }) => {
    OrderSummary.findOneAndUpdate(
        { orderId: payload.orderId },
        { $set: { status: 'cancelled' } }
    ).catch(console.error);
});

const app = express();
app.use(express.json());
app.use('/analytics', analyticsRoutes);
app.use(cors());
app.use(errorHandler);

mongoose.connect(process.env.MONGO_URI)
    .then(() => app.listen(process.env.PORT || 4011,
        () => console.log(`[analytics-service] listening on ${process.env.PORT || 4011}`)))
    .catch(err => { console.error(err); process.exit(1); });
