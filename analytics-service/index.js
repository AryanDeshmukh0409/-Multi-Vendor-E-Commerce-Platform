const express  = require('express');
const cors     = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const analyticsRoutes = require('./routes/analytics.routes');
const errorHandler    = require('../shared/middleware/errorHandler');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/analytics', analyticsRoutes);
app.use(errorHandler);

mongoose.connect(process.env.MONGO_URI)
  .then(() => app.listen(process.env.PORT || 4011,
    () => console.log(`[analytics-service] listening on ${process.env.PORT || 4011}`)))
  .catch(err => { console.error(err); process.exit(1); });