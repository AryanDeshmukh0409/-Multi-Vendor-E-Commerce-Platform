const Inventory = require('../models/Inventory');
const ApiError = require('../../shared/utils/apiError');
const eventBus = require('../../shared/events/eventBus');

// ── GET /inventory/:productId ─────────────────
async function getStock(req, res, next) {
    try {
        const inv = await Inventory.findOne({ productId: req.params.productId });
        if (!inv) throw ApiError.notFound('Inventory record not found');

        // Sellers can only see their own stock
        if (req.user.role === 'seller' && inv.storeId.toString() !== req.user.storeId?.toString())
            throw ApiError.forbidden('Access denied');

        res.json({ success: true, inventory: inv });
    } catch (err) { next(err); }
}

// ── PATCH /inventory/:productId ───────────────
// Seller sets absolute quantity (e.g. restocking)
async function setStock(req, res, next) {
    try {
        const { quantity, lowStockThreshold } = req.body;
        const inv = await Inventory.findOne({ productId: req.params.productId });
        if (!inv) throw ApiError.notFound('Inventory record not found');

        if (inv.storeId.toString() !== req.user.storeId?.toString())
            throw ApiError.forbidden('You do not own this product');

        if (quantity !== undefined) inv.quantity = quantity;
        if (lowStockThreshold !== undefined) inv.lowStockThreshold = lowStockThreshold;
        inv.updatedAt = new Date();
        await inv.save();

        _checkLowStock(inv);
        res.json({ success: true, inventory: inv });
    } catch (err) { next(err); }
}

// ── POST /inventory/:productId/reserve ────────
// Called by Order service (internally) on order.placed
async function reserve(req, res, next) {
    try {
        const { qty } = req.body;
        if (!qty || qty < 1) throw ApiError.badRequest('qty must be >= 1');

        // Atomic update: only succeeds if enough available stock
        const inv = await Inventory.findOneAndUpdate(
            {
                productId: req.params.productId,
                $expr: { $gte: [{ $subtract: ['$quantity', '$reserved'] }, qty] },
            },
            { $inc: { reserved: qty }, $set: { updatedAt: new Date() } },
            { new: true }
        );

        if (!inv) throw ApiError.conflict('Insufficient stock');

        _checkLowStock(inv);
        res.json({ success: true, inventory: inv });
    } catch (err) { next(err); }
}

// ── POST /inventory/:productId/release ────────
// Called on order.cancelled — returns reserved units to available
async function release(req, res, next) {
    try {
        const { qty } = req.body;
        if (!qty || qty < 1) throw ApiError.badRequest('qty must be >= 1');

        const inv = await Inventory.findOneAndUpdate(
            { productId: req.params.productId },
            { $inc: { reserved: -qty }, $set: { updatedAt: new Date() } },
            { new: true }
        );
        if (!inv) throw ApiError.notFound('Inventory record not found');

        res.json({ success: true, inventory: inv });
    } catch (err) { next(err); }
}

// ── POST /inventory/:productId/deduct ─────────
// Called on shipment.delivered — permanently removes reserved units
async function deduct(req, res, next) {
    try {
        const { qty } = req.body;
        const inv = await Inventory.findOneAndUpdate(
            { productId: req.params.productId },
            { $inc: { quantity: -qty, reserved: -qty }, $set: { updatedAt: new Date() } },
            { new: true }
        );
        if (!inv) throw ApiError.notFound('Inventory record not found');

        res.json({ success: true, inventory: inv });
    } catch (err) { next(err); }
}

// ── GET /inventory (seller dashboard) ─────────
async function listMyInventory(req, res, next) {
    try {
        const storeId = req.user.storeId;
        if (!storeId) throw ApiError.forbidden('No store associated with this account');

        const items = await Inventory.find({ storeId }).sort('-updatedAt');
        res.json({ success: true, count: items.length, items });
    } catch (err) { next(err); }
}

// ── Internal helper ───────────────────────────
function _checkLowStock(inv) {
    if (inv.quantity <= inv.lowStockThreshold) {
        eventBus.publish('inventory.stock_low', {
            productId: inv.productId.toString(),
            sellerId: inv.sellerId.toString(),
            quantity: inv.quantity,
        });
    }
}

module.exports = { getStock, setStock, reserve, release, deduct, listMyInventory };
