const Payment  = require('../models/Payment');
const ApiError = require('../../shared/utils/apiError');
const axios    = require('axios');
const crypto   = require('crypto');

const ORDER_SVC = process.env.ORDER_SVC_URL || 'http://localhost:4005';

// ── Helper ────────────────────────────────────
async function notify(method, url, data) {
  try {
    await axios({ method, url, data, timeout: 5000 });
  } catch (err) {
    console.error(`[payment] Failed to call ${url}:`, err.message);
  }
}

// ── POST /internal/create-escrow ──────────────
// Called by order-service when order is placed
async function createEscrow(req, res, next) {
  try {
    const { orderId, buyerId, items, totalAmount } = req.body;

    const existing = await Payment.findOne({ orderId });
    if (existing) return res.json({ success: true, payment: existing });

    const sellerMap = {};
    items.forEach(item => {
      const key = item.sellerId;
      if (!sellerMap[key]) sellerMap[key] = 0;
      sellerMap[key] += item.price * item.qty;
    });

    const sellers = Object.entries(sellerMap).map(([sellerId, amount]) => ({
      sellerId, amount, status: 'held',
    }));

    const payment = await Payment.create({
      orderId, buyerId, totalAmount,
      sellers, escrowStatus: 'pending',
    });

    res.status(201).json({ success: true, payment });
  } catch (err) { next(err); }
}

// ── POST /internal/refund ─────────────────────
// Called by order-service when order is cancelled
async function internalRefund(req, res, next) {
  try {
    const { orderId } = req.body;
    const payment = await Payment.findOne({ orderId });
    if (!payment) return res.json({ success: true, message: 'No payment to refund' });

    if (!['held','pending'].includes(payment.escrowStatus))
      return res.json({ success: true, message: 'Nothing to refund' });

    payment.escrowStatus = 'refunded';
    payment.refundedAt   = new Date();
    payment.sellers      = payment.sellers.map(s =>
      s.status === 'held' ? { ...s._doc, status: 'refunded' } : s
    );
    await payment.save();

    res.json({ success: true, payment });
  } catch (err) { next(err); }
}

// ── POST /internal/release-escrow ────────────
// Called by shipping-service when shipment is delivered
async function internalReleaseEscrow(req, res, next) {
  try {
    const { orderId, sellerId } = req.body;
    const payment = await Payment.findOne({ orderId });
    if (!payment) return res.json({ success: true, message: 'No payment found' });

    const slice = payment.sellers.find(s => s.sellerId.toString() === sellerId);
    if (!slice || slice.status !== 'held')
      return res.json({ success: true, message: 'Nothing to release' });

    slice.status     = 'released';
    slice.releasedAt = new Date();

    const allReleased = payment.sellers.every(s => s.status === 'released');
    payment.escrowStatus = allReleased ? 'fully_released' : 'partially_released';
    await payment.save();

    res.json({ success: true, payment });
  } catch (err) { next(err); }
}

// ── GET /payments/order/:orderId ──────────────
async function getPayment(req, res, next) {
  try {
    const payment = await Payment.findOne({ orderId: req.params.orderId });
    if (!payment) throw ApiError.notFound('Payment record not found');

    if (req.user.role === 'buyer' && payment.buyerId.toString() !== req.user.sub)
      throw ApiError.forbidden('Access denied');

    if (req.user.role === 'seller') {
      const slice = payment.sellers.find(s => s.sellerId.toString() === req.user.sub);
      if (!slice) throw ApiError.forbidden('Access denied');
      return res.json({ success: true, payment: { orderId: payment.orderId, escrow: slice } });
    }

    res.json({ success: true, payment });
  } catch (err) { next(err); }
}

// ── POST /payments/capture ────────────────────
async function capturePayment(req, res, next) {
  try {
    const { orderId, method = 'card' } = req.body;
    if (!orderId) throw ApiError.badRequest('orderId is required');

    let payment = await Payment.findOne({ orderId });

    if (!payment) {
      let order;
      try {
        const response = await axios.get(
          `${ORDER_SVC}/orders/${orderId}`,
          { headers: { Authorization: req.headers.authorization } }
        );
        order = response.data.order;
      } catch {
        throw ApiError.notFound('Order not found');
      }

      const sellerMap = {};
      order.items.forEach(item => {
        const key = item.sellerId;
        if (!sellerMap[key]) sellerMap[key] = 0;
        sellerMap[key] += item.price * item.qty;
      });

      const sellers = Object.entries(sellerMap).map(([sellerId, amount]) => ({
        sellerId, amount, status: 'held',
      }));

      payment = await Payment.create({
        orderId, buyerId: order.buyerId,
        totalAmount: order.totalAmount,
        sellers, escrowStatus: 'pending',
      });
    }

    if (payment.escrowStatus !== 'pending')
      throw ApiError.conflict('Payment already captured for this order');

    payment.transactionId = `txn_${crypto.randomBytes(8).toString('hex')}`;
    payment.escrowStatus  = 'held';
    payment.method        = method;
    payment.capturedAt    = new Date();
    payment.sellers       = payment.sellers.map(s => ({ ...s._doc, status: 'held' }));
    await payment.save();

    // Advance order to paid using internal endpoint
 await notify('patch', `${ORDER_SVC}/internal/orders/${orderId}/status`, {
  status: 'paid',
  note:   'Payment confirmed',
});
await notify('patch', `${ORDER_SVC}/internal/orders/${orderId}/status`, {
  status: 'processing',
  note:   'Order being processed',
});
    res.json({ success: true, payment });
  } catch (err) { next(err); }
}

// ── POST /payments/release ────────────────────
async function releaseEscrow(req, res, next) {
  try {
    const { orderId, sellerId } = req.body;
    if (!orderId || !sellerId) throw ApiError.badRequest('orderId and sellerId required');

    const payment = await Payment.findOne({ orderId });
    if (!payment) throw ApiError.notFound('Payment not found');

    const slice = payment.sellers.find(s => s.sellerId.toString() === sellerId);
    if (!slice)                    throw ApiError.notFound(`No escrow for seller ${sellerId}`);
    if (slice.status !== 'held')   throw ApiError.conflict(`Escrow already ${slice.status}`);

    slice.status     = 'released';
    slice.releasedAt = new Date();

    const allReleased = payment.sellers.every(s => s.status === 'released');
    payment.escrowStatus = allReleased ? 'fully_released' : 'partially_released';
    await payment.save();

    res.json({ success: true, payment });
  } catch (err) { next(err); }
}

// ── POST /payments/refund ─────────────────────
async function refundPayment(req, res, next) {
  try {
    const { orderId } = req.body;
    const payment = await Payment.findOne({ orderId });
    if (!payment) throw ApiError.notFound('Payment not found');

    if (!['held','partially_released'].includes(payment.escrowStatus))
      throw ApiError.conflict(`Cannot refund — escrow is ${payment.escrowStatus}`);

    payment.escrowStatus = 'refunded';
    payment.refundedAt   = new Date();
    payment.sellers      = payment.sellers.map(s =>
      s.status === 'held' ? { ...s._doc, status: 'refunded' } : s
    );
    await payment.save();

    res.json({ success: true, payment });
  } catch (err) { next(err); }
}

module.exports = {
  createEscrow, internalRefund, internalReleaseEscrow,
  getPayment, capturePayment, releaseEscrow, refundPayment,
};