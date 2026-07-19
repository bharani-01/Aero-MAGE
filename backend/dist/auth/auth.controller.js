import { handleRegister, handleLogin, handleRefresh, handleLogout, getUserProfile, handleForgotPassword, handleResetPassword, } from './auth.service.js';
export const register = async (req, res, next) => {
    try {
        const result = await handleRegister(req.body);
        res.status(201).json({
            success: true,
            message: 'Registration successful. Account created.',
            data: result,
        });
    }
    catch (error) {
        next(error);
    }
};
export const login = async (req, res, next) => {
    try {
        const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
        const userAgent = req.headers['user-agent'] || 'unknown';
        const result = await handleLogin(req.body, ipAddress, userAgent);
        // Express standard session return
        res.status(200).json({
            success: true,
            message: 'Login successful.',
            data: result,
        });
    }
    catch (error) {
        next(error);
    }
};
export const refresh = async (req, res, next) => {
    try {
        const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
        const userAgent = req.headers['user-agent'] || 'unknown';
        const { refreshToken } = req.body;
        const result = await handleRefresh(refreshToken, ipAddress, userAgent);
        res.status(200).json({
            success: true,
            message: 'Token refreshed successfully.',
            data: result,
        });
    }
    catch (error) {
        next(error);
    }
};
export const logout = async (req, res, next) => {
    try {
        const { refreshToken } = req.body;
        await handleLogout(refreshToken);
        res.status(200).json({
            success: true,
            message: 'Logout successful.',
        });
    }
    catch (error) {
        next(error);
    }
};
export const me = async (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({ success: false, message: 'Unauthenticated.' });
        }
        const profile = await getUserProfile(req.user.id);
        res.status(200).json({
            success: true,
            data: profile,
        });
    }
    catch (error) {
        next(error);
    }
};
export const forgotPassword = async (req, res, next) => {
    try {
        const result = await handleForgotPassword(req.body.email);
        res.status(200).json(result);
    }
    catch (error) {
        next(error);
    }
};
export const resetPassword = async (req, res, next) => {
    try {
        const { token, newPassword } = req.body;
        await handleResetPassword(token, newPassword);
        res.status(200).json({
            success: true,
            message: 'Password reset successful. You can now login.',
        });
    }
    catch (error) {
        next(error);
    }
};
