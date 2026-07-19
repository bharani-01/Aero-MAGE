import { Router } from 'express';
import { authenticateToken, requirePermission } from '../../middleware/auth.js';
import { listOrgMembers, updateMemberStatus, removeOrgMember, addOrgMember } from './memberManagement.js';
const router = Router();
// Protect the entire orgadmin module with authentication
router.use(authenticateToken);
// Expose members management (requires database permission verification)
router.get('/members', requirePermission('member:view'), listOrgMembers);
router.post('/members/status', requirePermission('member:approve'), updateMemberStatus);
router.delete('/members/:membershipId', requirePermission('member:remove'), removeOrgMember);
router.post('/members', requirePermission('member:invite'), addOrgMember);
export default router;
