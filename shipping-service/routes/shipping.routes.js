const router = require('express').Router();
const ctrl = require('../controllers/shipping.controller');
const { requireAuth, requireRole } = require('../../shared/middleware/auth');

router.post('/',
    requireAuth('shipping:write'),
    requireRole('seller'),
    ctrl.createShipment
);

router.get('/my',
    requireAuth('shipping:write'),
    requireRole('seller'),
    ctrl.getMyShipments
);

router.get('/order/:orderId',
    requireAuth('orders:read'),
    ctrl.getShipmentsByOrder
);

router.get('/:id',
    requireAuth('orders:read'),
    ctrl.getShipment
);

// Public webhook endpoint — carrier posts here (no JWT, secured by carrier secret in prod)
router.post('/webhook', ctrl.carrierWebhook);

module.exports = router;
