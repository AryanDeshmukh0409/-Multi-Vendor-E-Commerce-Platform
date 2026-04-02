const mongoose = require('mongoose');
const ApiError = require('../../shared/utils/apiError');

// Search service uses the catalog-db directly (read-only replica in prod)
// It connects to the same MongoDB but its own read model for search
const productSearchSchema = new mongoose.Schema({
    sellerId: mongoose.Schema.Types.ObjectId,
    storeId: mongoose.Schema.Types.ObjectId,
    title: String,
    description: String,
    category: String,
    price: Number,
    avgRating: Number,
    status: String,
}, { timestamps: true });

productSearchSchema.index({ title: 'text', description: 'text' });
productSearchSchema.index({ category: 1, price: 1, avgRating: -1 });

// Reuse existing model if already registered (hot reload safe)
const Product = mongoose.models.Product ||
    mongoose.model('Product', productSearchSchema);

// ── GET /search?q=&category=&minPrice=&maxPrice=&minRating=&sort=&page=&limit= ──
async function search(req, res, next) {
    try {
        const {
            q,
            category,
            minPrice, maxPrice,
            minRating,
            sort = 'relevance',
            page = 1,
            limit = 20,
        } = req.query;

        if (!q && !category)
            throw ApiError.badRequest('Provide at least q (search term) or category');

        const filter = { status: 'active' };

        // Full-text search
        if (q) filter.$text = { $search: q };

        // Category prefix match — supports hierarchical e.g. 'electronics/phones'
        if (category) filter.category = { $regex: `^${category}`, $options: 'i' };

        // Price range
        if (minPrice || maxPrice) {
            filter.price = {};
            if (minPrice) filter.price.$gte = Number(minPrice);
            if (maxPrice) filter.price.$lte = Number(maxPrice);
        }

        // Rating filter
        if (minRating) filter.avgRating = { $gte: Number(minRating) };

        // Sort options
        let sortObj = {};
        switch (sort) {
            case 'relevance':
                sortObj = q ? { score: { $meta: 'textScore' } } : { avgRating: -1 };
                break;
            case 'price_asc': sortObj = { price: 1 }; break;
            case 'price_desc': sortObj = { price: -1 }; break;
            case 'rating': sortObj = { avgRating: -1 }; break;
            case 'newest': sortObj = { createdAt: -1 }; break;
            default: sortObj = { createdAt: -1 };
        }

        const projection = q ? { score: { $meta: 'textScore' } } : {};

        const [products, total] = await Promise.all([
            Product.find(filter, projection)
                .sort(sortObj)
                .skip((page - 1) * limit)
                .limit(Number(limit)),
            Product.countDocuments(filter),
        ]);

        // Facets — category breakdown for sidebar filters
        const facets = await Product.aggregate([
            { $match: filter },
            {
                $facet: {
                    byCategory: [
                        { $group: { _id: '$category', count: { $sum: 1 } } },
                        { $sort: { count: -1 } },
                        { $limit: 10 },
                    ],
                    priceRange: [
                        { $group: { _id: null, min: { $min: '$price' }, max: { $max: '$price' } } },
                    ],
                    avgRatingDist: [
                        { $group: { _id: { $floor: '$avgRating' }, count: { $sum: 1 } } },
                        { $sort: { _id: -1 } },
                    ],
                },
            },
        ]);

        res.json({
            success: true,
            total,
            page: Number(page),
            limit: Number(limit),
            products,
            facets: facets[0],
        });
    } catch (err) { next(err); }
}

// ── GET /search/suggest?q= ────────────────────
// Lightweight autocomplete — returns matching titles only
async function suggest(req, res, next) {
    try {
        const { q } = req.query;
        if (!q || q.length < 2) return res.json({ success: true, suggestions: [] });

        const products = await Product.find(
            { title: { $regex: q, $options: 'i' }, status: 'active' },
            { title: 1, category: 1, price: 1 }
        ).limit(8).sort('-avgRating');

        const suggestions = products.map(p => ({
            id: p._id,
            title: p.title,
            category: p.category,
            price: p.price,
        }));

        res.json({ success: true, suggestions });
    } catch (err) { next(err); }
}

module.exports = { search, suggest };