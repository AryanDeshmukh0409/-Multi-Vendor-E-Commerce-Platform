const Product = require('../models/Product');
const ApiError = require('../../shared/utils/apiError');
const eventBus = require('../../shared/events/eventBus');

// ── POST /catalog/products ───────────────────
async function createProduct(req, res, next) {
    try {
        const sellerId = req.user.sub;
        const storeId = req.user.storeId;
        if (!storeId) throw ApiError.forbidden('Register a store before listing products');

        const { title, description, category, price, images, attributes } = req.body;
        if (!title || !category || price == null)
            throw ApiError.badRequest('title, category, and price are required');

        const product = await Product.create({
            sellerId, storeId, title, description, category,
            price, images, attributes,
        });

        // Inventory service subscribes to this event and creates a stock record
        eventBus.publish('product.created', {
            productId: product._id.toString(),
            sellerId,
            storeId: storeId.toString(),
        });

        res.status(201).json({ success: true, product });
    } catch (err) { next(err); }
}

// ── GET /catalog/products ────────────────────
// Public. Supports: ?category=&minPrice=&maxPrice=&status=&page=&limit=
async function listProducts(req, res, next) {
    try {
        const { category, minPrice, maxPrice, status = 'active', page = 1, limit = 20, sellerId } = req.query;
        const filter = { status };

        if (category) filter.category = { $regex: `^${category}`, $options: 'i' };
        if (minPrice || maxPrice) filter.price = {};
        if (minPrice) filter.price.$gte = Number(minPrice);
        if (maxPrice) filter.price.$lte = Number(maxPrice);
        if (sellerId) filter.sellerId = sellerId;

        const [products, total] = await Promise.all([
            Product.find(filter)
                .skip((page - 1) * limit)
                .limit(Number(limit))
                .sort('-createdAt'),
            Product.countDocuments(filter),
        ]);

        res.json({ success: true, total, page: Number(page), products });
    } catch (err) { next(err); }
}

// ── GET /catalog/products/search ─────────────
// Full-text search using MongoDB text index
async function searchProducts(req, res, next) {
    try {
        const { q, category, minPrice, maxPrice, page = 1, limit = 20 } = req.query;
        if (!q) throw ApiError.badRequest('Query parameter q is required');

        const filter = { $text: { $search: q }, status: 'active' };
        if (category) filter.category = { $regex: `^${category}`, $options: 'i' };
        if (minPrice || maxPrice) filter.price = {};
        if (minPrice) filter.price.$gte = Number(minPrice);
        if (maxPrice) filter.price.$lte = Number(maxPrice);

        const [products, total] = await Promise.all([
            Product.find(filter, { score: { $meta: 'textScore' } })
                .sort({ score: { $meta: 'textScore' } })
                .skip((page - 1) * limit)
                .limit(Number(limit)),
            Product.countDocuments(filter),
        ]);

        res.json({ success: true, total, page: Number(page), products });
    } catch (err) { next(err); }
}

// ── GET /catalog/products/:id ─────────────────
async function getProduct(req, res, next) {
    try {
        const product = await Product.findOne({ _id: req.params.id, status: { $ne: 'deleted' } });
        if (!product) throw ApiError.notFound('Product not found');
        res.json({ success: true, product });
    } catch (err) { next(err); }
}

// ── PUT /catalog/products/:id ─────────────────
async function updateProduct(req, res, next) {
    try {
        const product = await Product.findOne({ _id: req.params.id });
        if (!product) throw ApiError.notFound('Product not found');

        // Ownership check: storeId claim must match
        if (product.storeId.toString() !== req.user.storeId?.toString())
            throw ApiError.forbidden('You do not own this product');

        const allowed = ['title', 'description', 'category', 'price', 'images', 'attributes', 'status'];
        allowed.forEach(k => { if (req.body[k] !== undefined) product[k] = req.body[k]; });
        await product.save();

        res.json({ success: true, product });
    } catch (err) { next(err); }
}

// ── DELETE /catalog/products/:id ─────────────
async function deleteProduct(req, res, next) {
    try {
        const product = await Product.findOne({ _id: req.params.id });
        if (!product) throw ApiError.notFound('Product not found');

        if (product.storeId.toString() !== req.user.storeId?.toString())
            throw ApiError.forbidden('You do not own this product');

        product.status = 'deleted';
        await product.save();

        res.json({ success: true, message: 'Product removed from catalog' });
    } catch (err) { next(err); }
}

// ── Internal: recompute avgRating ────────────
// Called by eventBus subscription on review.approved
async function updateAvgRating(productId, avgRating) {
    await Product.findByIdAndUpdate(productId, { $set: { avgRating } });
}

module.exports = { createProduct, listProducts, searchProducts, getProduct, updateProduct, deleteProduct, updateAvgRating };
