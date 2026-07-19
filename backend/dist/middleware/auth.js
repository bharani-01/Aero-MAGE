import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { prisma } from '../config/database.js';
import { AppError } from '../shared/errors/AppError.js';
// 1. Authentication Middleware (JWT verification)
export const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
        return next(new AppError('Authentication token missing.', 401, 'AUTH_TOKEN_MISSING'));
    }
    try {
        const decoded = jwt.verify(token, config.JWT_ACCESS_SECRET);
        req.user = {
            id: decoded.id,
            email: decoded.email,
        };
        next();
    }
    catch (err) {
        if (err instanceof jwt.TokenExpiredError) {
            return next(new AppError('Authentication token expired.', 401, 'AUTH_TOKEN_EXPIRED'));
        }
        return next(new AppError('Invalid authentication token.', 401, 'AUTH_TOKEN_INVALID'));
    }
};
// Optional Authentication Middleware (extracts user if token is present, proceeds unauthenticated if missing)
export const optionalAuthenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
        return next();
    }
    try {
        const decoded = jwt.verify(token, config.JWT_ACCESS_SECRET);
        req.user = {
            id: decoded.id,
            email: decoded.email,
        };
    }
    catch (err) {
        // Leave req.user undefined if token is invalid or expired
    }
    next();
};
// 2. Role-Based Access Control Middleware (RBAC guard)
export const requirePermission = (requiredPermission) => {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                return next(new AppError('Unauthenticated request.', 401, 'UNAUTHENTICATED'));
            }
            const userId = req.user.id;
            // 1. Check if user is a Super Admin (bypasses all checks)
            const userRoles = await prisma.userRole.findMany({
                where: { user_id: userId },
                include: { role: true }
            });
            const isSuperAdmin = userRoles.some(ur => ur.role.name === 'super_admin');
            if (isSuperAdmin) {
                return next(); // Bypasses permission checks
            }
            // 2. Execute SQL permission resolution query
            const permissions = await prisma.$queryRaw `
        SELECT DISTINCT p.name
        FROM user_role ur
        JOIN role_permission rp ON rp.role_id = ur.role_id
        JOIN permission p ON p.id = rp.permission_id
        JOIN role r ON r.id = ur.role_id
        WHERE ur.user_id = ${userId}::uuid
          AND ur.organization_id IS NULL
          AND r.deleted_at IS NULL
      `;
            const hasPermission = permissions.some(p => p.name === requiredPermission);
            if (!hasPermission) {
                return next(new AppError(`Access denied. Insufficient permissions. Required: ${requiredPermission}`, 403, 'FORBIDDEN_INSUFFICIENT_PERMISSIONS'));
            }
            next();
        }
        catch (error) {
            next(error);
        }
    };
};
