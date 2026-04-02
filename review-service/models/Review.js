const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
    productId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    buyerId: { type: mongoose.Schema.Types.ObjectId, required: true },
    orderId: { type: mongoose.Schema.Types.ObjectId, required: true }, // verified purchase gate
    rating: { type: Number, required: true, min: 1, max: 5 },
    body: { type: String, required: true, minlength: 10, maxlength: 2000 },
    status: { type: String, enum: ['pending', 'approved', 'flagged'], default: 'pending' },
}, { timestamps: true });

// One review per buyer per product
reviewSchema.index({ productId: 1, buyerId: 1 }, { unique: true });
reviewSchema.index({ orderId: 1 });

module.exports = mongoose.model('Review', reviewSchema);