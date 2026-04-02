const eventBus = require('../shared/events/eventBus');
const notif = require('./controllers/notification.controller');
require('dotenv').config();

// In a real system we'd fetch user emails from auth-service.
// Here we use placeholder emails from the event payload where available,
// or log the intent so the pattern is clear.

const BUYER_EMAIL = payload => payload.buyerEmail || 'buyer@example.com';
const SELLER_EMAIL = payload => payload.sellerEmail || 'seller@example.com';

// ── order.placed → confirm to buyer ──
eventBus.subscribe('order.placed', ({ payload }) => {
    const tpl = notif.orderConfirmed(payload);
    notif.send({ to: BUYER_EMAIL(payload), ...tpl });
});

// ── payment.captured → alert seller ──
eventBus.subscribe('payment.captured', ({ payload }) => {
    (payload.sellers || []).forEach(s => {
        const tpl = notif.paymentCaptured({ ...payload, sellerId: s.sellerId });
        notif.send({ to: SELLER_EMAIL(s), ...tpl });
    });
});

// ── shipment.created → notify buyer with tracking ──
eventBus.subscribe('shipment.created', ({ payload }) => {
    const tpl = notif.orderShipped(payload);
    notif.send({ to: BUYER_EMAIL(payload), ...tpl });
});

// ── order.delivered → prompt buyer to review ──
eventBus.subscribe('order.delivered', ({ payload }) => {
    const tpl = notif.orderDelivered(payload);
    notif.send({ to: BUYER_EMAIL(payload), ...tpl });
});

// ── escrow.released → notify seller of payout ──
eventBus.subscribe('escrow.released', ({ payload }) => {
    const tpl = notif.escrowReleased(payload);
    notif.send({ to: SELLER_EMAIL(payload), ...tpl });
});

// ── inventory.stock_low → alert seller ──
eventBus.subscribe('inventory.stock_low', ({ payload }) => {
    const tpl = notif.lowStock(payload);
    notif.send({ to: SELLER_EMAIL(payload), ...tpl });
});

// ── payment.refunded → notify buyer ──
eventBus.subscribe('payment.refunded', ({ payload }) => {
    const tpl = notif.paymentRefunded(payload);
    notif.send({ to: BUYER_EMAIL(payload), ...tpl });
});

console.log('[notification-service] listening for events...');
