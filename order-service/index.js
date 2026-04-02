const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();

const orderRoutes = require('./routes/order.routes');
const errorHandler = require('../shared/middleware/errorHandler');
const eventBus = require('../shared/events/eventBus');
const Order = require('./models/Order');

// ── payment.captured → advance order to processing ──
eventBus.subscribe('payment.captured', ({ payload }) => {
    Order.findById(payload.orderId).then(order => {
        if (!order) return;
        try {
            order.transition('processing', 'Payment confirmed');
            return order.save();
        } catch (e) { console.error('[order] transition error:', e.message); }
    }).catch(console.error);
});

// ── shipment.created → advance order to shipped ──
eventBus.subscribe('shipment.created', ({ payload }) => {
    Order.findById(payload.orderId).then(order => {
        if (!order) return;
        try {
            order.transition('shipped', `Tracking: ${payload.trackingNumber}`);
            return order.save();
        } catch (e) { console.error('[order] transition error:', e.message); }
    }).catch(console.error);
});

// ── shipment.delivered → advance order to delivered ──
eventBus.subscribe('shipment.delivered', ({ payload }) => {
    Order.findById(payload.orderId).then(order => {
        if (!order) return;
        try {
            order.transition('delivered', 'Delivered by carrier');
            return order.save().then(() => {
                eventBus.publish('order.delivered', {
                    orderId: order._id.toString(),
                    buyerId: order.buyerId.toString(),
                    items: order.items.map(i => ({
                        productId: i.productId.toString(),
                        sellerId: i.sellerId.toString(),
                        qty: i.qty,
                        price: i.price,
                    })),
                });
            });
        } catch (e) { console.error('[order] transition error:', e.message); }
    }).catch(console.error);
});

const app = express();
app.use(express.json());
app.use('/', orderRoutes);
app.use(errorHandler);

mongoose.connect(process.env.MONGO_URI)
    .then(() => app.listen(process.env.PORT || 4005,
        () => console.log(`[order-service] listening on ${process.env.PORT || 4005}`)))
    .catch(err => { console.error(err); process.exit(1); });
