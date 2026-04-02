const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    sellerId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    storeId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    category: { type: String, required: true },      // e.g. 'electronics/phones'
    price: { type: Number, required: true, min: 0 },  // in cents
    images: [String],                               // CDN URLs
    attributes: { type: Map, of: mongoose.Schema.Types.Mixed, default: {} },
    avgRating: { type: Number, default: 0, min: 0, max: 5 },
    status: { type: String, enum: ['active', 'paused', 'deleted'], default: 'active' },
}, { timestamps: true });

// Text index for full-text search on title + description
productSchema.index({ title: 'text', description: 'text' });
// Compound for category + price filter queries
productSchema.index({ category: 1, price: 1 });

module.exports = mongoose.model('Product', productSchema);
