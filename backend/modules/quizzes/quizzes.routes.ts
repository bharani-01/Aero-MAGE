import { Router } from 'express';
import { authenticateToken, requirePermission } from '../../middleware/auth.js';
import {
  listQuizzes,
  getQuizDetails,
  createQuiz,
  updateQuiz,
  updateQuizVisibility,
  cloneQuiz,
  toggleBookmark,
  getUserBookmarks,
  recordQuizAttempt,
  getQuizAttempts
} from './quizzes.controller.js';

const router = Router();

router.use(authenticateToken as any);

router.get('/', requirePermission('quiz:read') as any, listQuizzes as any);
router.get('/bookmarks/my', requirePermission('quiz:read') as any, getUserBookmarks as any);
router.get('/:quizId', requirePermission('quiz:read') as any, getQuizDetails as any);
router.post('/', requirePermission('quiz:create') as any, createQuiz as any);
router.post('/:quizId/clone', requirePermission('quiz:create') as any, cloneQuiz as any);
router.post('/:quizId/bookmark', requirePermission('quiz:read') as any, toggleBookmark as any);
router.post('/:quizId/attempt', requirePermission('quiz:read') as any, recordQuizAttempt as any);
router.get('/:quizId/attempts', requirePermission('quiz:read') as any, getQuizAttempts as any);
router.put('/:quizId', requirePermission('quiz:update') as any, updateQuiz as any);
router.put('/:quizId/visibility', requirePermission('quiz:update') as any, updateQuizVisibility as any);

export default router;
