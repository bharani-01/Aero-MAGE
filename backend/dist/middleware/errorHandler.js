import { AppError } from '../shared/errors/AppError.js';
import { config } from '../config/index.js';
export const errorHandler = (err, req, res, next) => {
    if (err instanceof AppError) {
        return res.status(err.statusCode).json({
            success: false,
            error: {
                message: err.message,
                code: err.errorCode,
            },
        });
    }
    // Log unexpected errors
    console.error('❌ Internal server error:', err);
    return res.status(500).json({
        success: false,
        error: {
            message: 'An unexpected internal server error occurred.',
            code: 'INTERNAL_SERVER_ERROR',
            stack: config.NODE_ENV === 'development' ? err.stack : undefined,
        },
    });
};
