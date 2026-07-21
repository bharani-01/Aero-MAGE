import { Router } from 'express';
import {
  getUserGamificationProfile,
  getBadges,
  togglePinBadge,
  getGlobalLeaderboard
} from './gamification.controller.js';
import { authenticateToken, optionalAuthenticateToken } from '../../middleware/auth.js';

const router = Router();

router.get('/profile', authenticateToken, getUserGamificationProfile);
router.get('/badges', optionalAuthenticateToken, getBadges);
router.post('/badges/:badgeId/pin', authenticateToken, togglePinBadge);
router.get('/leaderboard', optionalAuthenticateToken, getGlobalLeaderboard);

export default router;
