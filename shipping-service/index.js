const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();

const shippingRoutes = require('./routes/shipping.routes');
const errorHandler = require('../shared/middleware/errorHandler');

const app = express();
app.use(express.json());
app.use('/', shippingRoutes);
app.use(errorHandler);

mongoose.connect(process.env.MONGO_URI)
    .then(() => app.listen(process.env.PORT || 4007,
        () => console.log(`[shipping-service] listening on ${process.env.PORT || 4007}`)))
    .catch(err => { console.error(err); process.exit(1); });