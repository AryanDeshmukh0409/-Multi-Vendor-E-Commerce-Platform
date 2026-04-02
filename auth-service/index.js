const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();

const authRoutes = require('./routes/auth.routes');
const errorHandler = require('../shared/middleware/errorHandler');

const app = express();
app.use(express.json());
app.use('/auth', authRoutes);
app.use(errorHandler);



mongoose.connect(process.env.MONGO_URI)
    .then(() => app.listen(process.env.PORT || 4001, () =>
        console.log(`[auth-service] listening on ${process.env.PORT || 4001}`)))
    .catch(err => { console.error(err); process.exit(1); });
