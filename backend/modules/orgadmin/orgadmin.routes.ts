import { Router } from 'express';
import { authenticateToken, requirePermission } from '../../middleware/auth.js';
import { listOrgMembers, updateMemberStatus, removeOrgMember, addOrgMember } from './memberManagement.js';

const router = Router();

// Protect the entire orgadmin module with authentication
router.use(authenticateToken as any);

// Expose members management (requires database permission verification)
router.get('/members', requirePermission('member:view') as any, listOrgMembers as any);
router.post('/members/status', requirePermission('member:approve') as any, updateMemberStatus as any);
router.delete('/members/:membershipId', requirePermission('member:remove') as any, removeOrgMember as any);
router.post('/members', requirePermission('member:invite') as any, addOrgMember as any);

export default router;
