const jwt = require('jsonwebtoken');
const ApiError = require('../utils/apiError');

/**
 * requireAuth(scope?)
 * Verifies the Bearer JWT and optionally enforces a required scope.
 * Attaches decoded payload to req.user.
 *
 * Usage:
 *   router.get('/me',        requireAuth(), handler)
 *   router.post('/products', requireAuth('catalog:write'), handler)
 */
function requireAuth(requiredScope = null) {
    return (req, res, next) => {
        const header = req.headers.authorization || '';
        const token = header.startsWith('Bearer ') ? header.slice(7) : null;

        if (!token) return next(ApiError.unauthorized('No token provided'));

        let payload;
        try {
            payload = jwt.verify(token, process.env.JWT_SECRET);
        } catch (err) {
            const msg = err.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token';
            return next(ApiError.unauthorized(msg));
        }

        // Scope enforcement
        if (requiredScope) {
            const scopes = payload.scopes || [];
            const hasScope =
                scopes.includes(requiredScope) ||
                // wildcard: 'orders:*' satisfies 'orders:read'
                scopes.some(s => {
                    const [ns] = s.split(':');
                    return s.endsWith(':*') && requiredScope.startsWith(ns + ':');
                });

            if (!hasScope) {
                return next(ApiError.forbidden(`Scope required: ${requiredScope}`));
            }
        }

        req.user = payload; // { sub, role, scopes, storeId?, exp }
        next();
    };
}

/**
 * requireRole(...roles)
 * Ensures req.user.role is one of the specified roles.
 * Always chain AFTER requireAuth().
 */
function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.user) return next(ApiError.unauthorized());
        if (!roles.includes(req.user.role)) {
            return next(ApiError.forbidden(`Role required: ${roles.join(' | ')}`));
        }
        next();
    };
}

module.exports = { requireAuth, requireRole };