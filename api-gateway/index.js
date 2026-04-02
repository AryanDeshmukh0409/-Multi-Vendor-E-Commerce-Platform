// api-gateway/index.js
//
// Responsibilities:
//  1. JWT validation on every request (except /auth/*)
//  2. Scope enforcement per route
//  3. Per-client rate limiting
//  4. Request ID injection
//  5. Reverse-proxy routing to downstream services

const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');
require('dotenv').config();

const { requireAuth } = require('../shared/middleware/auth');
const errorHandler = require('../shared/middleware/errorHandler');

const app = express();

// ── Request ID ───────────────────────────────
app.use((req, _res, next) => {
    req.id = crypto.randomUUID();
    next();
});

// ── Rate limiter (per client IP) ─────────────


const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: req => req.headers['x-client-id'] || req.ip,
    message: { success: false, error: { message: 'Too many requests' } },
});

app.use(limiter);

// ── Service URLs (from env) ──────────────────
const SVC = {
    auth: process.env.AUTH_SVC_URL || 'http://localhost:4001',
    seller: process.env.SELLER_SVC_URL || 'http://localhost:4002',
    catalog: process.env.CATALOG_SVC_URL || 'http://localhost:4003',
    inventory: process.env.INVENTORY_SVC_URL || 'http://localhost:4004',
    order: process.env.ORDER_SVC_URL || 'http://localhost:4005',
    payment: process.env.PAYMENT_SVC_URL || 'http://localhost:4006',
    shipping: process.env.SHIPPING_SVC_URL || 'http://localhost:4007',
    review: process.env.REVIEW_SVC_URL || 'http://localhost:4008',
    messaging: process.env.MESSAGING_SVC_URL || 'http://localhost:4009',
    analytics: process.env.ANALYTICS_SVC_URL || 'http://localhost:4011',
    search: process.env.SEARCH_SVC_URL || 'http://localhost:4010',
};

// ── Proxy factory ────────────────────────────
function proxy(target, pathRewrite = {}) {
    return createProxyMiddleware({
        target,
        changeOrigin: true,
        pathRewrite,
        on: {
            proxyReq: (proxyReq, req) => {
                // Forward request ID and authenticated user downstream
                proxyReq.setHeader('x-request-id', req.id);
                if (req.user) proxyReq.setHeader('x-user', JSON.stringify(req.user));
            },
            error: (err, _req, res) => {
                res.status(502).json({ success: false, error: { message: 'Service unavailable' } });
            },
        },
    });
}

// ── Routes ───────────────────────────────────

// Auth — public (keep /auth; auth-service mounts router at /auth)
app.use('/auth', proxy(SVC.auth, { '^/auth': '/auth' }));


// Catalog
app.use('/catalog', (req, _res, next) => {
    const writeMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
    if (writeMethods.includes(req.method)) {
        return requireAuth('catalog:write')(req, _res, next);
    }
    next();
}, proxy(SVC.catalog, { '^/catalog': '' }));

// Seller
app.use('/sellers',
    requireAuth(),
    proxy(SVC.seller, { '^/sellers': '' })
);

// Inventory (keep /inventory; inventory-service mounts router at /inventory)
app.use('/inventory',
    requireAuth('inventory:write'),
    proxy(SVC.inventory, { '^/inventory': '/inventory' })
);

// Orders (keep /orders; order-service routes are /orders/* at root mount)
app.use('/orders',
    (req, _res, next) => {
        const writeMethods = ['POST', 'PATCH', 'PUT', 'DELETE'];
        if (writeMethods.includes(req.method)) {
            return requireAuth('orders:create')(req, _res, next);
        }
        return requireAuth('orders:read')(req, _res, next);
    },
    proxy(SVC.order, { '^/orders': '/orders' })
);
// Payments
app.use('/payments',
    requireAuth('orders:create'),
    proxy(SVC.payment, { '^/payments': '' })
);

// Shipping
app.use('/shipping',
    requireAuth('shipping:write'),
    proxy(SVC.shipping, { '^/shipping': '' })
);

// Reviews
app.use('/reviews',
    requireAuth(),
    proxy(SVC.review, { '^/reviews': '' })
);

// Messaging (keep /messages; messaging-service mounts router at /messages)
app.use('/messages',
    requireAuth('messages:read'),
    proxy(SVC.messaging, { '^/messages': '/messages' })
);

// Analytics (keep /analytics; analytics-service mounts router at /analytics)
app.use('/analytics',
    requireAuth('analytics:*'),
    proxy(SVC.analytics, { '^/analytics': '/analytics' })
);

// Search — public (keep /search prefix; search-service mounts routes at /search)
app.use('/search', proxy(SVC.search, { '^/search': '' }));

// ── Error handler ────────────────────────────
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`[api-gateway] listening on ${PORT}`));