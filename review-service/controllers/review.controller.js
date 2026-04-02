const Review = require('../models/Review');
const ApiError = require('../../shared/utils/apiError');
const eventBus = require('../../shared/events/eventBus');
const axios = require('axios');

// ── POST /reviews ─────────────────────────────
// Buyer submits a review — verified purchase gate enforced here
async function createReview(req, res, next) {
    try {
        const buyerId = req.user.sub;
        const { productId, orderId, rating, body } = req.body;

        if (!productId || !orderId || !rating || !body)
            throw ApiError.badRequest('productId, orderId, rating, and body are required');

        // ── Verified purchase gate ──
        // Call order-service to confirm: order exists, belongs to buyer, is delivered, contains product
        let order;
        try {
            const res = await axios.get(
                `${process.env.ORDER_SVC_URL}/orders/${orderId}`,
                { headers: { Authorization: req.headers.authorization } }
            );
            order = res.data.order;
        } catch {
            throw ApiError.forbidden('Could not verify purchase — order not found or access denied');
        }

        if (order.buyerId !== buyerId)
            throw ApiError.forbidden('This order does not belong to you');
        if (order.status !== 'delivered')
            throw ApiError.forbidden('You can only review after the order is delivered');

        const hasProduct = order.items.some(i => i.productId === productId);
        if (!hasProduct)
            throw ApiError.forbidden('This product was not in your order');

        // ── Create review (starts as pending for moderation) ──
        const review = await Review.create({ productId, buyerId, orderId, rating, body });

        res.status(201).json({ success: true, review });
    } catch (err) { next(err); }
}

// ── GET /reviews/product/:productId ──────────
// Public — only approved reviews
async function getProductReviews(req, res, next) {
    try {
        const { page = 1, limit = 20 } = req.query;
        const filter = { productId: req.params.productId, status: 'approved' };

        const [reviews, total] = await Promise.all([
            Review.find(filter).skip((page - 1) * limit).limit(Number(limit)).sort('-createdAt'),
            Review.countDocuments(filter),
        ]);

        // Compute avg rating from approved reviews
        const avgResult = await Review.aggregate([
            { $match: filter },
            { $group: { _id: null, avg: { $avg: '$rating' } } },
        ]);
        const avgRating = avgResult[0]?.avg?.toFixed(1) || 0;

        res.json({ success: true, total, page: Number(page), avgRating, reviews });
    } catch (err) { next(err); }
}

// ── GET /reviews/my ───────────────────────────
// Buyer sees all their own reviews
async function getMyReviews(req, res, next) {
    try {
        const reviews = await Review.find({ buyerId: req.user.sub }).sort('-createdAt');
        res.json({ success: true, reviews });
    } catch (err) { next(err); }
}

// ── PATCH /reviews/:id/approve ────────────────
// Admin approves a pending review
async function approveReview(req, res, next) {
    try {
        const review = await Review.findById(req.params.id);
        if (!review) throw ApiError.notFound('Review not found');
        if (review.status !== 'pending')
            throw ApiError.conflict(`Review is already ${review.status}`);

        review.status = 'approved';
        await review.save();

        // Recompute avgRating for catalog service
        const avgResult = await Review.aggregate([
            { $match: { productId: review.productId, status: 'approved' } },
            { $group: { _id: null, avg: { $avg: '$rating' } } },
        ]);
        const newAvgRating = parseFloat(avgResult[0]?.avg?.toFixed(1) || 0);

        // Trigger catalog-service to update product.avgRating
        eventBus.publish('review.approved', {
            reviewId: review._id.toString(),
            productId: review.productId.toString(),
            newAvgRating,
        });

        res.json({ success: true, review, newAvgRating });
    } catch (err) { next(err); }
}

// ── PATCH /reviews/:id/flag ───────────────────
// Admin flags an inappropriate review
async function flagReview(req, res, next) {
    try {
        const review = await Review.findById(req.params.id);
        if (!review) throw ApiError.notFound('Review not found');

        review.status = 'flagged';
        await review.save();

        res.json({ success: true, review });
    } catch (err) { next(err); }
}

// ── GET /reviews/pending ──────────────────────
// Admin moderation queue
async function getPendingReviews(req, res, next) {
    try {
        const { page = 1, limit = 20 } = req.query;
        const [reviews, total] = await Promise.all([
            Review.find({ status: 'pending' }).skip((page - 1) * limit).limit(Number(limit)).sort('createdAt'),
            Review.countDocuments({ status: 'pending' }),
        ]);
        res.json({ success: true, total, page: Number(page), reviews });
    } catch (err) { next(err); }
}

module.exports = { createReview, getProductReviews, getMyReviews, approveReview, flagReview, getPendingReviews };