import { Router } from 'express';
import {
  publishQuizToMarketplace,
  exploreMarketplace,
  getMarketplaceListing,
  cloneMarketplaceQuiz,
  rateMarketplaceListing,
  toggleFavoriteMarketplace,
  reportMarketplaceListing
} from './marketplace.controller.js';
import { authenticateToken } from '../../middleware/auth.js';

const router = Router();

// Public routes
router.get('/explore', exploreMarketplace);
router.get('/:id', getMarketplaceListing);

// Protected routes (Require login)
router.post('/publish', authenticateToken, publishQuizToMarketplace);
router.post('/:id/clone', authenticateToken, cloneMarketplaceQuiz);
router.post('/:id/rate', authenticateToken, rateMarketplaceListing);
router.post('/:id/favorite', authenticateToken, toggleFavoriteMarketplace);
router.post('/:id/report', authenticateToken, reportMarketplaceListing);

export default router;
