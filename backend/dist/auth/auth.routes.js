import { Router } from 'express';
import { register, login, refresh, logout, me, updateProfile, forgotPassword, resetPassword, } from './auth.controller.js';
import { authenticateToken } from '../middleware/auth.js';
const router = Router();
router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
// Secure endpoints
router.get('/me', authenticateToken, me);
router.put('/profile', authenticateToken, updateProfile);
export default router;
