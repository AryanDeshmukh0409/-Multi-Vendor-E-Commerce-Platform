const express  = require('express');
const cors     = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const chatRoutes   = require('./routes/chat.routes');
const errorHandler = require('../shared/middleware/errorHandler');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/chat', chatRoutes);
app.use(errorHandler);

mongoose.connect(process.env.MONGO_URI)
  .then(() => app.listen(process.env.PORT || 4013,
    () => console.log('[chat-service] listening on ' + (process.env.PORT || 4013))))
  .catch(err => { console.error(err); process.exit(1); });