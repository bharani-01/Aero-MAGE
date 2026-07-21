import { Router } from 'express';
import { createShortLink, resolveShortLink } from './shortlink.controller.js';
import { optionalAuthenticateToken } from '../../middleware/auth.js';

const router = Router();

router.post('/create', optionalAuthenticateToken, createShortLink);
router.get('/:code', resolveShortLink);

export default router;
