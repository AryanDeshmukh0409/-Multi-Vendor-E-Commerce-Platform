const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  role:      { type: String, enum: ['user', 'assistant'], required: true },
  content:   { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

const chatSessionSchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  title:     { type: String, default: 'New Chat' },
  messages:  [messageSchema],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

chatSessionSchema.pre('save', function () { this.updatedAt = Date.now(); });

module.exports = mongoose.model('ChatSession', chatSessionSchema);