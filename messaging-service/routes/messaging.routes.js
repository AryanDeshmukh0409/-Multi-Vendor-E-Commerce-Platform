const router = require('express').Router();
const ctrl = require('../controllers/messaging.controller');
const { requireAuth } = require('../../shared/middleware/auth');

router.post('/thread', requireAuth('messages:read'), ctrl.getOrCreateThread);
router.get('/threads', requireAuth('messages:read'), ctrl.listThreads);
router.get('/thread/:threadId', requireAuth('messages:read'), ctrl.getThread);
router.post('/', requireAuth('messages:write'), ctrl.sendMessage);

module.exports = router;
