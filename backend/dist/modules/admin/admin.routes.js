import { Router } from 'express';
import { authenticateToken, requirePermission } from '../../middleware/auth.js';
import { listOrganizations, createOrganization, listOrgAdmins } from './orgManagement.js';
const router = Router();
// Protect the entire admin module with authentication
router.use(authenticateToken);
// config:manage permission required
router.get('/config', requirePermission('config:manage'), (req, res) => {
    res.json({
        success: true,
        message: 'Welcome Administrator. Access to system configurations granted.',
        data: {
            max_concurrent_sessions_per_org: 10,
            max_quizzes_per_org: 100,
            max_questions_per_quiz: 50,
            resend_verified_domain: 'resend.dev'
        }
    });
});
// audit:view permission required
router.get('/audit', requirePermission('audit:view'), (req, res) => {
    res.json({
        success: true,
        message: 'Welcome Auditor. Audit logs accessed.',
        data: [
            { id: 1, action: 'user_register', user: 'dev@aeromage.com', timestamp: new Date() },
            { id: 2, action: 'system_roles_seeded', user: 'system', timestamp: new Date() }
        ]
    });
});
// Organization and Org Admin Management endpoints (fully verified via DB)
router.get('/organizations', requirePermission('organization:read'), listOrganizations);
router.post('/organizations', requirePermission('organization:create'), createOrganization);
router.get('/org-admins', requirePermission('role:assign'), listOrgAdmins);
export default router;
