import { Router } from 'express';
import { authenticateToken, requirePermission } from '../../middleware/auth.js';
import { listRooms, createRoom, joinRoom, getRoomFeed, createRoomPost, addPostComment, getRoomMembers, removeRoomMember } from './rooms.controller.js';
const router = Router();
// Require authentication for all room routes
router.use(authenticateToken);
// Expose endpoints
router.get('/', listRooms);
router.post('/', requirePermission('room:create'), createRoom);
router.post('/join', joinRoom);
router.get('/:roomId/feed', getRoomFeed);
router.post('/:roomId/feed', createRoomPost);
router.post('/:roomId/feed/:postId/comments', addPostComment);
// Classroom Members Management
router.get('/:roomId/members', getRoomMembers);
router.delete('/:roomId/members/:memberId', removeRoomMember);
export default router;
