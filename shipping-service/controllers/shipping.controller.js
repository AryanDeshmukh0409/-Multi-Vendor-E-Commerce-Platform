const axios    = require('axios');
const Shipment = require('../models/Shipment');
const ApiError = require('../../shared/utils/apiError');

const ORDER_SVC   = process.env.ORDER_SVC_URL   || 'http://localhost:4005';
const PAYMENT_SVC = process.env.PAYMENT_SVC_URL || 'http://localhost:4006';

// ── Helper ────────────────────────────────────
async function notify(method, url, data) {
  try {
    await axios({ method, url, data, timeout: 5000 });
  } catch (err) {
    console.error(`[shipping] Failed to call ${url}:`, err.message);
  }
}

// ── POST / ────────────────────────────────────
async function createShipment(req, res, next) {
  try {
    const sellerId = req.user.sub;
    const { orderId, carrier, trackingNumber, estimatedDelivery } = req.body;

    if (!orderId || !carrier || !trackingNumber)
      throw ApiError.badRequest('orderId, carrier, and trackingNumber are required');

    const exists = await Shipment.findOne({ orderId, sellerId });
    if (exists) throw ApiError.conflict('Shipment already created for this order/seller');

    const shipment = await Shipment.create({
      orderId, sellerId, carrier, trackingNumber,
      estimatedDelivery: estimatedDelivery || null,
      timeline: [{ status: 'created', timestamp: new Date() }],
    });

    // Advance order to shipped
    await notify('patch', `${ORDER_SVC}/internal/orders/${orderId}/status`, {
      status: 'processing',
      note:   'Order being processed',
    });
    await notify('patch', `${ORDER_SVC}/internal/orders/${orderId}/status`, {
      status: 'shipped',
      note:   `Tracking: ${trackingNumber}`,
    });

    res.status(201).json({ success: true, shipment });
  } catch (err) { next(err); }
}

// ── GET /order/:orderId ───────────────────────
async function getShipmentsByOrder(req, res, next) {
  try {
    const shipments = await Shipment.find({ orderId: req.params.orderId });
    res.json({ success: true, shipments });
  } catch (err) { next(err); }
}

// ── GET /:id ──────────────────────────────────
async function getShipment(req, res, next) {
  try {
    const shipment = await Shipment.findById(req.params.id);
    if (!shipment) throw ApiError.notFound('Shipment not found');
    res.json({ success: true, shipment });
  } catch (err) { next(err); }
}

// ── GET /my ───────────────────────────────────
async function getMyShipments(req, res, next) {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const filter = { sellerId: req.user.sub };
    if (status) filter.status = status;

    const [shipments, total] = await Promise.all([
      Shipment.find(filter).skip((page - 1) * limit).limit(Number(limit)).sort('-createdAt'),
      Shipment.countDocuments(filter),
    ]);
    res.json({ success: true, total, page: Number(page), shipments });
  } catch (err) { next(err); }
}

// ── POST /webhook ─────────────────────────────
async function carrierWebhook(req, res, next) {
  try {
    const { trackingNumber, status, location, timestamp } = req.body;
    if (!trackingNumber || !status)
      throw ApiError.badRequest('trackingNumber and status are required');

    const validStatuses = ['created','in_transit','out_for_delivery','delivered','failed'];
    if (!validStatuses.includes(status))
      throw ApiError.badRequest(`Invalid status: ${status}`);

    const shipment = await Shipment.findOne({ trackingNumber });
    if (!shipment) throw ApiError.notFound('Shipment not found for this tracking number');

    shipment.status    = status;
    shipment.updatedAt = new Date();
    shipment.timeline.push({ status, timestamp: timestamp || new Date(), location: location || '' });
    await shipment.save();

    if (status === 'delivered') {
      const orderId  = shipment.orderId.toString();
      const sellerId = shipment.sellerId.toString();

      // 1. Release escrow for this seller
      await notify('post', `${PAYMENT_SVC}/internal/release-escrow`, { orderId, sellerId });

      // 2. Advance order to delivered
      await notify('patch', `${ORDER_SVC}/orders/${orderId}/status`, {
        status: 'delivered',
        note:   'Delivered by carrier',
      });
    }

    res.json({ success: true, shipment });
  } catch (err) { next(err); }
}

module.exports = { createShipment, getShipmentsByOrder, getShipment, getMyShipments, carrierWebhook };