const router = require('express').Router();
const ctrl = require('../controllers/review.controller');
const { requireAuth, requireRole } = require('../../shared/middleware/auth');

// Buyer submits review
router.post('/',
    requireAuth(),
    requireRole('buyer'),
    ctrl.createReview
);

// Public — approved reviews for a product
router.get('/product/:productId', ctrl.getProductReviews);

// Buyer's own reviews
router.get('/my',
    requireAuth(),
    requireRole('buyer'),
    ctrl.getMyReviews
);

// Admin moderation queue
router.get('/pending',
    requireAuth('reviews:moderate'),
    requireRole('admin'),
    ctrl.getPendingReviews
);

// Admin approve / flag
router.patch('/:id/approve',
    requireAuth('reviews:moderate'),
    requireRole('admin'),
    ctrl.approveReview
);

router.patch('/:id/flag',
    requireAuth('reviews:moderate'),
    requireRole('admin'),
    ctrl.flagReview
);

module.exports = router;