import { Router } from 'express';
import authRoutes from '../auth/auth.routes.js';
import quizzesRoutes from '../modules/quizzes/quizzes.routes.js';
import sessionsRoutes from '../modules/sessions/sessions.routes.js';
import adminRoutes from '../modules/admin/admin.routes.js';
import orgadminRoutes from '../modules/orgadmin/orgadmin.routes.js';
import roomsRoutes from '../modules/rooms/rooms.routes.js';
import shortlinkRoutes from '../modules/shortlink/shortlink.routes.js';
import marketplaceRoutes from '../modules/marketplace/marketplace.routes.js';
import gamificationRoutes from '../modules/gamification/gamification.routes.js';

const router = Router();

// Mount structured routes under /api
router.use('/auth', authRoutes);
router.use('/quizzes', quizzesRoutes);
router.use('/sessions', sessionsRoutes);
router.use('/admin', adminRoutes);
router.use('/org-admin', orgadminRoutes);
router.use('/rooms', roomsRoutes);
router.use('/shortlink', shortlinkRoutes);
router.use('/marketplace', marketplaceRoutes);
router.use('/gamification', gamificationRoutes);

export default router;

