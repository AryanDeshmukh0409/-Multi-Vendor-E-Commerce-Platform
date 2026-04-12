const router = require('express').Router();
const ctrl = require('../controllers/chat.controller');
const { requireAuth } = require('../../shared/middleware/auth');

router.post('/send',          requireAuth(), ctrl.sendMessage);
router.get('/sessions',       requireAuth(), ctrl.getSessions);
router.get('/sessions/:id',   requireAuth(), ctrl.getSession);
router.delete('/sessions/:id', requireAuth(), ctrl.deleteSession);

module.exports = router;