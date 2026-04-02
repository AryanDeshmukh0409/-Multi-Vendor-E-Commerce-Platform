const axios    = require('axios');
const Order    = require('../models/Order');
const ApiError = require('../../shared/utils/apiError');

const PAYMENT_SVC   = process.env.PAYMENT_SVC_URL   || 'http://localhost:4006';
const INVENTORY_SVC = process.env.INVENTORY_SVC_URL || 'http://localhost:4004';

// ── Helper: fire-and-forget HTTP call ─────────
// We don't want downstream failures to break the order response
async function notify(method, url, data) {
  try {
    await axios({ method, url, data, timeout: 5000 });
  } catch (err) {
    console.error(`[order] Failed to call ${url}:`, err.message);
  }
}

// ── POST /orders ──────────────────────────────
async function createOrder(req, res, next) {
  try {
    const buyerId = req.user.sub;
    const { items, shippingAddress } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0)
      throw ApiError.badRequest('items array is required');
    if (!shippingAddress?.street || !shippingAddress?.city ||
        !shippingAddress?.zip   || !shippingAddress?.country)
      throw ApiError.badRequest('Full shippingAddress is required');

    for (const item of items) {
      if (!item.productId || !item.sellerId || !item.title || !item.price || !item.qty)
        throw ApiError.badRequest('Each item needs productId, sellerId, title, price, qty');
      if (item.qty < 1)   throw ApiError.badRequest('qty must be >= 1');
      if (item.price < 0) throw ApiError.badRequest('price must be >= 0');
    }

    const totalAmount = items.reduce((sum, i) => sum + i.price * i.qty, 0);

    const order = await Order.create({
      buyerId,
      items,
      shippingAddress,
      totalAmount,
      timeline: [{ status: 'pending', note: 'Order created' }],
    });

    const payload = {
      orderId:  order._id.toString(),
      buyerId,
      items:    order.items.map(i => ({
        productId: i.productId.toString(),
        sellerId:  i.sellerId.toString(),
        qty:       i.qty,
        price:     i.price,
      })),
      totalAmount,
      shippingAddress,
    };

    // ── Directly call payment-service to create escrow ──
    await notify('post', `${PAYMENT_SVC}/internal/create-escrow`, payload);

    // ── Directly call inventory-service to reserve stock ──
    for (const item of payload.items) {
      await notify('post', `${INVENTORY_SVC}/internal/reserve`, {
        productId: item.productId,
        qty:       item.qty,
      });
    }

    res.status(201).json({ success: true, order });
  } catch (err) { next(err); }
}

// ── GET /orders ───────────────────────────────
async function listOrders(req, res, next) {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const filter = {};

    if (req.user.role === 'buyer') {
      filter.buyerId = req.user.sub;
    } else if (req.user.role === 'seller') {
      filter['items.sellerId'] = req.user.sub;
    }

    if (status) filter.status = status;

    const [orders, total] = await Promise.all([
      Order.find(filter).skip((page - 1) * limit).limit(Number(limit)).sort('-createdAt'),
      Order.countDocuments(filter),
    ]);

    res.json({ success: true, total, page: Number(page), orders });
  } catch (err) { next(err); }
}

// ── GET /orders/:id ───────────────────────────
async function getOrder(req, res, next) {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) throw ApiError.notFound('Order not found');

    if (req.user.role === 'buyer' && order.buyerId.toString() !== req.user.sub)
      throw ApiError.forbidden('Access denied');
    if (req.user.role === 'seller') {
      const hasSellersItem = order.items.some(i => i.sellerId.toString() === req.user.sub);
      if (!hasSellersItem) throw ApiError.forbidden('Access denied');
    }

    res.json({ success: true, order });
  } catch (err) { next(err); }
}

// ── PATCH /orders/:id/cancel ──────────────────
async function cancelOrder(req, res, next) {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) throw ApiError.notFound('Order not found');

    if (order.buyerId.toString() !== req.user.sub && req.user.role !== 'admin')
      throw ApiError.forbidden('Access denied');

    order.transition('cancelled', req.body.reason || 'Cancelled by buyer');
    await order.save();

    // Notify payment-service to refund
    await notify('post', `${PAYMENT_SVC}/internal/refund`, {
      orderId: order._id.toString(),
      buyerId: order.buyerId.toString(),
    });

    // Notify inventory-service to release stock
    for (const item of order.items) {
      await notify('post', `${INVENTORY_SVC}/internal/release`, {
        productId: item.productId.toString(),
        qty:       item.qty,
      });
    }

    res.json({ success: true, order });
  } catch (err) { next(err); }
}

// ── PATCH /orders/:id/status ──────────────────
async function updateStatus(req, res, next) {
  try {
    const { status, note } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) throw ApiError.notFound('Order not found');

    order.transition(status, note);
    await order.save();

    res.json({ success: true, order });
  } catch (err) { next(err); }
}

module.exports = { createOrder, listOrders, getOrder, cancelOrder, updateStatus };