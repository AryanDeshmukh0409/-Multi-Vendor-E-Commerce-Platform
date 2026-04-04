const express = require('express');
const cors = require('cors');

const mongoose = require('mongoose');
require('dotenv').config();

const paymentRoutes = require('./routes/payment.routes');
const errorHandler = require('../shared/middleware/errorHandler');
const eventBus = require('../shared/events/eventBus');
const Payment = require('./models/Payment');

// ── order.placed → create escrow record (held = false until buyer pays) ──
eventBus.subscribe('order.placed', ({ payload }) => {
    const { orderId, buyerId, items, totalAmount } = payload;

    // Group items by seller, sum each seller's portion
    const sellerMap = {};
    items.forEach(item => {
        const key = item.sellerId;
        if (!sellerMap[key]) sellerMap[key] = 0;
        sellerMap[key] += item.price * item.qty;
    });

    const sellers = Object.entries(sellerMap).map(([sellerId, amount]) => ({
        sellerId,
        amount,
        status: 'held',
    }));

    Payment.create({ orderId, buyerId, totalAmount, sellers, escrowStatus: 'pending' })
        .catch(err => console.error('[payment] Failed to create escrow record:', err));
});

// ── shipment.delivered → auto-release that seller's escrow ──
eventBus.subscribe('shipment.delivered', ({ payload }) => {
    const { orderId, sellerId } = payload;

    Payment.findOne({ orderId }).then(payment => {
        if (!payment) return;

        const slice = payment.sellers.find(s => s.sellerId.toString() === sellerId);
        if (!slice || slice.status !== 'held') return;

        slice.status = 'released';
        slice.releasedAt = new Date();

        const allReleased = payment.sellers.every(s => s.status === 'released');
        payment.escrowStatus = allReleased ? 'fully_released' : 'partially_released';

        return payment.save().then(() => {
            eventBus.publish('escrow.released', {
                orderId: orderId.toString(),
                sellerId: sellerId.toString(),
                amount: slice.amount,
            });
        });
    }).catch(console.error);
});

// ── order.cancelled → refund if payment was held ──
eventBus.subscribe('order.cancelled', ({ payload }) => {
    Payment.findOne({ orderId: payload.orderId }).then(payment => {
        if (!payment || !['held', 'pending'].includes(payment.escrowStatus)) return;

        payment.escrowStatus = 'refunded';
        payment.refundedAt = new Date();

        return payment.save().then(() => {
            eventBus.publish('payment.refunded', {
                orderId: payload.orderId,
                buyerId: payload.buyerId,
                amount: payment.totalAmount,
            });
        });
    }).catch(console.error);
});

const app = express();
app.use(express.json());
app.use(cors());
app.use('/', paymentRoutes);
app.use(errorHandler);

mongoose.connect(process.env.MONGO_URI)
    .then(() => app.listen(process.env.PORT || 4006,
        () => console.log(`[payment-service] listening on ${process.env.PORT || 4006}`)))
    .catch(err => { console.error(err); process.exit(1); });