const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();

const catalogRoutes = require('./routes/catalog.routes');
const errorHandler = require('../shared/middleware/errorHandler');
const eventBus = require('../shared/events/eventBus');
const { updateAvgRating } = require('./controllers/catalog.controller');

// Listen for review.approved → recalculate avgRating
// In production the Review service would send the new avg; here we recompute from all reviews
// via a REST call. For now we accept the avg directly from the event payload.
eventBus.subscribe('review.approved', ({ payload }) => {
    if (payload.productId && payload.newAvgRating !== undefined) {
        updateAvgRating(payload.productId, payload.newAvgRating).catch(console.error);
    }
});

const app = express();
app.use(express.json());
app.use('/', catalogRoutes);
app.use(errorHandler);

mongoose.connect(process.env.MONGO_URI)
    .then(() => app.listen(process.env.PORT || 4003,
        () => console.log(`[catalog-service] listening on ${process.env.PORT || 4003}`)))
    .catch(err => { console.error(err); process.exit(1); });
