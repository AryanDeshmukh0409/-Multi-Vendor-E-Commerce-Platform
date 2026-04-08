const router = require('express').Router();
const ctrl = require('../controllers/inventory.controller');
const { requireAuth, requireRole } = require('../../shared/middleware/auth');

// ── Internal routes — called by other services ──
router.post('/internal/reserve', async (req, res, next) => {
  try {
    const { productId, qty } = req.body;
    req.params.productId = productId;
    req.body.qty = qty;
    await ctrl.reserve(req, res, next);
  } catch (err) { next(err); }
});

router.post('/internal/release', async (req, res, next) => {
  try {
    const { productId, qty } = req.body;
    req.params.productId = productId;
    req.body.qty = qty;
    await ctrl.release(req, res, next);
  } catch (err) { next(err); }
});


router.post('/internal/create-stock', async (req, res, next) => {
  try {
    const { productId, sellerId, storeId } = req.body;
    const Inventory = require('../models/Inventory');

    const existing = await Inventory.findOne({ productId });
    if (existing) return res.json({ success: true, inventory: existing });

    const inventory = await Inventory.create({
      productId, sellerId, storeId,
      quantity: 0, reserved: 0,
    });
    res.status(201).json({ success: true, inventory });
  } catch (err) { next(err); }
});

// ── Authenticated routes ──
router.get('/', requireAuth('inventory:write'), requireRole('seller'), ctrl.listMyInventory);
router.get('/:productId', requireAuth('inventory:write'), ctrl.getStock);
router.patch('/:productId', requireAuth('inventory:write'), requireRole('seller'), ctrl.setStock);
router.post('/:productId/reserve', requireAuth('orders:create'), ctrl.reserve);
router.post('/:productId/release', requireAuth('orders:create'), ctrl.release);
router.post('/:productId/deduct', requireAuth('orders:fulfil'), ctrl.deduct);

module.exports = router;