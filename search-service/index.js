const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();

const searchRoutes = require('./routes/search.routes');
const errorHandler = require('../shared/middleware/errorHandler');

const app = express();
app.use(express.json());
app.use('/', searchRoutes);
app.use(errorHandler);

// Connects to catalog-db (read-only mirror of catalog data)
mongoose.connect(process.env.MONGO_URI)
    .then(() => app.listen(process.env.PORT || 4010,
        () => console.log(`[search-service] listening on ${process.env.PORT || 4010}`)))
    .catch(err => { console.error(err); process.exit(1); });