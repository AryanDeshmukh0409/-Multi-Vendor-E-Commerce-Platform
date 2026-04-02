// ═══════════════════════════════════════════════
// routes/analytics.routes.js
// ═══════════════════════════════════════════════
const router = require('express').Router();
const ctrl = require('../controllers/analytics.controller');
const { requireAuth, requireRole } = require('../../shared/middleware/auth');

// Admin-only routes
router.get('/revenue', requireAuth('analytics:*'), requireRole('admin'), ctrl.revenueByDay);
router.get('/top-products', requireAuth('analytics:*'), requireRole('admin'), ctrl.topProducts);
router.get('/top-sellers', requireAuth('analytics:*'), requireRole('admin'), ctrl.topSellers);
router.get('/orders-by-category', requireAuth('analytics:*'), requireRole('admin'), ctrl.ordersByCategory);

// Seller sees own stats only
router.get('/seller/me', requireAuth('analytics:read'), requireRole('seller'), ctrl.sellerStats);

module.exports = router;