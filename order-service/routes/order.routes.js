const router = require('express').Router();
const ctrl = require('../controllers/order.controller');
const { requireAuth, requireRole } = require('../../shared/middleware/auth');

router.post('/orders',
    requireAuth('orders:create'),
    requireRole('buyer'),
    ctrl.createOrder
);

router.get('/orders',
    requireAuth('orders:read'),
    ctrl.listOrders
);

router.get('/orders/:id',
    requireAuth('orders:read'),
    ctrl.getOrder
);

router.patch('/orders/:id/cancel',
    requireAuth('orders:create'),
    requireRole('buyer', 'admin'),
    ctrl.cancelOrder
);

// Public internal endpoint — called by payment-service, shipping-service, etc.
// Status transitions happen here without auth checks
router.patch('/orders/:id/status',
    ctrl.updateStatus
);

// Internal route — alternative path for clarity
router.patch('/internal/orders/:id/status',
    ctrl.updateStatus
);

module.exports = router;