import { Router } from 'express';
import { authenticateToken, requirePermission } from '../../middleware/auth.js';
import { listRooms, createRoom, joinRoom, getRoomFeed, createRoomPost, addPostComment, getRoomMembers, removeRoomMember } from './rooms.controller.js';

const router = Router();

// Require authentication for all room routes
router.use(authenticateToken as any);

// Expose endpoints
router.get('/', listRooms as any);
router.post('/', requirePermission('room:create') as any, createRoom as any);
router.post('/join', joinRoom as any);
router.get('/:roomId/feed', getRoomFeed as any);
router.post('/:roomId/feed', createRoomPost as any);
router.post('/:roomId/feed/:postId/comments', addPostComment as any);

// Classroom Members Management
router.get('/:roomId/members', getRoomMembers as any);
router.delete('/:roomId/members/:memberId', removeRoomMember as any);

export default router;
