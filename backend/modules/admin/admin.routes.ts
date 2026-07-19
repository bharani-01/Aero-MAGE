import { Router } from 'express';
import { authenticateToken, requirePermission } from '../../middleware/auth.js';
import { listOrganizations, createOrganization, listOrgAdmins } from './orgManagement.js';

const router = Router();

// Protect the entire admin module with authentication
router.use(authenticateToken as any);

// config:manage permission required
router.get('/config', requirePermission('config:manage') as any, (req, res) => {
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
router.get('/audit', requirePermission('audit:view') as any, (req, res) => {
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
router.get('/organizations', requirePermission('organization:read') as any, listOrganizations as any);
router.post('/organizations', requirePermission('organization:create') as any, createOrganization as any);
router.get('/org-admins', requirePermission('role:assign') as any, listOrgAdmins as any);

export default router;
