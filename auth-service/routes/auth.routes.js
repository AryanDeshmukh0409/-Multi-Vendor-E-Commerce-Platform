const router = require('express').Router();
const ctrl = require('../controllers/auth.controller');
const { requireAuth } = require('../../shared/middleware/auth');

router.post('/register', ctrl.register);
router.get('/authorize', ctrl.authorize);
router.post('/token', ctrl.token);
router.post('/logout', ctrl.logout);
router.get('/me', requireAuth(), ctrl.me);
router.post('/login', ctrl.login);


module.exports = router;