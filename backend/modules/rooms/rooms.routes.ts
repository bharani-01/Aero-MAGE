import { Router } from 'express';
import { authenticateToken, requirePermission } from '../../middleware/auth.js';
import {
  listRooms,
  createRoom,
  joinRoom,
  getJoinedRooms,
  leaveRoom,
  exploreRooms,
  getRoomFeed,
  createRoomPost,
  addPostComment,
  getRoomMembers,
  removeRoomMember,
  createAssignment,
  getRoomAssignments,
  submitAssignment,
  getAssignmentAnalytics,
  getPendingRequests,
  approveRoomRequest,
  rejectRoomRequest,
  updateRoom,
  transferRoomOwnership,
  deleteRoom
} from './rooms.controller.js';

const router = Router();

// Require authentication for all room routes
router.use(authenticateToken as any);

// Expose endpoints
router.get('/', listRooms as any);
router.post('/', requirePermission('room:create') as any, createRoom as any);
router.put('/:roomId', updateRoom as any);
router.delete('/:roomId', deleteRoom as any);
router.post('/:roomId/transfer-ownership', transferRoomOwnership as any);
router.post('/join', joinRoom as any);
router.get('/joined/my', getJoinedRooms as any);
router.get('/explore', exploreRooms as any);
router.delete('/:roomId/leave', leaveRoom as any);
router.get('/:roomId/feed', getRoomFeed as any);
router.post('/:roomId/feed', createRoomPost as any);
router.post('/:roomId/feed/:postId/comments', addPostComment as any);

// Classroom Members Management & Approval Requests
router.get('/:roomId/members', getRoomMembers as any);
router.delete('/:roomId/members/:memberId', removeRoomMember as any);
router.get('/:roomId/requests', getPendingRequests as any);
router.post('/:roomId/requests/:requestId/approve', approveRoomRequest as any);
router.post('/:roomId/requests/:requestId/reject', rejectRoomRequest as any);

// Classroom Assignments & Marks Analytics
router.post('/:roomId/assignments', createAssignment as any);
router.get('/:roomId/assignments', getRoomAssignments as any);
router.post('/:roomId/assignments/:assignmentId/submit', submitAssignment as any);
router.get('/:roomId/assignments/:assignmentId/analytics', getAssignmentAnalytics as any);

export default router;
