const ApiError = require('../utils/apiError');

// Centralized error envelope — all services mount this as their last middleware
function errorHandler(err, req, res, next) {
    const isDev = process.env.NODE_ENV !== 'production';

    if (err instanceof ApiError) {
        return res.status(err.statusCode).json({
            success: false,
            error: {
                message: err.message,
                ...(err.details && { details: err.details }),
            },
        });
    }

    // Mongoose validation error
    if (err.name === 'ValidationError') {
        const details = Object.values(err.errors).map(e => e.message);
        return res.status(400).json({
            success: false,
            error: { message: 'Validation failed', details },
        });
    }

    // Mongoose duplicate key
    if (err.code === 11000) {
        const field = Object.keys(err.keyValue)[0];
        return res.status(409).json({
            success: false,
            error: { message: `Duplicate value for field: ${field}` },
        });
    }

    // Unknown
    console.error('[Unhandled Error]', err);
    return res.status(500).json({
        success: false,
        error: {
            message: 'Internal server error',
            ...(isDev && { stack: err.stack }),
        },
    });
}

module.exports = errorHandler;