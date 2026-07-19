-- 1. Insert Default Permissions
INSERT INTO permission (name, display_name, description, resource, action, category, is_system) VALUES
('quiz:create', 'Create Quiz', 'Create a new quiz', 'quiz', 'create', 'content', true),
('quiz:read', 'View Quiz', 'View quiz details', 'quiz', 'read', 'content', true),
('quiz:update', 'Edit Quiz', 'Edit quiz settings and content', 'quiz', 'update', 'content', true),
('quiz:delete', 'Delete Quiz', 'Soft-delete a quiz', 'quiz', 'delete', 'content', true),
('quiz:publish', 'Publish Quiz', 'Publish a quiz to marketplace or org', 'quiz', 'publish', 'content', true),
('quiz:archive', 'Archive Quiz', 'Archive a quiz', 'quiz', 'archive', 'content', true),
('quiz:clone', 'Clone Quiz', 'Clone an existing quiz', 'quiz', 'clone', 'content', true),
('quiz:import', 'Import Questions', 'Import questions from files', 'quiz', 'import', 'content', true),
('quiz:export', 'Export Questions', 'Export questions to files', 'quiz', 'export', 'content', true),
('question:create', 'Create Question', 'Create questions in a quiz', 'question', 'create', 'content', true),
('question:read', 'View Question', 'View question details', 'question', 'read', 'content', true),
('question:update', 'Edit Question', 'Edit question settings', 'question', 'update', 'content', true),
('question:delete', 'Delete Question', 'Delete a question', 'question', 'delete', 'content', true),
('question_bank:read', 'View Question Bank', 'Browse question banks', 'question_bank', 'read', 'content', true),
('question_bank:write', 'Write to Question Bank', 'Add questions to bank', 'question_bank', 'write', 'content', true),
('question_bank:manage', 'Manage Question Bank', 'Administrative bank control', 'question_bank', 'manage', 'content', true),
('room:create', 'Create Live Session', 'Create a live playroom', 'room', 'create', 'session', true),
('room:start', 'Start Live Session', 'Start live session answers delivery', 'room', 'start', 'session', true),
('room:end', 'End Live Session', 'Conclude session and save stats', 'room', 'end', 'session', true),
('room:pause', 'Pause Live Session', 'Temporarily freeze session timer', 'room', 'pause', 'session', true),
('room:configure', 'Configure Session Settings', 'Modify session configs', 'room', 'configure', 'session', true),
('participant:kick', 'Remove Participant', 'Remove users from lobby/session', 'participant', 'kick', 'session', true),
('participant:view', 'View Participants', 'View participant list and ranks', 'participant', 'view', 'session', true),
('organization:create', 'Create Organization', 'Initialize a new tenant org', 'organization', 'create', 'organization', true),
('organization:read', 'View Organization', 'View organization details', 'organization', 'read', 'organization', true),
('organization:update', 'Update Organization', 'Modify organization profiles', 'organization', 'update', 'organization', true),
('organization:delete', 'Delete Organization', 'Remove organization tenant', 'organization', 'delete', 'organization', true),
('organization:configure', 'Configure Organization', 'Manage org-level configurations', 'organization', 'configure', 'organization', true),
('department:create', 'Create Department', 'Create organizational sub-departments', 'department', 'create', 'organization', true),
('department:read', 'View Department', 'Browse departments list', 'department', 'read', 'organization', true),
('department:update', 'Update Department', 'Modify department names', 'department', 'update', 'organization', true),
('department:delete', 'Delete Department', 'Delete organizational department', 'department', 'delete', 'organization', true),
('member:invite', 'Invite Members', 'Invite users to join organization', 'member', 'invite', 'organization', true),
('member:approve', 'Approve Join Requests', 'Approve membership requests', 'member', 'approve', 'organization', true),
('member:remove', 'Remove Members', 'Suspend or remove members', 'member', 'remove', 'organization', true),
('member:view', 'View Members', 'Browse member tables', 'member', 'view', 'organization', true),
('role:create', 'Create Custom Role', 'Create new custom RBAC roles', 'role', 'create', 'organization', true),
('role:update', 'Update Role', 'Edit custom role scopes', 'role', 'update', 'organization', true),
('role:delete', 'Delete Role', 'Remove custom roles', 'role', 'delete', 'organization', true),
('role:assign', 'Assign Role to User', 'Map users to roles', 'role', 'assign', 'organization', true),
('marketplace:publish', 'Publish to Marketplace', 'Publish quizzes to free marketplace', 'marketplace', 'publish', 'content', true),
('marketplace:moderate', 'Moderate Marketplace', 'Moderate reports and flagged listings', 'marketplace', 'moderate', 'platform', true),
('marketplace:feature', 'Feature Marketplace Items', 'Promote items on explore feeds', 'marketplace', 'feature', 'platform', true),
('analytics:view', 'View Analytics', 'View quiz response summaries', 'analytics', 'view', 'analytics', true),
('analytics:view_org', 'View Organization Analytics', 'View organization-wide metrics', 'analytics', 'view_org', 'analytics', true),
('analytics:view_dept', 'View Department Analytics', 'View department reports', 'analytics', 'view_dept', 'analytics', true),
('analytics:view_system', 'View System Analytics', 'View platform health statistics', 'analytics', 'view_system', 'analytics', true),
('analytics:export', 'Export Analytics', 'Export data to CSV/Excel reports', 'analytics', 'export', 'analytics', true),
('certificate:create', 'Create Certificate Config', 'Design templates and rules', 'certificate', 'create', 'content', true),
('certificate:manage', 'Manage Certificates', 'Audit issued certificates', 'certificate', 'manage', 'content', true),
('certificate:revoke', 'Revoke Certificate', 'Revoke certificate verification', 'certificate', 'revoke', 'content', true),
('notification:send', 'Send Notifications', 'Trigger manual global broadcasts', 'notification', 'send', 'platform', true),
('notification:manage', 'Manage Notifications', 'Configure templates and configurations', 'notification', 'manage', 'platform', true),
('audit:view', 'View Audit Logs', 'Browse platform system-wide audit entries', 'audit', 'view', 'platform', true),
('audit:view_org', 'View Org Audit Logs', 'Browse tenant audit trails', 'audit', 'view_org', 'organization', true),
('config:manage', 'Manage System Config', 'Configure global conditions', 'config', 'manage', 'platform', true),
('feature_flag:manage', 'Manage Feature Flags', 'Toggle code rollout flags', 'feature_flag', 'manage', 'platform', true),
('user:manage', 'Manage Users', 'Search, modify user accounts', 'user', 'manage', 'platform', true),
('user:suspend', 'Suspend Users', 'Lock or suspend accounts', 'user', 'suspend', 'platform', true),
('user:view', 'View User Details', 'Inspect profile metadata', 'user', 'view', 'platform', true)
ON CONFLICT (name) DO NOTHING;

-- 2. Insert Default Roles
INSERT INTO role (id, name, display_name, description, scope, is_system, is_default, hierarchy_level) VALUES
('11111111-1111-1111-1111-111111111111', 'guest', 'Guest', 'Temporary session-only access', 'system', true, false, 0),
('22222222-2222-2222-2222-222222222222', 'user', 'User', 'Default registered user', 'system', true, true, 10),
('33333333-3333-3333-3333-333333333333', 'student', 'Student', 'Organization student role', 'system', true, false, 10),
('44444444-4444-4444-4444-444444444444', 'faculty', 'Faculty', 'Organization educator role', 'system', true, false, 30),
('55555555-5555-5555-5555-555555555555', 'moderator', 'Moderator', 'Marketplace moderator', 'system', true, false, 40),
('66666666-6666-6666-6666-666666666666', 'department_admin', 'Department Admin', 'Department manager', 'system', true, false, 50),
('77777777-7777-7777-7777-777777777777', 'organization_admin', 'Organization Admin', 'Full organization administrator', 'system', true, false, 70),
('88888888-8888-8888-8888-888888888888', 'it_admin', 'IT Admin', 'Organization IT administrator', 'system', true, false, 60),
('99999999-9999-9999-9999-999999999999', 'super_admin', 'Super Admin', 'Full system control', 'system', true, false, 100)
ON CONFLICT (name, organization_id) DO NOTHING;

-- 3. Map Default Role-Permission Relations
-- Helper to map a batch of permissions to a role name
DO $$
DECLARE
    r_id UUID;
    p_id UUID;
BEGIN
    -- Mapping for Guest Role
    SELECT id INTO r_id FROM role WHERE name = 'guest';
    -- Guest can only read quizzes
    SELECT id INTO p_id FROM permission WHERE name = 'quiz:read';
    INSERT INTO role_permission (role_id, permission_id) VALUES (r_id, p_id) ON CONFLICT DO NOTHING;

    -- Mapping for User Role
    SELECT id INTO r_id FROM role WHERE name = 'user';
    FOR p_id IN 
        SELECT id FROM permission WHERE name IN (
            'quiz:create', 'quiz:read', 'quiz:update', 'quiz:delete', 'quiz:publish', 'quiz:archive', 'quiz:clone',
            'question:create', 'question:update', 'question:delete', 'question_bank:read', 'question_bank:write',
            'room:create', 'room:start', 'room:end', 'room:pause', 'marketplace:publish', 'analytics:view', 'certificate:create', 'organization:create'
        )
    LOOP
        INSERT INTO role_permission (role_id, permission_id) VALUES (r_id, p_id) ON CONFLICT DO NOTHING;
    END LOOP;

    -- Mapping for Student Role
    SELECT id INTO r_id FROM role WHERE name = 'student';
    FOR p_id IN 
        SELECT id FROM permission WHERE name IN ('quiz:read', 'quiz:clone', 'question_bank:read', 'organization:read', 'analytics:view')
    LOOP
        INSERT INTO role_permission (role_id, permission_id) VALUES (r_id, p_id) ON CONFLICT DO NOTHING;
    END LOOP;

    -- Mapping for Faculty Role
    SELECT id INTO r_id FROM role WHERE name = 'faculty';
    FOR p_id IN 
        SELECT id FROM permission WHERE name IN (
            'quiz:create', 'quiz:read', 'quiz:update', 'quiz:delete', 'quiz:publish', 'quiz:archive', 'quiz:clone',
            'question:create', 'question:update', 'question:delete', 'question_bank:read', 'question_bank:write',
            'room:create', 'room:start', 'room:end', 'room:pause', 'marketplace:publish', 'organization:read',
            'analytics:view', 'analytics:export', 'certificate:create'
        )
    LOOP
        INSERT INTO role_permission (role_id, permission_id) VALUES (r_id, p_id) ON CONFLICT DO NOTHING;
    END LOOP;

    -- Mapping for Moderator Role
    SELECT id INTO r_id FROM role WHERE name = 'moderator';
    FOR p_id IN 
        SELECT id FROM permission WHERE name IN (
            'quiz:create', 'quiz:read', 'quiz:update', 'quiz:delete', 'quiz:publish', 'quiz:archive', 'quiz:clone',
            'question:create', 'question:update', 'question:delete', 'question_bank:read', 'question_bank:write',
            'room:create', 'room:start', 'room:end', 'room:pause', 'marketplace:publish', 'marketplace:moderate'
        )
    LOOP
        INSERT INTO role_permission (role_id, permission_id) VALUES (r_id, p_id) ON CONFLICT DO NOTHING;
    END LOOP;

    -- Mapping for Department Admin Role
    SELECT id INTO r_id FROM role WHERE name = 'department_admin';
    FOR p_id IN 
        SELECT id FROM permission WHERE name IN (
            'quiz:create', 'quiz:read', 'quiz:update', 'quiz:delete', 'quiz:publish', 'quiz:archive', 'quiz:clone',
            'question:create', 'question:update', 'question:delete', 'question_bank:read', 'question_bank:write',
            'room:create', 'room:start', 'room:end', 'room:pause', 'marketplace:publish', 'organization:read',
            'department:update', 'member:invite', 'member:approve', 'member:remove', 'role:assign', 'analytics:view', 'analytics:export', 'certificate:create', 'audit:view_org'
        )
    LOOP
        INSERT INTO role_permission (role_id, permission_id) VALUES (r_id, p_id) ON CONFLICT DO NOTHING;
    END LOOP;

    -- Mapping for Organization Admin Role
    SELECT id INTO r_id FROM role WHERE name = 'organization_admin';
    FOR p_id IN 
        SELECT id FROM permission WHERE name IN (
            'quiz:create', 'quiz:read', 'quiz:update', 'quiz:delete', 'quiz:publish', 'quiz:archive', 'quiz:clone',
            'question:create', 'question:update', 'question:delete', 'question_bank:read', 'question_bank:write',
            'room:create', 'room:start', 'room:end', 'room:pause', 'marketplace:publish', 'marketplace:moderate',
            'organization:read', 'organization:update', 'organization:configure', 'department:create', 'department:update',
            'member:invite', 'member:approve', 'member:remove', 'role:create', 'role:assign', 'analytics:view', 'analytics:view_org',
            'analytics:export', 'certificate:create', 'audit:view_org'
        )
    LOOP
        INSERT INTO role_permission (role_id, permission_id) VALUES (r_id, p_id) ON CONFLICT DO NOTHING;
    END LOOP;

    -- Mapping for IT Admin Role
    SELECT id INTO r_id FROM role WHERE name = 'it_admin';
    FOR p_id IN 
        SELECT id FROM permission WHERE name IN (
            'organization:read', 'organization:update', 'organization:configure', 'department:create', 'department:update',
            'member:invite', 'member:approve', 'member:remove', 'role:create', 'role:assign', 'analytics:view_org', 'analytics:export', 'audit:view_org'
        )
    LOOP
        INSERT INTO role_permission (role_id, permission_id) VALUES (r_id, p_id) ON CONFLICT DO NOTHING;
    END LOOP;

    -- Note: Super Admin bypasses all checks, but let's assign all permissions for clean relational coverage.
    SELECT id INTO r_id FROM role WHERE name = 'super_admin';
    FOR p_id IN SELECT id FROM permission LOOP
        INSERT INTO role_permission (role_id, permission_id) VALUES (r_id, p_id) ON CONFLICT DO NOTHING;
    END LOOP;
END $$;

-- 4. Seed Categories
INSERT INTO category (name, slug, sort_order, icon) VALUES
('Programming & Dev', 'programming-dev', 1, 'terminal'),
('Science & Tech', 'science-tech', 2, 'flask-conical'),
('Mathematics', 'mathematics', 3, 'percent'),
('English & Languages', 'english-languages', 4, 'quote'),
('Geography & History', 'geography-history', 5, 'globe'),
('General Knowledge', 'general-knowledge', 6, 'help-circle')
ON CONFLICT (slug) DO NOTHING;

-- 5. Seed Default System Badges
INSERT INTO badge (name, description, category, rarity, criteria_type, criteria_value, xp_reward) VALUES
('First Steps', 'Participate in your first quiz session', 'participation', 'common', 'quizzes_played', 1, 100),
('Quiz Enthusiast', 'Play 10 sessions on the platform', 'participation', 'common', 'quizzes_played', 10, 250),
('Grand Master', 'Play 100 sessions on the platform', 'participation', 'epic', 'quizzes_played', 100, 1000),
('Initiate Creator', 'Build and save your first quiz', 'creation', 'common', 'quizzes_created', 1, 100),
('Dedicated Educator', 'Build and save 10 quizzes', 'creation', 'uncommon', 'quizzes_created', 10, 500),
('Knowledge Contributor', 'Publish your first quiz to the marketplace', 'social', 'common', 'marketplace_publishes', 1, 150),
('Community Legend', 'Have your marketplace quizzes cloned 50 times', 'social', 'rare', 'marketplace_clones', 50, 750),
('Consistent Learner', 'Keep a daily activity streak of 7 days', 'mastery', 'uncommon', 'streak_days', 7, 300)
ON CONFLICT (name) DO NOTHING;
