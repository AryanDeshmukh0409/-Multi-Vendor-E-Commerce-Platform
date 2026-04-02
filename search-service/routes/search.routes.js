
// ═══════════════════════════════════════════════
// routes/search.routes.js
// ═══════════════════════════════════════════════
const router = require('express').Router();
const ctrl = require('../controllers/search.controller');

// Both public — no auth needed
router.get('/', ctrl.search);
router.get('/suggest', ctrl.suggest);

module.exports = router;