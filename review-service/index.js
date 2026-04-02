const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();

const reviewRoutes = require('./routes/review.routes');
const errorHandler = require('../shared/middleware/errorHandler');

const app = express();
app.use(express.json());
app.use('/', reviewRoutes);
app.use(errorHandler);

mongoose.connect(process.env.MONGO_URI)
    .then(() => app.listen(process.env.PORT || 4008,
        () => console.log(`[review-service] listening on ${process.env.PORT || 4008}`)))
    .catch(err => { console.error(err); process.exit(1); });