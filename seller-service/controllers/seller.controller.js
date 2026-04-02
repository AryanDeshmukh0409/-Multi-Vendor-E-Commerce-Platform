const Store = require('../models/Store');
const ApiError = require('../../shared/utils/apiError');
const eventBus = require('../../shared/events/eventBus');

// ── POST /sellers/register ───────────────────
// Creates a store for the authenticated seller.
// The auth-service must update user.storeId after this call
// (in production, fire a seller.registered event and let auth-service handle it).
async function register(req, res, next) {
    try {
        const sellerId = req.user.sub;

        const exists = await Store.findOne({ sellerId });
        if (exists) throw ApiError.conflict('Store already registered for this seller');

        const { name, description, email, phone, address, logoUrl } = req.body;
        if (!name || !email) throw ApiError.badRequest('name and email are required');

        const store = await Store.create({ sellerId, name, description, email, phone, address, logoUrl });

        eventBus.publish('seller.registered', { sellerId, storeId: store._id.toString() });

        res.status(201).json({ success: true, store });
    } catch (err) { next(err); }
}

// ── GET /sellers/me ──────────────────────────
async function getMyStore(req, res, next) {
    try {
        const store = await Store.findOne({ sellerId: req.user.sub });
        if (!store) throw ApiError.notFound('Store not found');
        res.json({ success: true, store });
    } catch (err) { next(err); }
}

// ── PATCH /sellers/me ────────────────────────
async function updateMyStore(req, res, next) {
    try {
        const allowed = ['name', 'description', 'phone', 'address', 'logoUrl'];
        const updates = {};
        allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });

        const store = await Store.findOneAndUpdate(
            { sellerId: req.user.sub },
            { $set: updates },
            { new: true, runValidators: true }
        );
        if (!store) throw ApiError.notFound('Store not found');

        res.json({ success: true, store });
    } catch (err) { next(err); }
}

// ── GET /sellers/:storeId ────────────────────
// Public — buyers can view seller storefronts
async function getStore(req, res, next) {
    try {
        const store = await Store.findById(req.params.storeId).select('-totalRevenue');
        if (!store || !store.isActive) throw ApiError.notFound('Store not found');
        res.json({ success: true, store });
    } catch (err) { next(err); }
}

// ── GET /sellers  (admin only) ───────────────
async function listStores(req, res, next) {
    try {
        const { page = 1, limit = 20, active } = req.query;
        const filter = {};
        if (active !== undefined) filter.isActive = active === 'true';

        const [stores, total] = await Promise.all([
            Store.find(filter).skip((page - 1) * limit).limit(Number(limit)).sort('-createdAt'),
            Store.countDocuments(filter),
        ]);
        res.json({ success: true, total, page: Number(page), stores });
    } catch (err) { next(err); }
}

// ── Dashboard stats ──────────────────────────
async function dashboard(req, res, next) {
    try {
        const store = await Store.findOne({ sellerId: req.user.sub });
        if (!store) throw ApiError.notFound('Store not found');
        res.json({
            success: true,
            stats: {
                totalRevenue: store.totalRevenue,
                totalOrders: store.totalOrders,
                storeName: store.name,
                isActive: store.isActive,
            },
        });
    } catch (err) { next(err); }
}

module.exports = { register, getMyStore, updateMyStore, getStore, listStores, dashboard };
