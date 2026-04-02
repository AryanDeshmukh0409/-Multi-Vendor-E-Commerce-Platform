const mongoose = require('mongoose');

// One Payment document per parent order.
// escrow.sellers[] tracks each seller's portion and payout status.

const sellerEscrowSchema = new mongoose.Schema({
    sellerId: { type: mongoose.Schema.Types.ObjectId, required: true },
    amount: { type: Number, required: true },   // seller's cut in cents
    status: { type: String, enum: ['held', 'released', 'refunded'], default: 'held' },
    releasedAt: { type: Date, default: null },
}, { _id: false });

const paymentSchema = new mongoose.Schema({
    orderId: { type: mongoose.Schema.Types.ObjectId, required: true, unique: true, index: true },
    buyerId: { type: mongoose.Schema.Types.ObjectId, required: true },
    totalAmount: { type: Number, required: true },   // in cents

    // Escrow state
    escrowStatus: {
        type: String,
        enum: ['pending', 'held', 'partially_released', 'fully_released', 'refunded'],
        default: 'pending',
    },
    sellers: [sellerEscrowSchema],   // one entry per unique seller in the order

    // Mock payment method info (no real gateway in dev)
    method: { type: String, enum: ['card', 'wallet', 'cod'], default: 'card' },
    transactionId: { type: String, default: null },  // mock gateway tx ref

    capturedAt: { type: Date, default: null },
    refundedAt: { type: Date, default: null },
}, { timestamps: true });

module.exports = mongoose.model('Payment', paymentSchema);