const { Message, Thread } = require('../models/Message');
const ApiError = require('../../shared/utils/apiError');

// ── POST /messages/thread ─────────────────────
// Get or create a thread between buyer and seller for a product
async function getOrCreateThread(req, res, next) {
    try {
        const { sellerId, productId, orderId } = req.body;
        const buyerId = req.user.role === 'buyer' ? req.user.sub : null;

        if (!sellerId) throw ApiError.badRequest('sellerId is required');
        if (!buyerId) throw ApiError.badRequest('Only buyers can initiate threads');

        let thread = await Thread.findOne({ buyerId, sellerId, productId: productId || null });

        if (!thread) {
            thread = await Thread.create({ buyerId, sellerId, productId: productId || null, orderId: orderId || null });
        }

        res.json({ success: true, thread });
    } catch (err) { next(err); }
}

// ── GET /messages/threads ─────────────────────
// List all threads for the current user
async function listThreads(req, res, next) {
    try {
        const userId = req.user.sub;
        const filter = req.user.role === 'buyer'
            ? { buyerId: userId }
            : { sellerId: userId };

        const threads = await Thread.find(filter).sort('-lastMessageAt');
        res.json({ success: true, threads });
    } catch (err) { next(err); }
}

// ── GET /messages/thread/:threadId ────────────
// Get all messages in a thread + mark as read
async function getThread(req, res, next) {
    try {
        const { threadId } = req.params;
        const userId = req.user.sub;
        const { page = 1, limit = 50 } = req.query;

        const thread = await Thread.findById(threadId);
        if (!thread) throw ApiError.notFound('Thread not found');

        // Access check
        const isBuyer = thread.buyerId.toString() === userId;
        const isSeller = thread.sellerId.toString() === userId;
        if (!isBuyer && !isSeller) throw ApiError.forbidden('Access denied');

        const [messages, total] = await Promise.all([
            Message.find({ threadId })
                .skip((page - 1) * limit)
                .limit(Number(limit))
                .sort('createdAt'),
            Message.countDocuments({ threadId }),
        ]);

        // Mark unread messages sent to this user as read
        const now = new Date();
        await Message.updateMany(
            { threadId, recipientId: userId, readAt: null },
            { $set: { readAt: now } }
        );

        // Reset unread counter
        if (isBuyer) thread.unreadBuyer = 0;
        if (isSeller) thread.unreadSeller = 0;
        await thread.save();

        res.json({ success: true, total, page: Number(page), thread, messages });
    } catch (err) { next(err); }
}

// ── POST /messages ────────────────────────────
// Send a message in a thread (REST fallback — WS is primary)
async function sendMessage(req, res, next) {
    try {
        const senderId = req.user.sub;
        const { threadId, body } = req.body;

        if (!threadId || !body) throw ApiError.badRequest('threadId and body are required');

        const thread = await Thread.findById(threadId);
        if (!thread) throw ApiError.notFound('Thread not found');

        const isBuyer = thread.buyerId.toString() === senderId;
        const isSeller = thread.sellerId.toString() === senderId;
        if (!isBuyer && !isSeller) throw ApiError.forbidden('Access denied');

        const recipientId = isBuyer ? thread.sellerId : thread.buyerId;

        const message = await Message.create({
            threadId,
            senderId,
            recipientId,
            productId: thread.productId,
            orderId: thread.orderId,
            body,
        });

        // Update thread metadata
        thread.lastMessage = body.slice(0, 100);
        thread.lastMessageAt = new Date();
        if (isBuyer) thread.unreadSeller += 1;
        if (isSeller) thread.unreadBuyer += 1;
        await thread.save();

        res.status(201).json({ success: true, message });
    } catch (err) { next(err); }
}

module.exports = { getOrCreateThread, listThreads, getThread, sendMessage };