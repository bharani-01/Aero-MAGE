-- Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Common Trigger Functions
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1. Table: user
CREATE TABLE "user" (
    internal_id     BIGSERIAL PRIMARY KEY,
    id              UUID NOT NULL DEFAULT gen_random_uuid(),
    email           VARCHAR(255) NOT NULL,
    email_lower     VARCHAR(255) NOT NULL GENERATED ALWAYS AS (LOWER(email)) STORED,
    password_hash   VARCHAR(255) NULL,  -- NULL for Google-only users
    display_name    VARCHAR(50) NOT NULL,
    avatar_url      VARCHAR(500) NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'unverified',
    is_verified     BOOLEAN NOT NULL DEFAULT FALSE,
    has_password    BOOLEAN NOT NULL DEFAULT FALSE,
    google_id       VARCHAR(100) NULL,
    country         VARCHAR(2) NULL,  -- ISO 3166-1 alpha-2
    timezone        VARCHAR(50) NULL DEFAULT 'UTC',
    last_login_at   TIMESTAMPTZ NULL,
    locked_until    TIMESTAMPTZ NULL,
    failed_login_attempts INTEGER NOT NULL DEFAULT 0,
    deactivated_at  TIMESTAMPTZ NULL,
    version         INTEGER NOT NULL DEFAULT 1,  -- Optimistic locking
    deleted_at      TIMESTAMPTZ NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_user_id UNIQUE (id),
    CONSTRAINT uq_user_email_lower UNIQUE (email_lower),
    CONSTRAINT uq_user_google_id UNIQUE (google_id),
    CONSTRAINT ck_user_status CHECK (status IN ('unverified', 'active', 'locked', 'deactivated', 'suspended')),
    CONSTRAINT ck_user_display_name_length CHECK (LENGTH(display_name) BETWEEN 2 AND 50)
);

CREATE INDEX idx_user_email_lower ON "user" (email_lower) WHERE deleted_at IS NULL;
CREATE INDEX idx_user_status ON "user" (status) WHERE deleted_at IS NULL;
CREATE INDEX idx_user_google_id ON "user" (google_id) WHERE google_id IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_user_display_name ON "user" USING gin (display_name gin_trgm_ops) WHERE deleted_at IS NULL;
CREATE INDEX idx_user_created_at ON "user" (created_at DESC) WHERE deleted_at IS NULL;

CREATE TRIGGER trg_user_updated_at BEFORE UPDATE ON "user"
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- 2. Table: organization
CREATE TABLE organization (
    internal_id     BIGSERIAL PRIMARY KEY,
    id              UUID NOT NULL DEFAULT gen_random_uuid(),
    name            VARCHAR(100) NOT NULL,
    name_lower      VARCHAR(100) NOT NULL GENERATED ALWAYS AS (LOWER(name)) STORED,
    slug            VARCHAR(100) NOT NULL,
    description     VARCHAR(2000) NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'active',
    owner_user_id   UUID NOT NULL REFERENCES "user"(id),
    member_count    INTEGER NOT NULL DEFAULT 1,
    version         INTEGER NOT NULL DEFAULT 1,
    deleted_at      TIMESTAMPTZ NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by      UUID NOT NULL REFERENCES "user"(id),
    updated_by      UUID NULL REFERENCES "user"(id),

    CONSTRAINT uq_organization_id UNIQUE (id),
    CONSTRAINT uq_organization_name_lower UNIQUE (name_lower),
    CONSTRAINT uq_organization_slug UNIQUE (slug),
    CONSTRAINT ck_organization_status CHECK (status IN ('active', 'deactivated', 'suspended')),
    CONSTRAINT ck_organization_name_length CHECK (LENGTH(name) BETWEEN 3 AND 100)
);

CREATE INDEX idx_organization_owner ON organization (owner_user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_organization_status ON organization (status) WHERE deleted_at IS NULL;

CREATE TRIGGER trg_organization_updated_at BEFORE UPDATE ON organization
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- 3. Table: role
CREATE TABLE role (
    internal_id     BIGSERIAL PRIMARY KEY,
    id              UUID NOT NULL DEFAULT gen_random_uuid(),
    name            VARCHAR(50) NOT NULL,
    display_name    VARCHAR(100) NOT NULL,
    description     VARCHAR(500) NULL,
    scope           VARCHAR(20) NOT NULL DEFAULT 'system',
    organization_id UUID NULL REFERENCES organization(id) ON DELETE CASCADE,
    is_system       BOOLEAN NOT NULL DEFAULT FALSE,
    is_default      BOOLEAN NOT NULL DEFAULT FALSE,
    hierarchy_level INTEGER NOT NULL DEFAULT 0,
    deleted_at      TIMESTAMPTZ NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by      UUID NULL REFERENCES "user"(id),
    updated_by      UUID NULL REFERENCES "user"(id),

    CONSTRAINT uq_role_id UNIQUE (id),
    CONSTRAINT uq_role_name_scope UNIQUE (name, organization_id),
    CONSTRAINT ck_role_scope CHECK (scope IN ('system', 'organization')),
    CONSTRAINT ck_role_org_scope CHECK (
        (scope = 'system' AND organization_id IS NULL) OR
        (scope = 'organization' AND organization_id IS NOT NULL)
    )
);

CREATE INDEX idx_role_organization ON role (organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_role_scope ON role (scope) WHERE deleted_at IS NULL;

CREATE TRIGGER trg_role_updated_at BEFORE UPDATE ON role
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- 4. Table: permission
CREATE TABLE permission (
    internal_id     BIGSERIAL PRIMARY KEY,
    id              UUID NOT NULL DEFAULT gen_random_uuid(),
    name            VARCHAR(100) NOT NULL,
    display_name    VARCHAR(200) NOT NULL,
    description     VARCHAR(500) NULL,
    resource        VARCHAR(50) NOT NULL,
    action          VARCHAR(50) NOT NULL,
    category        VARCHAR(50) NOT NULL,
    is_system       BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_permission_id UNIQUE (id),
    CONSTRAINT uq_permission_name UNIQUE (name),
    CONSTRAINT uq_permission_resource_action UNIQUE (resource, action)
);

CREATE INDEX idx_permission_resource ON permission (resource);
CREATE INDEX idx_permission_category ON permission (category);

-- 5. Table: role_permission
CREATE TABLE role_permission (
    internal_id     BIGSERIAL PRIMARY KEY,
    id              UUID NOT NULL DEFAULT gen_random_uuid(),
    role_id         UUID NOT NULL REFERENCES role(id) ON DELETE CASCADE,
    permission_id   UUID NOT NULL REFERENCES permission(id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by      UUID NULL REFERENCES "user"(id),

    CONSTRAINT uq_role_permission_id UNIQUE (id),
    CONSTRAINT uq_role_permission UNIQUE (role_id, permission_id)
);

CREATE INDEX idx_role_permission_role ON role_permission (role_id);
CREATE INDEX idx_role_permission_permission ON role_permission (permission_id);

-- 6. Table: user_role
CREATE TABLE user_role (
    internal_id     BIGSERIAL PRIMARY KEY,
    id              UUID NOT NULL DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    role_id         UUID NOT NULL REFERENCES role(id) ON DELETE CASCADE,
    organization_id UUID NULL REFERENCES organization(id) ON DELETE CASCADE,
    department_id   UUID NULL, -- Will reference department(id) later
    assigned_by     UUID NULL REFERENCES "user"(id),
    assigned_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_user_role_id UNIQUE (id),
    CONSTRAINT uq_user_role UNIQUE (user_id, role_id, organization_id, department_id)
);

CREATE INDEX idx_user_role_user ON user_role (user_id);
CREATE INDEX idx_user_role_role ON user_role (role_id);

-- 7. Table: refresh_token
CREATE TABLE refresh_token (
    internal_id     BIGSERIAL PRIMARY KEY,
    id              UUID NOT NULL DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    token_hash      VARCHAR(255) NOT NULL,
    is_used         BOOLEAN NOT NULL DEFAULT FALSE,
    is_revoked      BOOLEAN NOT NULL DEFAULT FALSE,
    expires_at      TIMESTAMPTZ NOT NULL,
    ip_address      INET NULL,
    user_agent      VARCHAR(500) NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_refresh_token_id UNIQUE (id),
    CONSTRAINT uq_refresh_token_hash UNIQUE (token_hash)
);

-- 8. Table: email_verification_token
CREATE TABLE email_verification_token (
    internal_id     BIGSERIAL PRIMARY KEY,
    id              UUID NOT NULL DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    token_hash      VARCHAR(255) NOT NULL,
    is_used         BOOLEAN NOT NULL DEFAULT FALSE,
    expires_at      TIMESTAMPTZ NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_email_verification_token_id UNIQUE (id),
    CONSTRAINT uq_email_verification_token_hash UNIQUE (token_hash)
);

-- 9. Table: password_reset_token
CREATE TABLE password_reset_token (
    internal_id     BIGSERIAL PRIMARY KEY,
    id              UUID NOT NULL DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    token_hash      VARCHAR(255) NOT NULL,
    is_used         BOOLEAN NOT NULL DEFAULT FALSE,
    expires_at      TIMESTAMPTZ NOT NULL,
    ip_address      INET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_password_reset_token_id UNIQUE (id),
    CONSTRAINT uq_password_reset_token_hash UNIQUE (token_hash)
);

-- 10. Table: login_history
CREATE TABLE login_history (
    internal_id     BIGSERIAL PRIMARY KEY,
    id              UUID NOT NULL DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    login_method    VARCHAR(20) NOT NULL,
    status          VARCHAR(20) NOT NULL,
    ip_address      INET NULL,
    user_agent      VARCHAR(500) NULL,
    device_type     VARCHAR(20) NULL,
    failure_reason  VARCHAR(100) NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_login_history_id UNIQUE (id),
    CONSTRAINT ck_login_history_status CHECK (status IN ('success', 'failed', 'locked'))
);

-- 11. Table: organization_settings
CREATE TABLE organization_settings (
    internal_id         BIGSERIAL PRIMARY KEY,
    id                  UUID NOT NULL DEFAULT gen_random_uuid(),
    organization_id     UUID NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    max_members         INTEGER NOT NULL DEFAULT 500,
    max_quizzes         INTEGER NOT NULL DEFAULT 1000,
    max_questions_per_quiz INTEGER NOT NULL DEFAULT 100,
    max_storage_bytes   BIGINT NOT NULL DEFAULT 10737418240,
    max_sessions_per_day INTEGER NOT NULL DEFAULT 100,
    allow_guest_join    BOOLEAN NOT NULL DEFAULT TRUE,
    require_join_approval BOOLEAN NOT NULL DEFAULT FALSE,
    certificate_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    custom_smtp_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    smtp_host           VARCHAR(255) NULL,
    smtp_port           INTEGER NULL,
    smtp_user           VARCHAR(255) NULL,
    smtp_password_encrypted VARCHAR(500) NULL,
    smtp_from_name      VARCHAR(100) NULL,
    smtp_from_email     VARCHAR(255) NULL,
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by          UUID NULL REFERENCES "user"(id),

    CONSTRAINT uq_org_settings_id UNIQUE (id),
    CONSTRAINT uq_org_settings_org UNIQUE (organization_id)
);

CREATE TRIGGER trg_org_settings_updated_at BEFORE UPDATE ON organization_settings
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- 12. Table: organization_branding
CREATE TABLE organization_branding (
    internal_id         BIGSERIAL PRIMARY KEY,
    id                  UUID NOT NULL DEFAULT gen_random_uuid(),
    organization_id     UUID NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    logo_url            VARCHAR(500) NULL,
    banner_url          VARCHAR(500) NULL,
    primary_color       VARCHAR(7) NOT NULL DEFAULT '#6366F1',
    secondary_color     VARCHAR(7) NOT NULL DEFAULT '#8B5CF6',
    accent_color        VARCHAR(7) NOT NULL DEFAULT '#EC4899',
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by          UUID NULL REFERENCES "user"(id),

    CONSTRAINT uq_org_branding_id UNIQUE (id),
    CONSTRAINT uq_org_branding_org UNIQUE (organization_id),
    CONSTRAINT ck_org_branding_primary CHECK (primary_color ~ '^#[0-9A-Fa-f]{6}$'),
    CONSTRAINT ck_org_branding_secondary CHECK (secondary_color ~ '^#[0-9A-Fa-f]{6}$'),
    CONSTRAINT ck_org_branding_accent CHECK (accent_color ~ '^#[0-9A-Fa-f]{6}$')
);

-- 13. Table: department
CREATE TABLE department (
    internal_id     BIGSERIAL PRIMARY KEY,
    id              UUID NOT NULL DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    name            VARCHAR(100) NOT NULL,
    description     VARCHAR(500) NULL,
    member_count    INTEGER NOT NULL DEFAULT 0,
    deleted_at      TIMESTAMPTZ NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by      UUID NOT NULL REFERENCES "user"(id),
    updated_by      UUID NULL REFERENCES "user"(id),

    CONSTRAINT uq_department_id UNIQUE (id),
    CONSTRAINT uq_department_name_org UNIQUE (organization_id, name) WHERE (deleted_at IS NULL),
    CONSTRAINT ck_department_name_length CHECK (LENGTH(name) BETWEEN 2 AND 100)
);

CREATE INDEX idx_department_org ON department (organization_id) WHERE deleted_at IS NULL;

CREATE TRIGGER trg_department_updated_at BEFORE UPDATE ON department
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- Add department FK references now that table is created
ALTER TABLE user_role ADD CONSTRAINT fk_user_role_dept FOREIGN KEY (department_id) REFERENCES department(id) ON DELETE SET NULL;

-- 14. Table: organization_member
CREATE TABLE organization_member (
    internal_id     BIGSERIAL PRIMARY KEY,
    id              UUID NOT NULL DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    department_id   UUID NULL REFERENCES department(id) ON DELETE SET NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'active',
    joined_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    removed_at      TIMESTAMPTZ NULL,
    invited_by      UUID NULL REFERENCES "user"(id),

    CONSTRAINT uq_org_member_id UNIQUE (id),
    CONSTRAINT uq_org_member UNIQUE (organization_id, user_id),
    CONSTRAINT ck_org_member_status CHECK (status IN ('active', 'suspended', 'removed'))
);

CREATE INDEX idx_org_member_user ON organization_member (user_id);
CREATE INDEX idx_org_member_org_active ON organization_member (organization_id) WHERE status = 'active';

-- 15. Table: invitation
CREATE TABLE invitation (
    internal_id     BIGSERIAL PRIMARY KEY,
    id              UUID NOT NULL DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    invitee_email   VARCHAR(255) NOT NULL,
    role_id         UUID NOT NULL REFERENCES role(id),
    department_id   UUID NULL REFERENCES department(id) ON DELETE SET NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'pending',
    token_hash      VARCHAR(255) NOT NULL,
    is_multi_use    BOOLEAN NOT NULL DEFAULT FALSE,
    max_uses        INTEGER NULL,
    use_count       INTEGER NOT NULL DEFAULT 0,
    expires_at      TIMESTAMPTZ NOT NULL,
    accepted_at     TIMESTAMPTZ NULL,
    invited_by      UUID NOT NULL REFERENCES "user"(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_invitation_id UNIQUE (id),
    CONSTRAINT uq_invitation_token UNIQUE (token_hash),
    CONSTRAINT ck_invitation_status CHECK (status IN ('pending', 'accepted', 'declined', 'expired', 'revoked'))
);

-- 16. Table: join_request
CREATE TABLE join_request (
    internal_id     BIGSERIAL PRIMARY KEY,
    id              UUID NOT NULL DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    status          VARCHAR(20) NOT NULL DEFAULT 'pending',
    message         VARCHAR(500) NULL,
    rejection_reason VARCHAR(500) NULL,
    reviewed_by     UUID NULL REFERENCES "user"(id),
    reviewed_at     TIMESTAMPTZ NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_join_request_id UNIQUE (id),
    CONSTRAINT ck_join_request_status CHECK (status IN ('pending', 'approved', 'rejected', 'withdrawn'))
);

-- 17. Table: category
CREATE TABLE category (
    internal_id     BIGSERIAL PRIMARY KEY,
    id              UUID NOT NULL DEFAULT gen_random_uuid(),
    name            VARCHAR(100) NOT NULL,
    slug            VARCHAR(100) NOT NULL,
    parent_id       UUID NULL REFERENCES category(id),
    icon            VARCHAR(50) NULL,
    sort_order      INTEGER NOT NULL DEFAULT 0,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_category_id UNIQUE (id),
    CONSTRAINT uq_category_slug UNIQUE (slug)
);

-- 18. Table: quiz
CREATE TABLE quiz (
    internal_id         BIGSERIAL PRIMARY KEY,
    id                  UUID NOT NULL DEFAULT gen_random_uuid(),
    title               VARCHAR(200) NOT NULL,
    description         VARCHAR(2000) NULL,
    cover_image_url     VARCHAR(500) NULL,
    status              VARCHAR(20) NOT NULL DEFAULT 'draft',
    visibility          VARCHAR(20) NOT NULL DEFAULT 'private',
    difficulty          VARCHAR(20) NOT NULL DEFAULT 'medium',
    language            VARCHAR(10) NOT NULL DEFAULT 'en',
    category_id         UUID NULL REFERENCES category(id),
    question_count      INTEGER NOT NULL DEFAULT 0,
    total_points        INTEGER NOT NULL DEFAULT 0,
    estimated_duration  INTEGER NULL,
    timer_mode          VARCHAR(20) NOT NULL DEFAULT 'per_question',
    default_time_limit  INTEGER NOT NULL DEFAULT 30,
    total_time_limit    INTEGER NULL,
    shuffle_questions   BOOLEAN NOT NULL DEFAULT FALSE,
    shuffle_options     BOOLEAN NOT NULL DEFAULT FALSE,
    passing_score       INTEGER NULL,
    show_correct_answers BOOLEAN NOT NULL DEFAULT TRUE,
    show_explanations   BOOLEAN NOT NULL DEFAULT TRUE,
    created_by          UUID NOT NULL REFERENCES "user"(id),
    organization_id     UUID NULL REFERENCES organization(id),
    department_id       UUID NULL REFERENCES department(id),
    play_count          INTEGER NOT NULL DEFAULT 0,
    version             INTEGER NOT NULL DEFAULT 1,
    deleted_at          TIMESTAMPTZ NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by          UUID NULL REFERENCES "user"(id),

    CONSTRAINT uq_quiz_id UNIQUE (id),
    CONSTRAINT ck_quiz_status CHECK (status IN ('draft', 'published', 'archived')),
    CONSTRAINT ck_quiz_visibility CHECK (visibility IN ('private', 'department', 'organization', 'public')),
    CONSTRAINT ck_quiz_difficulty CHECK (difficulty IN ('easy', 'medium', 'hard', 'expert')),
    CONSTRAINT ck_quiz_timer_mode CHECK (timer_mode IN ('per_question', 'total')),
    CONSTRAINT ck_quiz_title_length CHECK (LENGTH(title) BETWEEN 3 AND 200),
    CONSTRAINT ck_quiz_time_limit CHECK (default_time_limit BETWEEN 5 AND 300)
);

CREATE INDEX idx_quiz_created_by ON quiz (created_by) WHERE deleted_at IS NULL;
CREATE INDEX idx_quiz_org ON quiz (organization_id) WHERE organization_id IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_quiz_status_visibility ON quiz (status, visibility) WHERE deleted_at IS NULL;

CREATE TRIGGER trg_quiz_updated_at BEFORE UPDATE ON quiz
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- 19. Table: quiz_tag
CREATE TABLE quiz_tag (
    internal_id BIGSERIAL PRIMARY KEY,
    quiz_id     UUID NOT NULL REFERENCES quiz(id) ON DELETE CASCADE,
    tag_name    VARCHAR(30) NOT NULL,
    tag_lower   VARCHAR(30) NOT NULL GENERATED ALWAYS AS (LOWER(tag_name)) STORED,

    CONSTRAINT uq_quiz_tag UNIQUE (quiz_id, tag_lower)
);

-- 20. Table: question
CREATE TABLE question (
    internal_id         BIGSERIAL PRIMARY KEY,
    id                  UUID NOT NULL DEFAULT gen_random_uuid(),
    quiz_id             UUID NULL REFERENCES quiz(id) ON DELETE CASCADE,
    question_bank_entry_id UUID NULL,
    type                VARCHAR(30) NOT NULL,
    title               TEXT NOT NULL,
    description         TEXT NULL,
    explanation         TEXT NULL,
    hint                VARCHAR(500) NULL,
    points              INTEGER NOT NULL DEFAULT 1000,
    time_limit          INTEGER NOT NULL DEFAULT 30,
    sort_order          INTEGER NOT NULL DEFAULT 0,
    difficulty          VARCHAR(20) NOT NULL DEFAULT 'medium',
    is_required         BOOLEAN NOT NULL DEFAULT TRUE,
    is_scored           BOOLEAN NOT NULL DEFAULT TRUE,
    settings            JSONB NOT NULL DEFAULT '{}',
    created_by          UUID NOT NULL REFERENCES "user"(id),
    deleted_at          TIMESTAMPTZ NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by          UUID NULL REFERENCES "user"(id),

    CONSTRAINT uq_question_id UNIQUE (id),
    CONSTRAINT ck_question_type CHECK (type IN (
        'single_choice', 'multiple_choice', 'true_false', 'fill_blank',
        'ordering', 'matching', 'image', 'audio', 'video', 'code', 'numerical',
        'formula', 'poll', 'survey', 'drawing', 'hotspot', 'drag_drop',
        'timeline', 'word_cloud', 'essay', 'case_study', 'puzzle'
    )),
    CONSTRAINT ck_question_points CHECK (points >= 0),
    CONSTRAINT ck_question_time_limit CHECK (time_limit BETWEEN 5 AND 300)
);

CREATE INDEX idx_question_quiz ON question (quiz_id, sort_order) WHERE deleted_at IS NULL;

CREATE TRIGGER trg_question_updated_at BEFORE UPDATE ON question
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- 21. Table: question_option
CREATE TABLE question_option (
    internal_id     BIGSERIAL PRIMARY KEY,
    id              UUID NOT NULL DEFAULT gen_random_uuid(),
    question_id     UUID NOT NULL REFERENCES question(id) ON DELETE CASCADE,
    content         TEXT NOT NULL,
    is_correct      BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order      INTEGER NOT NULL DEFAULT 0,
    match_target    VARCHAR(500) NULL,
    explanation     TEXT NULL,
    metadata        JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT uq_question_option_id UNIQUE (id)
);

-- 22. Table: question_media
CREATE TABLE question_media (
    internal_id     BIGSERIAL PRIMARY KEY,
    id              UUID NOT NULL DEFAULT gen_random_uuid(),
    question_id     UUID NOT NULL REFERENCES question(id) ON DELETE CASCADE,
    media_type      VARCHAR(20) NOT NULL,
    file_url        VARCHAR(500) NOT NULL,
    file_size       INTEGER NOT NULL,
    mime_type       VARCHAR(100) NOT NULL,
    alt_text        VARCHAR(255) NULL,
    sort_order      INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_question_media_id UNIQUE (id),
    CONSTRAINT ck_question_media_type CHECK (media_type IN ('image', 'audio', 'video'))
);

-- 23. Table: question_bank_entry
CREATE TABLE question_bank_entry (
    internal_id     BIGSERIAL PRIMARY KEY,
    id              UUID NOT NULL DEFAULT gen_random_uuid(),
    question_id     UUID NOT NULL REFERENCES question(id) ON DELETE CASCADE,
    ownership       VARCHAR(20) NOT NULL DEFAULT 'private',
    owner_user_id   UUID NOT NULL REFERENCES "user"(id),
    organization_id UUID NULL REFERENCES organization(id),
    department_id   UUID NULL REFERENCES department(id),
    usage_count     INTEGER NOT NULL DEFAULT 0,
    deleted_at      TIMESTAMPTZ NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_question_bank_entry_id UNIQUE (id),
    CONSTRAINT ck_qb_ownership CHECK (ownership IN ('private', 'department', 'organization', 'public', 'shared'))
);

-- 24. Table: session
CREATE TABLE session (
    internal_id         BIGSERIAL PRIMARY KEY,
    id                  UUID NOT NULL DEFAULT gen_random_uuid(),
    quiz_id             UUID NOT NULL REFERENCES quiz(id),
    host_user_id        UUID NOT NULL REFERENCES "user"(id),
    room_code           VARCHAR(6) NOT NULL,
    status              VARCHAR(20) NOT NULL DEFAULT 'draft',
    mode                VARCHAR(20) NOT NULL DEFAULT 'live',
    participant_count   INTEGER NOT NULL DEFAULT 0,
    max_participants    INTEGER NOT NULL DEFAULT 500,
    current_question_index INTEGER NOT NULL DEFAULT -1,
    total_questions     INTEGER NOT NULL DEFAULT 0,
    allow_late_join     BOOLEAN NOT NULL DEFAULT TRUE,
    is_room_locked      BOOLEAN NOT NULL DEFAULT FALSE,
    show_leaderboard    BOOLEAN NOT NULL DEFAULT TRUE,
    xp_multiplier       DECIMAL(3,2) NOT NULL DEFAULT 1.00,
    countdown_seconds   INTEGER NOT NULL DEFAULT 3,
    organization_id     UUID NULL REFERENCES organization(id),
    scheduled_at        TIMESTAMPTZ NULL,
    started_at          TIMESTAMPTZ NULL,
    completed_at        TIMESTAMPTZ NULL,
    duration            INTEGER NULL,
    settings            JSONB NOT NULL DEFAULT '{}',
    version             INTEGER NOT NULL DEFAULT 1,
    deleted_at          TIMESTAMPTZ NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_session_id UNIQUE (id),
    CONSTRAINT ck_session_status CHECK (status IN (
        'draft', 'scheduled', 'lobby', 'countdown', 'live', 'paused',
        'question_result', 'completed', 'cancelled', 'abandoned', 'archived'
    )),
    CONSTRAINT ck_session_mode CHECK (mode IN (
        'live', 'practice', 'flash', 'team_battle', 'tournament', 'poll', 'survey'
    )),
    CONSTRAINT ck_session_xp CHECK (xp_multiplier BETWEEN 0.50 AND 3.00)
);

CREATE UNIQUE INDEX uq_session_room_code_active ON session (room_code)
    WHERE status IN ('lobby', 'countdown', 'live', 'paused', 'question_result');

-- 25. Table: session_participant
CREATE TABLE session_participant (
    internal_id     BIGSERIAL PRIMARY KEY,
    id              UUID NOT NULL DEFAULT gen_random_uuid(),
    session_id      UUID NOT NULL REFERENCES session(id) ON DELETE CASCADE,
    user_id         UUID NULL REFERENCES "user"(id),
    guest_nickname  VARCHAR(20) NULL,
    is_guest        BOOLEAN NOT NULL DEFAULT FALSE,
    status          VARCHAR(20) NOT NULL DEFAULT 'in_lobby',
    total_score     INTEGER NOT NULL DEFAULT 0,
    correct_answers INTEGER NOT NULL DEFAULT 0,
    total_answered  INTEGER NOT NULL DEFAULT 0,
    average_response_time DECIMAL(8,3) NULL,
    final_rank      INTEGER NULL,
    xp_earned       INTEGER NOT NULL DEFAULT 0,
    joined_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    left_at         TIMESTAMPTZ NULL,
    last_active_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_session_participant_id UNIQUE (id),
    CONSTRAINT uq_session_participant_user UNIQUE (session_id, user_id),
    CONSTRAINT uq_session_participant_guest UNIQUE (session_id, guest_nickname),
    CONSTRAINT ck_session_participant_type CHECK (
        (is_guest = TRUE AND guest_nickname IS NOT NULL AND user_id IS NULL) OR
        (is_guest = FALSE AND user_id IS NOT NULL)
    )
);

-- 26. Table: session_response
CREATE TABLE session_response (
    internal_id         BIGSERIAL PRIMARY KEY,
    id                  UUID NOT NULL DEFAULT gen_random_uuid(),
    session_id          UUID NOT NULL REFERENCES session(id) ON DELETE CASCADE,
    participant_id      UUID NOT NULL REFERENCES session_participant(id) ON DELETE CASCADE,
    question_id         UUID NOT NULL REFERENCES question(id),
    question_index      INTEGER NOT NULL,
    answer_data         JSONB NOT NULL,
    is_correct          BOOLEAN NULL,
    points_awarded      INTEGER NOT NULL DEFAULT 0,
    response_time       DECIMAL(8,3) NOT NULL,
    submitted_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_session_response_id UNIQUE (id),
    CONSTRAINT uq_session_response_unique UNIQUE (session_id, participant_id, question_id)
);

-- 27. Table: session_leaderboard
CREATE TABLE session_leaderboard (
    internal_id     BIGSERIAL PRIMARY KEY,
    id              UUID NOT NULL DEFAULT gen_random_uuid(),
    session_id      UUID NOT NULL REFERENCES session(id) ON DELETE CASCADE,
    question_index  INTEGER NOT NULL,
    entries         JSONB NOT NULL,
    computed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_session_leaderboard_id UNIQUE (id),
    CONSTRAINT uq_session_leaderboard UNIQUE (session_id, question_index)
);

-- 28. Table: session_question_state
CREATE TABLE session_question_state (
    internal_id     BIGSERIAL PRIMARY KEY,
    id              UUID NOT NULL DEFAULT gen_random_uuid(),
    session_id      UUID NOT NULL REFERENCES session(id) ON DELETE CASCADE,
    question_index  INTEGER NOT NULL,
    question_id     UUID NOT NULL REFERENCES question(id),
    status          VARCHAR(20) NOT NULL DEFAULT 'pending',
    started_at      TIMESTAMPTZ NULL,
    time_remaining  INTEGER NULL,
    answers_received INTEGER NOT NULL DEFAULT 0,
    completed_at    TIMESTAMPTZ NULL,

    CONSTRAINT uq_session_question_state_id UNIQUE (id),
    CONSTRAINT uq_session_question_state UNIQUE (session_id, question_index)
);

-- 29. Table: marketplace_listing
CREATE TABLE marketplace_listing (
    internal_id     BIGSERIAL PRIMARY KEY,
    id              UUID NOT NULL DEFAULT gen_random_uuid(),
    quiz_id         UUID NOT NULL REFERENCES quiz(id),
    creator_user_id UUID NOT NULL REFERENCES "user"(id),
    status          VARCHAR(20) NOT NULL DEFAULT 'published',
    title           VARCHAR(200) NOT NULL,
    description     VARCHAR(2000) NULL,
    category_id     UUID NULL REFERENCES category(id),
    difficulty      VARCHAR(20) NOT NULL DEFAULT 'medium',
    language        VARCHAR(10) NOT NULL DEFAULT 'en',
    question_count  INTEGER NOT NULL DEFAULT 0,
    clone_count     INTEGER NOT NULL DEFAULT 0,
    rating_count    INTEGER NOT NULL DEFAULT 0,
    rating_sum      INTEGER NOT NULL DEFAULT 0,
    average_rating  DECIMAL(3,2) NOT NULL DEFAULT 0.00,
    favorite_count  INTEGER NOT NULL DEFAULT 0,
    view_count      INTEGER NOT NULL DEFAULT 0,
    report_count    INTEGER NOT NULL DEFAULT 0,
    is_featured     BOOLEAN NOT NULL DEFAULT FALSE,
    trending_score  DECIMAL(10,4) NOT NULL DEFAULT 0.0000,
    published_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    hidden_at       TIMESTAMPTZ NULL,
    removed_at      TIMESTAMPTZ NULL,
    removed_reason  VARCHAR(500) NULL,
    deleted_at      TIMESTAMPTZ NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_marketplace_listing_id UNIQUE (id),
    CONSTRAINT ck_marketplace_listing_status CHECK (status IN ('published', 'hidden', 'unpublished', 'removed'))
);

CREATE INDEX idx_marketplace_listing_status ON marketplace_listing (status) WHERE deleted_at IS NULL;
CREATE INDEX idx_marketplace_listing_trending ON marketplace_listing (trending_score DESC) WHERE status = 'published' AND deleted_at IS NULL;

-- 30. Table: marketplace_rating
CREATE TABLE marketplace_rating (
    internal_id     BIGSERIAL PRIMARY KEY,
    id              UUID NOT NULL DEFAULT gen_random_uuid(),
    listing_id      UUID NOT NULL REFERENCES marketplace_listing(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    rating          INTEGER NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_marketplace_rating_id UNIQUE (id),
    CONSTRAINT uq_marketplace_rating UNIQUE (listing_id, user_id),
    CONSTRAINT ck_marketplace_rating CHECK (rating BETWEEN 1 AND 5)
);

-- 31. Table: marketplace_favorite
CREATE TABLE marketplace_favorite (
    internal_id     BIGSERIAL PRIMARY KEY,
    listing_id      UUID NOT NULL REFERENCES marketplace_listing(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_marketplace_favorite UNIQUE (listing_id, user_id)
);

-- 32. Table: marketplace_bookmark
CREATE TABLE marketplace_bookmark (
    internal_id     BIGSERIAL PRIMARY KEY,
    listing_id      UUID NOT NULL REFERENCES marketplace_listing(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_marketplace_bookmark UNIQUE (listing_id, user_id)
);

-- 33. Table: marketplace_report
CREATE TABLE marketplace_report (
    internal_id     BIGSERIAL PRIMARY KEY,
    id              UUID NOT NULL DEFAULT gen_random_uuid(),
    listing_id      UUID NOT NULL REFERENCES marketplace_listing(id) ON DELETE CASCADE,
    reporter_id     UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    reason          VARCHAR(50) NOT NULL,
    description     VARCHAR(500) NULL,
    status          VARCHAR(30) NOT NULL DEFAULT 'open',
    reviewed_by     UUID NULL REFERENCES "user"(id),
    reviewed_at     TIMESTAMPTZ NULL,
    resolution_note VARCHAR(500) NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_marketplace_report_id UNIQUE (id),
    CONSTRAINT uq_marketplace_report_user UNIQUE (listing_id, reporter_id)
);

-- 34. Table: marketplace_collection
CREATE TABLE marketplace_collection (
    internal_id     BIGSERIAL PRIMARY KEY,
    id              UUID NOT NULL DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    name            VARCHAR(200) NOT NULL,
    description     VARCHAR(1000) NULL,
    is_public       BOOLEAN NOT NULL DEFAULT TRUE,
    item_count      INTEGER NOT NULL DEFAULT 0,
    deleted_at      TIMESTAMPTZ NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_marketplace_collection_id UNIQUE (id)
);

-- 35. Table: marketplace_collection_item
CREATE TABLE marketplace_collection_item (
    internal_id     BIGSERIAL PRIMARY KEY,
    collection_id   UUID NOT NULL REFERENCES marketplace_collection(id) ON DELETE CASCADE,
    listing_id      UUID NOT NULL REFERENCES marketplace_listing(id) ON DELETE CASCADE,
    sort_order      INTEGER NOT NULL DEFAULT 0,
    added_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_collection_item UNIQUE (collection_id, listing_id)
);

-- 36. Table: user_gamification
CREATE TABLE user_gamification (
    internal_id     BIGSERIAL PRIMARY KEY,
    id              UUID NOT NULL DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    total_xp        BIGINT NOT NULL DEFAULT 0,
    current_level   INTEGER NOT NULL DEFAULT 1,
    xp_to_next_level INTEGER NOT NULL DEFAULT 100,
    total_coins     INTEGER NOT NULL DEFAULT 0,
    current_title   VARCHAR(100) NULL,
    quizzes_played  INTEGER NOT NULL DEFAULT 0,
    quizzes_created INTEGER NOT NULL DEFAULT 0,
    quizzes_won     INTEGER NOT NULL DEFAULT 0,
    total_correct   INTEGER NOT NULL DEFAULT 0,
    total_answered  INTEGER NOT NULL DEFAULT 0,
    total_sessions  INTEGER NOT NULL DEFAULT 0,
    marketplace_publishes INTEGER NOT NULL DEFAULT 0,
    marketplace_clones INTEGER NOT NULL DEFAULT 0,
    daily_xp_earned INTEGER NOT NULL DEFAULT 0,
    daily_xp_date   DATE NOT NULL DEFAULT CURRENT_DATE,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_user_gamification_id UNIQUE (id),
    CONSTRAINT uq_user_gamification_user UNIQUE (user_id),
    CONSTRAINT ck_user_gamification_xp CHECK (total_xp >= 0),
    CONSTRAINT ck_user_gamification_coins CHECK (total_coins >= 0),
    CONSTRAINT ck_user_gamification_level CHECK (current_level >= 1)
);

CREATE TRIGGER trg_user_gamification_updated_at BEFORE UPDATE ON user_gamification
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- 37. Table: badge
CREATE TABLE badge (
    internal_id     BIGSERIAL PRIMARY KEY,
    id              UUID NOT NULL DEFAULT gen_random_uuid(),
    name            VARCHAR(100) NOT NULL,
    description     VARCHAR(500) NOT NULL,
    icon_url        VARCHAR(500) NULL,
    category        VARCHAR(30) NOT NULL,
    rarity          VARCHAR(20) NOT NULL DEFAULT 'common',
    criteria_type   VARCHAR(50) NOT NULL,
    criteria_value  INTEGER NOT NULL,
    xp_reward       INTEGER NOT NULL DEFAULT 0,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order      INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_badge_id UNIQUE (id),
    CONSTRAINT uq_badge_name UNIQUE (name)
);

-- 38. Table: user_badge
CREATE TABLE user_badge (
    internal_id     BIGSERIAL PRIMARY KEY,
    id              UUID NOT NULL DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    badge_id        UUID NOT NULL REFERENCES badge(id) ON DELETE CASCADE,
    earned_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_pinned       BOOLEAN NOT NULL DEFAULT FALSE,

    CONSTRAINT uq_user_badge_id UNIQUE (id),
    CONSTRAINT uq_user_badge UNIQUE (user_id, badge_id)
);

CREATE INDEX idx_user_badge_user ON user_badge (user_id);

-- 39. Table: achievement
CREATE TABLE achievement (
    internal_id     BIGSERIAL PRIMARY KEY,
    id              UUID NOT NULL DEFAULT gen_random_uuid(),
    name            VARCHAR(100) NOT NULL,
    description     VARCHAR(500) NOT NULL,
    icon_url        VARCHAR(500) NULL,
    category        VARCHAR(30) NOT NULL,
    tiers           JSONB NOT NULL DEFAULT '[]',
    max_tier        INTEGER NOT NULL DEFAULT 1,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_achievement_id UNIQUE (id),
    CONSTRAINT uq_achievement_name UNIQUE (name)
);

-- 40. Table: user_achievement
CREATE TABLE user_achievement (
    internal_id     BIGSERIAL PRIMARY KEY,
    id              UUID NOT NULL DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    achievement_id  UUID NOT NULL REFERENCES achievement(id) ON DELETE CASCADE,
    current_tier    INTEGER NOT NULL DEFAULT 1,
    current_progress INTEGER NOT NULL DEFAULT 0,
    completed_at    TIMESTAMPTZ NULL,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_user_achievement_id UNIQUE (id),
    CONSTRAINT uq_user_achievement UNIQUE (user_id, achievement_id)
);

-- 41. Table: user_streak
CREATE TABLE user_streak (
    internal_id         BIGSERIAL PRIMARY KEY,
    id                  UUID NOT NULL DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    current_streak      INTEGER NOT NULL DEFAULT 0,
    longest_streak      INTEGER NOT NULL DEFAULT 0,
    last_activity_date  DATE NULL,
    streak_started_at   DATE NULL,
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_user_streak_id UNIQUE (id),
    CONSTRAINT uq_user_streak_user UNIQUE (user_id)
);

-- 42. Table: global_leaderboard
CREATE TABLE global_leaderboard (
    internal_id     BIGSERIAL PRIMARY KEY,
    user_id         UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    total_xp        BIGINT NOT NULL DEFAULT 0,
    rank            INTEGER NULL,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_global_leaderboard_user UNIQUE (user_id)
);

CREATE INDEX idx_global_leaderboard_rank ON global_leaderboard (total_xp DESC);

-- 43. Table: season_leaderboard
CREATE TABLE season_leaderboard (
    internal_id     BIGSERIAL PRIMARY KEY,
    user_id         UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    season_year     INTEGER NOT NULL,
    season_month    INTEGER NOT NULL,
    season_xp       BIGINT NOT NULL DEFAULT 0,
    rank            INTEGER NULL,

    CONSTRAINT uq_season_leaderboard UNIQUE (user_id, season_year, season_month)
);

-- 44. Table: heatmap_entry
CREATE TABLE heatmap_entry (
    internal_id     BIGSERIAL PRIMARY KEY,
    user_id         UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    activity_date   DATE NOT NULL,
    activity_count  INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT uq_heatmap_entry UNIQUE (user_id, activity_date)
);

-- 45. Table: user_profile
CREATE TABLE user_profile (
    internal_id     BIGSERIAL PRIMARY KEY,
    id              UUID NOT NULL DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    bio             VARCHAR(500) NULL,
    banner_url      VARCHAR(500) NULL,
    website_url     VARCHAR(255) NULL,
    location        VARCHAR(100) NULL,
    follower_count  INTEGER NOT NULL DEFAULT 0,
    following_count INTEGER NOT NULL DEFAULT 0,
    is_public       BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_user_profile_id UNIQUE (id),
    CONSTRAINT uq_user_profile_user UNIQUE (user_id)
);

-- 46. Table: follow
CREATE TABLE follow (
    internal_id     BIGSERIAL PRIMARY KEY,
    follower_id     UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    followed_id     UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_follow UNIQUE (follower_id, followed_id),
    CONSTRAINT ck_follow_no_self CHECK (follower_id != followed_id)
);

-- 47. Table: activity_feed
CREATE TABLE activity_feed (
    internal_id     BIGSERIAL PRIMARY KEY,
    id              UUID NOT NULL DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    activity_type   VARCHAR(50) NOT NULL,
    title           VARCHAR(200) NOT NULL,
    description     VARCHAR(500) NULL,
    reference_type  VARCHAR(50) NULL,
    reference_id    UUID NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_activity_feed_id UNIQUE (id)
);

CREATE INDEX idx_activity_feed_user ON activity_feed (user_id, created_at DESC);
