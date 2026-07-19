import { Router } from 'express';
import { authenticateToken, optionalAuthenticateToken, requirePermission } from '../../middleware/auth.js';
import { launchLiveSession, joinLiveSession, getLiveSessionState, handleHostAction, submitParticipantAnswer } from './sessions.controller.js';
const router = Router();
// Launch session requires authenticated faculty with permission
router.post('/launch', authenticateToken, requirePermission('room:create'), launchLiveSession);
// Host actions require authenticated faculty host
router.post('/:sessionId/host-action', authenticateToken, requirePermission('room:start'), handleHostAction);
// Join, Get State, and Submit Answer support both authenticated students & unauthenticated guest participants
router.post('/join', optionalAuthenticateToken, joinLiveSession);
router.get('/:sessionId', optionalAuthenticateToken, getLiveSessionState);
router.post('/:sessionId/submit-answer', optionalAuthenticateToken, submitParticipantAnswer);
export default router;
