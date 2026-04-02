const router = require('express').Router();
const ctrl = require('../controllers/seller.controller');
const { requireAuth, requireRole } = require('../../shared/middleware/auth');

router.post('/register', requireAuth(), requireRole('seller'), ctrl.register);
router.get('/me', requireAuth(), requireRole('seller'), ctrl.getMyStore);
router.patch('/me', requireAuth(), requireRole('seller'), ctrl.updateMyStore);
router.get('/dashboard', requireAuth(), requireRole('seller'), ctrl.dashboard);
router.get('/', requireAuth(), requireRole('admin'), ctrl.listStores);
router.get('/:storeId', ctrl.getStore);


module.exports = router;

