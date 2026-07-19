import { Router } from 'express';
import { authenticateToken, optionalAuthenticateToken, requirePermission } from '../../middleware/auth.js';
import { launchLiveSession, joinLiveSession, getLiveSessionState, handleHostAction, submitParticipantAnswer } from './sessions.controller.js';

const router = Router();

// Launch session requires authenticated faculty with permission
router.post('/launch', authenticateToken as any, requirePermission('room:create') as any, launchLiveSession as any);

// Host actions require authenticated faculty host
router.post('/:sessionId/host-action', authenticateToken as any, requirePermission('room:start') as any, handleHostAction as any);

// Join, Get State, and Submit Answer support both authenticated students & unauthenticated guest participants
router.post('/join', optionalAuthenticateToken as any, joinLiveSession as any);
router.get('/:sessionId', optionalAuthenticateToken as any, getLiveSessionState as any);
router.post('/:sessionId/submit-answer', optionalAuthenticateToken as any, submitParticipantAnswer as any);

export default router;
