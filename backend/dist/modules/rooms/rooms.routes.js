import { Router } from 'express';
import { authenticateToken, requirePermission } from '../../middleware/auth.js';
import { listRooms, createRoom, joinRoom, getJoinedRooms, leaveRoom, exploreRooms, getRoomFeed, createRoomPost, addPostComment, getRoomMembers, removeRoomMember, createAssignment, getRoomAssignments, submitAssignment, getAssignmentAnalytics, getPendingRequests, approveRoomRequest, rejectRoomRequest, updateRoom, transferRoomOwnership, deleteRoom } from './rooms.controller.js';
const router = Router();
// Require authentication for all room routes
router.use(authenticateToken);
// Expose endpoints
router.get('/', listRooms);
router.post('/', requirePermission('room:create'), createRoom);
router.put('/:roomId', updateRoom);
router.delete('/:roomId', deleteRoom);
router.post('/:roomId/transfer-ownership', transferRoomOwnership);
router.post('/join', joinRoom);
router.get('/joined/my', getJoinedRooms);
router.get('/explore', exploreRooms);
router.delete('/:roomId/leave', leaveRoom);
router.get('/:roomId/feed', getRoomFeed);
router.post('/:roomId/feed', createRoomPost);
router.post('/:roomId/feed/:postId/comments', addPostComment);
// Classroom Members Management & Approval Requests
router.get('/:roomId/members', getRoomMembers);
router.delete('/:roomId/members/:memberId', removeRoomMember);
router.get('/:roomId/requests', getPendingRequests);
router.post('/:roomId/requests/:requestId/approve', approveRoomRequest);
router.post('/:roomId/requests/:requestId/reject', rejectRoomRequest);
// Classroom Assignments & Marks Analytics
router.post('/:roomId/assignments', createAssignment);
router.get('/:roomId/assignments', getRoomAssignments);
router.post('/:roomId/assignments/:assignmentId/submit', submitAssignment);
router.get('/:roomId/assignments/:assignmentId/analytics', getAssignmentAnalytics);
export default router;
