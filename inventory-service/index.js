const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();

const inventoryRoutes = require('./routes/inventory.routes');
const errorHandler = require('../shared/middleware/errorHandler');
const eventBus = require('../shared/events/eventBus');
const Inventory = require('./models/Inventory');

// ── product.created → create stock record at 0 ──
eventBus.subscribe('product.created', ({ payload }) => {
    Inventory.create({
        productId: payload.productId,
        sellerId: payload.sellerId,
        storeId: payload.storeId,
        quantity: 0,
        reserved: 0,
    }).catch(err => console.error('[inventory] Failed to create stock record:', err));
});

// ── order.placed → reserve stock for each item ──
eventBus.subscribe('order.placed', ({ payload }) => {
    const { items } = payload;
    items.forEach(item => {
        Inventory.findOneAndUpdate(
            {
                productId: item.productId,
                $expr: { $gte: [{ $subtract: ['$quantity', '$reserved'] }, item.qty] },
            },
            { $inc: { reserved: item.qty }, $set: { updatedAt: new Date() } },
            { new: true }
        ).then(inv => {
            if (!inv) console.error(`[inventory] Reserve failed for product ${item.productId}`);
            else if (inv.quantity <= inv.lowStockThreshold) {
                eventBus.publish('inventory.stock_low', {
                    productId: inv.productId.toString(),
                    sellerId: inv.sellerId.toString(),
                    quantity: inv.quantity,
                });
            }
        }).catch(console.error);
    });
});

// ── order.cancelled → release reserved stock ──
eventBus.subscribe('order.cancelled', ({ payload }) => {
    const { items } = payload;
    items.forEach(item => {
        Inventory.findOneAndUpdate(
            { productId: item.productId },
            { $inc: { reserved: -item.qty }, $set: { updatedAt: new Date() } }
        ).catch(console.error);
    });
});

const app = express();
app.use(express.json());
app.use('/', inventoryRoutes);
app.use(errorHandler);

mongoose.connect(process.env.MONGO_URI)
    .then(() => app.listen(process.env.PORT || 4004,
        () => console.log(`[inventory-service] listening on ${process.env.PORT || 4004}`)))
    .catch(err => { console.error(err); process.exit(1); });
