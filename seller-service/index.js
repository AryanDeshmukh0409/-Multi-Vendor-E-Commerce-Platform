const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();

const sellerRoutes = require('./routes/seller.routes');
const errorHandler = require('../shared/middleware/errorHandler');

// Subscribe to payment.captured to update store revenue totals
const eventBus = require('../shared/events/eventBus');
eventBus.subscribe('payment.captured', ({ payload }) => {
    const Store = require('./models/Store');
    Store.findOneAndUpdate(
        { sellerId: payload.sellerId },
        { $inc: { totalRevenue: payload.amount || 0, totalOrders: 1 } }
    ).catch(console.error);
});

const app = express();
app.use(express.json());
app.use('/', sellerRoutes);
app.use(errorHandler);

mongoose.connect(process.env.MONGO_URI)
    .then(() => app.listen(process.env.PORT || 4002,
        () => console.log(`[seller-service] listening on ${process.env.PORT || 4002}`)))
    .catch(err => { console.error(err); process.exit(1); });
