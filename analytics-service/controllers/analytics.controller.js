const { OrderSummary, AnalyticsEvent } = require('../models/AnalyticsEvent');
const ApiError = require('../../shared/utils/apiError');

// ── GET /analytics/revenue ────────────────────
// Daily GMV for a date range — admin only
async function revenueByDay(req, res, next) {
    try {
        const { from, to } = req.query;
        const match = {};
        if (from || to) {
            match.placedAt = {};
            if (from) match.placedAt.$gte = new Date(from);
            if (to) match.placedAt.$lte = new Date(to);
        }

        const data = await OrderSummary.aggregate([
            { $match: match },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$placedAt' } },
                    gmv: { $sum: '$totalAmount' },
                    orderCount: { $sum: 1 },
                    avgOrder: { $avg: '$totalAmount' },
                },
            },
            { $sort: { _id: 1 } },
        ]);

        res.json({ success: true, data });
    } catch (err) { next(err); }
}

// ── GET /analytics/top-products ───────────────
// Top products by revenue — admin only
async function topProducts(req, res, next) {
    try {
        const { limit = 10, from, to } = req.query;
        const match = {};
        if (from || to) {
            match.placedAt = {};
            if (from) match.placedAt.$gte = new Date(from);
            if (to) match.placedAt.$lte = new Date(to);
        }

        // Pull raw order.placed events for product-level breakdown
        const events = await AnalyticsEvent.find({
            event: 'order.placed',
            ...(Object.keys(match).length && { timestamp: match.placedAt }),
        }).lean();

        // Aggregate product revenue from event payloads
        const productMap = {};
        events.forEach(({ payload }) => {
            (payload.items || []).forEach(item => {
                const id = item.productId;
                if (!productMap[id]) productMap[id] = { productId: id, revenue: 0, unitsSold: 0 };
                productMap[id].revenue += item.price * item.qty;
                productMap[id].unitsSold += item.qty;
            });
        });

        const sorted = Object.values(productMap)
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, Number(limit));

        res.json({ success: true, data: sorted });
    } catch (err) { next(err); }
}

// ── GET /analytics/top-sellers ────────────────
// Top sellers by revenue — admin only
async function topSellers(req, res, next) {
    try {
        const { limit = 10, from, to } = req.query;
        const match = {};
        if (from || to) {
            match.placedAt = {};
            if (from) match.placedAt.$gte = new Date(from);
            if (to) match.placedAt.$lte = new Date(to);
        }

        const data = await OrderSummary.aggregate([
            { $match: match },
            { $unwind: '$sellers' },
            {
                $group: {
                    _id: '$sellers',
                    orderCount: { $sum: 1 },
                },
            },
            { $sort: { orderCount: -1 } },
            { $limit: Number(limit) },
            { $project: { sellerId: '$_id', orderCount: 1, _id: 0 } },
        ]);

        res.json({ success: true, data });
    } catch (err) { next(err); }
}

// ── GET /analytics/orders-by-category ─────────
async function ordersByCategory(req, res, next) {
    try {
        const { from, to } = req.query;

        const events = await AnalyticsEvent.find({
            event: 'order.placed',
        }).lean();

        const catMap = {};
        events.forEach(({ payload }) => {
            (payload.items || []).forEach(item => {
                const cat = item.category || 'unknown';
                if (!catMap[cat]) catMap[cat] = { category: cat, revenue: 0, orders: 0 };
                catMap[cat].revenue += item.price * item.qty;
                catMap[cat].orders += 1;
            });
        });

        const data = Object.values(catMap).sort((a, b) => b.revenue - a.revenue);
        res.json({ success: true, data });
    } catch (err) { next(err); }
}

// ── GET /analytics/seller/me ──────────────────
// Seller sees only their own store stats
async function sellerStats(req, res, next) {
    try {
        const sellerId = req.user.sub;

        const data = await OrderSummary.aggregate([
            { $match: { sellers: sellerId } },
            {
                $group: {
                    _id: null,
                    totalOrders: { $sum: 1 },
                    totalRevenue: { $sum: '$totalAmount' },
                    avgOrderValue: { $avg: '$totalAmount' },
                },
            },
        ]);

        const daily = await OrderSummary.aggregate([
            { $match: { sellers: sellerId } },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$placedAt' } },
                    revenue: { $sum: '$totalAmount' },
                    orderCount: { $sum: 1 },
                },
            },
            { $sort: { _id: -1 } },
            { $limit: 30 },
        ]);

        res.json({
            success: true,
            summary: data[0] || { totalOrders: 0, totalRevenue: 0, avgOrderValue: 0 },
            daily,
        });
    } catch (err) { next(err); }
}

module.exports = { revenueByDay, topProducts, topSellers, ordersByCategory, sellerStats };