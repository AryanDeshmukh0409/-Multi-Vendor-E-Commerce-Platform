const router = require('express').Router();
const ctrl = require('../controllers/catalog.controller');
const { requireAuth } = require('../../shared/middleware/auth');

// Public routes
router.get('/products', ctrl.listProducts);
router.get('/products/search', ctrl.searchProducts);
router.get('/products/:id', ctrl.getProduct);

// Seller-only routes
router.post('/products', requireAuth('catalog:write'), ctrl.createProduct);
router.put('/products/:id', requireAuth('catalog:write'), ctrl.updateProduct);
router.delete('/products/:id', requireAuth('catalog:write'), ctrl.deleteProduct);

module.exports = router;
