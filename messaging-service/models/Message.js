const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    threadId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    senderId: { type: mongoose.Schema.Types.ObjectId, required: true },
    recipientId: { type: mongoose.Schema.Types.ObjectId, required: true },
    productId: { type: mongoose.Schema.Types.ObjectId, default: null },  // context
    orderId: { type: mongoose.Schema.Types.ObjectId, default: null },   // context
    body: { type: String, required: true, maxlength: 2000 },
    readAt: { type: Date, default: null },  // null until recipient opens thread
}, { timestamps: true });

// Compound index for thread message retrieval
messageSchema.index({ threadId: 1, createdAt: 1 });

// Thread metadata model — one per buyer-seller-product combination
const threadSchema = new mongoose.Schema({
    buyerId: { type: mongoose.Schema.Types.ObjectId, required: true },
    sellerId: { type: mongoose.Schema.Types.ObjectId, required: true },
    productId: { type: mongoose.Schema.Types.ObjectId, default: null },
    orderId: { type: mongoose.Schema.Types.ObjectId, default: null },
    lastMessage: { type: String, default: '' },
    lastMessageAt: { type: Date, default: Date.now },
    unreadBuyer: { type: Number, default: 0 },
    unreadSeller: { type: Number, default: 0 },
}, { timestamps: true });

threadSchema.index({ buyerId: 1, sellerId: 1, productId: 1 }, { unique: true });

const Message = mongoose.model('Message', messageSchema);
const Thread = mongoose.model('Thread', threadSchema);

module.exports = { Message, Thread };