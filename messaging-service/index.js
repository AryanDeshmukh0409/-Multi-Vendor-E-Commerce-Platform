const express = require('express');
const cors = require('cors');

const http = require('http');
const WebSocket = require('ws');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const messagingRoutes = require('./routes/messaging.routes');
const errorHandler = require('../shared/middleware/errorHandler');
const { Message, Thread } = require('./models/Message');

const app = express();
const server = http.createServer(app);

// ── WebSocket server ──────────────────────────
const wss = new WebSocket.Server({ server, path: '/ws' });

// Map: userId → WebSocket connection
const clients = new Map();

wss.on('connection', (ws, req) => {
    // Authenticate via ?token= query param
    const url = new URL(req.url, `http://localhost`);
    const token = url.searchParams.get('token');

    let user;
    try {
        user = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
        ws.close(1008, 'Invalid token');
        return;
    }

    clients.set(user.sub, ws);
    console.log(`[ws] connected: ${user.sub}`);

    ws.on('message', async (raw) => {
        try {
            const { type, payload } = JSON.parse(raw);

            if (type === 'send_message') {
                const { threadId, body } = payload;
                const thread = await Thread.findById(threadId);
                if (!thread) return;

                const isBuyer = thread.buyerId.toString() === user.sub;
                const isSeller = thread.sellerId.toString() === user.sub;
                if (!isBuyer && !isSeller) return;

                const recipientId = isBuyer
                    ? thread.sellerId.toString()
                    : thread.buyerId.toString();

                const message = await Message.create({
                    threadId,
                    senderId: user.sub,
                    recipientId,
                    productId: thread.productId,
                    orderId: thread.orderId,
                    body,
                });

                thread.lastMessage = body.slice(0, 100);
                thread.lastMessageAt = new Date();
                if (isBuyer) thread.unreadSeller += 1;
                if (isSeller) thread.unreadBuyer += 1;
                await thread.save();

                // Push to recipient if online
                const recipientWs = clients.get(recipientId);
                if (recipientWs && recipientWs.readyState === WebSocket.OPEN) {
                    recipientWs.send(JSON.stringify({ type: 'new_message', payload: message }));
                }

                // Echo back to sender with saved message
                ws.send(JSON.stringify({ type: 'message_sent', payload: message }));
            }
        } catch (err) {
            ws.send(JSON.stringify({ type: 'error', payload: err.message }));
        }
    });

    ws.on('close', () => {
        clients.delete(user.sub);
        console.log(`[ws] disconnected: ${user.sub}`);
    });
});

// ── REST ──────────────────────────────────────
app.use(express.json());
app.use(cors());
app.use('/messages', messagingRoutes);
app.use(errorHandler);

mongoose.connect(process.env.MONGO_URI)
    .then(() => server.listen(process.env.PORT || 4009,
        () => console.log(`[messaging-service] listening on ${process.env.PORT || 4009} (HTTP + WS)`)))
    .catch(err => { console.error(err); process.exit(1); });