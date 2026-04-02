const router = require('express').Router();
const ctrl = require('../controllers/payment.controller');
const { requireAuth, requireRole } = require('../../shared/middleware/auth');

const { createEscrow, internalRefund, internalReleaseEscrow } = ctrl;


// Internal routes — called by other services directly
router.post('/internal/create-escrow', createEscrow);
router.post('/internal/refund',        internalRefund);
router.post('/internal/release-escrow', internalReleaseEscrow);


// Buyer captures payment for their order
router.post('/capture',
    requireAuth('orders:create'),
    requireRole('buyer'),
    ctrl.capturePayment
);

// View payment for an order
router.get('/order/:orderId',
    requireAuth('orders:read'),
    ctrl.getPayment
);

// Internal/admin: release a seller's escrow
router.post('/release',
    requireAuth('payments:*'),
    requireRole('admin'),
    ctrl.releaseEscrow
);

// Internal/admin: full refund
router.post('/refund',
    requireAuth('payments:*'),
    requireRole('admin'),
    ctrl.refundPayment
);

module.exports = router;

