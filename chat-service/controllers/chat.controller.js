const ChatSession = require('../models/ChatSession');
const llm = require('../services/llm.service');
const ApiError = require('../../shared/utils/apiError');

// ── POST /chat/send ──────────────────────────
async function sendMessage(req, res, next) {
  try {
    const userId = req.user.sub;
    const { message, sessionId } = req.body;
    if (!message) throw ApiError.badRequest('message is required');

    const token = req.headers.authorization?.split(' ')[1];

    // Find or create session
    let session;
    if (sessionId) {
      session = await ChatSession.findOne({ _id: sessionId, userId });
      if (!session) throw ApiError.notFound('Chat session not found');
    } else {
      session = await ChatSession.create({
        userId,
        title: message.slice(0, 50),
        messages: []
      });
    }

    // Add user message
    session.messages.push({ role: 'user', content: message });

    // Generate response
    const reply = await llm.generateResponse(message, token);

    // Add assistant message
    session.messages.push({ role: 'assistant', content: reply });
    await session.save();

    res.json({
      success: true,
      sessionId: session._id,
      reply,
      messages: session.messages
    });
  } catch (err) { next(err); }
}

// ── GET /chat/sessions ───────────────────────
async function getSessions(req, res, next) {
  try {
    const sessions = await ChatSession.find({ userId: req.user.sub })
      .select('title createdAt updatedAt')
      .sort('-updatedAt')
      .limit(20);
    res.json({ success: true, sessions });
  } catch (err) { next(err); }
}

// ── GET /chat/sessions/:id ───────────────────
async function getSession(req, res, next) {
  try {
    const session = await ChatSession.findOne({
      _id: req.params.id,
      userId: req.user.sub
    });
    if (!session) throw ApiError.notFound('Session not found');
    res.json({ success: true, session });
  } catch (err) { next(err); }
}

// ── DELETE /chat/sessions/:id ────────────────
async function deleteSession(req, res, next) {
  try {
    const result = await ChatSession.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.sub
    });
    if (!result) throw ApiError.notFound('Session not found');
    res.json({ success: true, message: 'Session deleted' });
  } catch (err) { next(err); }
}

module.exports = { sendMessage, getSessions, getSession, deleteSession };