# 02 — Business Rules

**Document ID:** AERO-BR-002  
**Version:** 1.0  
**Last Updated:** 2026-07-16  
**Author:** Business Analyst  
**Status:** Approved  
**Classification:** Internal — Engineering

---

## Table of Contents

1. [Purpose](#1-purpose)
2. [Document Conventions](#2-document-conventions)
3. [Authentication & Identity Rules](#3-authentication--identity-rules)
4. [User Account Rules](#4-user-account-rules)
5. [Organization Rules](#5-organization-rules)
6. [Department Rules](#6-department-rules)
7. [RBAC Rules](#7-rbac-rules)
8. [Quiz Rules](#8-quiz-rules)
9. [Question Rules](#9-question-rules)
10. [Question Bank Rules](#10-question-bank-rules)
11. [Live Session Rules](#11-live-session-rules)
12. [Game Mode Rules](#12-game-mode-rules)
13. [Marketplace Rules](#13-marketplace-rules)
14. [Gamification Rules](#14-gamification-rules)
15. [Leaderboard Rules](#15-leaderboard-rules)
16. [Profile Rules](#16-profile-rules)
17. [Certificate Rules](#17-certificate-rules)
18. [Analytics Rules](#18-analytics-rules)
19. [Notification Rules](#19-notification-rules)
20. [Search Rules](#20-search-rules)
21. [File Upload Rules](#21-file-upload-rules)
22. [Audit Rules](#22-audit-rules)
23. [Feature Flag Rules](#23-feature-flag-rules)
24. [Data Retention Rules](#24-data-retention-rules)
25. [Rate Limiting Rules](#25-rate-limiting-rules)
26. [References](#26-references)

---

## 1. Purpose

This document codifies every business rule governing the Aero MAGE platform. Business rules are constraints, policies, and regulations that define or restrict the behavior of the system. They are the single source of truth for how the platform behaves in every scenario.

Every rule in this document:
- Has a unique identifier (BR-DOMAIN-NNN)
- Is testable and verifiable
- Is enforceable in code (server-side)
- Is referenced by the [Requirements Traceability Matrix](./56-requirements-traceability-matrix.md)

**All business rules are enforced server-side.** Client-side enforcement is for UX convenience only and MUST NOT be relied upon for security or data integrity.

---

## 2. Document Conventions

- **MUST** — The rule is mandatory. Violation is a critical bug.
- **MUST NOT** — The rule prohibits an action. Violation is a critical bug.
- **SHOULD** — The rule is strongly recommended. Deviation requires documented justification.
- **MAY** — The rule is optional or configurable.
- **Configurable** — The threshold or value can be changed via system configuration.

---

## 3. Authentication & Identity Rules

### Registration

| ID | Rule | Enforcement |
|----|------|-------------|
| BR-AUTH-001 | A user MUST provide a valid email address, password, and display name to register. | Server validation |
| BR-AUTH-002 | Email addresses MUST be unique across the platform (case-insensitive). | Database unique constraint (lowercase) |
| BR-AUTH-003 | Passwords MUST be at least 8 characters and contain at least 1 uppercase letter, 1 lowercase letter, 1 digit, and 1 special character. | Server validation |
| BR-AUTH-004 | Passwords MUST be hashed using bcrypt with a minimum cost factor of 12 before storage. | Service layer |
| BR-AUTH-005 | A verification email MUST be sent upon registration. The token expires after 24 hours (configurable). | Service layer |
| BR-AUTH-006 | Unverified accounts MAY access the platform with limited functionality (cannot create organizations or publish to marketplace). | Middleware |
| BR-AUTH-007 | Registration MUST be rate-limited to 3 attempts per hour per IP address. | Rate limiter |
| BR-AUTH-008 | Display names MUST be between 2 and 50 characters. | Server validation |
| BR-AUTH-009 | Display names MUST NOT contain profanity (validated against profanity filter). | Server validation |
| BR-AUTH-010 | A user MUST NOT be able to register with a disposable email domain (configurable blocklist). | Server validation |

### Login

| ID | Rule | Enforcement |
|----|------|-------------|
| BR-AUTH-011 | Login MUST be rate-limited to 5 attempts per minute per IP address. | Rate limiter |
| BR-AUTH-012 | After 10 consecutive failed login attempts, the account MUST be temporarily locked for 30 minutes (configurable). | Service layer |
| BR-AUTH-013 | Login error messages MUST NOT reveal whether the email exists ("Invalid email or password"). | Controller |
| BR-AUTH-014 | Successful login MUST return an access token (JWT, 15-minute expiry) and a refresh token (7-day expiry). | Service layer |
| BR-AUTH-015 | Login events MUST be logged with IP address, user agent, and timestamp. | Audit service |

### JWT & Tokens

| ID | Rule | Enforcement |
|----|------|-------------|
| BR-AUTH-016 | Access tokens MUST expire after 15 minutes (configurable). | JWT configuration |
| BR-AUTH-017 | Refresh tokens MUST expire after 7 days (configurable). | JWT configuration |
| BR-AUTH-018 | Refresh tokens MUST be single-use. After a refresh token is used, it MUST be invalidated and a new one issued. | Service layer |
| BR-AUTH-019 | If a previously used (invalidated) refresh token is presented, ALL refresh tokens for that user MUST be revoked (potential token theft). | Service layer |
| BR-AUTH-020 | Changing a password MUST invalidate ALL existing refresh tokens for that user. | Service layer |
| BR-AUTH-021 | Access tokens MUST contain: user ID, email, role, and token type. | JWT payload |
| BR-AUTH-022 | Refresh tokens MUST be stored in the database (not stateless) to support revocation. | Database |

### Google OAuth

| ID | Rule | Enforcement |
|----|------|-------------|
| BR-AUTH-023 | Google OAuth login MUST create a new user account if one does not exist for the Google email. | Service layer |
| BR-AUTH-024 | If a user registered with email/password and later logs in with Google using the same email, the accounts MUST be linked (not duplicated). | Service layer |
| BR-AUTH-025 | Google OAuth users who have no password set MAY set a password at any time to enable email/password login. | Service layer |

### Guest Access

| ID | Rule | Enforcement |
|----|------|-------------|
| BR-AUTH-026 | Guest users MUST only be able to join live sessions. They MUST NOT access any other platform feature. | Middleware |
| BR-AUTH-027 | Guest users MUST provide a nickname to join a session. | Server validation |
| BR-AUTH-028 | Guest nicknames MUST be unique within a session. | Service layer |
| BR-AUTH-029 | Guest nicknames MUST NOT contain profanity. | Server validation |
| BR-AUTH-030 | Guest nicknames MUST be between 2 and 20 characters. | Server validation |
| BR-AUTH-031 | Guest users MUST NOT earn XP, badges, achievements, or any gamification rewards. | Service layer |
| BR-AUTH-032 | Guest participation data MUST be stored in the session record but NOT associated with any persistent user account. | Service layer |
| BR-AUTH-033 | Guest users MUST NOT be able to access session history, quiz history, or any historical data. | Middleware |
| BR-AUTH-034 | Guest users MUST NOT have a profile. | Middleware |

### Password Reset

| ID | Rule | Enforcement |
|----|------|-------------|
| BR-AUTH-035 | Password reset tokens MUST expire after 1 hour (configurable). | Service layer |
| BR-AUTH-036 | Password reset MUST be rate-limited to 3 requests per hour per email. | Rate limiter |
| BR-AUTH-037 | Password reset response MUST NOT reveal whether the email exists ("If this email is registered, you will receive a reset link"). | Controller |
| BR-AUTH-038 | After a successful password reset, all existing refresh tokens MUST be invalidated. | Service layer |

---

## 4. User Account Rules

| ID | Rule | Enforcement |
|----|------|-------------|
| BR-USER-001 | Every user MUST have a unique UUID as their primary identifier. Sequential IDs MUST NOT be exposed externally. | Database |
| BR-USER-002 | Users MUST be able to update their display name, bio, avatar, and banner. | Service layer |
| BR-USER-003 | Bios MUST be limited to 500 characters. | Server validation |
| BR-USER-004 | A user MAY deactivate their account. Deactivated accounts are soft-deleted (not permanently removed). | Service layer |
| BR-USER-005 | Deactivated accounts MUST NOT appear in search results, followers lists, or public profiles. | Query filters |
| BR-USER-006 | Deactivated accounts MAY be reactivated by the user within 30 days by logging in. After 30 days, the account enters a permanent deletion queue. | Scheduler |
| BR-USER-007 | A user MUST NOT be able to follow themselves. | Server validation |
| BR-USER-008 | Follow/unfollow actions MUST be idempotent (following someone you already follow has no effect). | Service layer |
| BR-USER-009 | A user's email MUST NOT be publicly visible on their profile (only display name). | API response filtering |
| BR-USER-010 | Users MUST NOT be able to change their email without re-verification. | Service layer |
| BR-USER-011 | Display name changes MUST be limited to 3 per 24 hours. | Rate limiter |
| BR-USER-012 | Users MUST be searchable by display name (partial match). | Query layer |

---

## 5. Organization Rules

### Creation & Configuration

| ID | Rule | Enforcement |
|----|------|-------------|
| BR-ORG-001 | Only registered (non-guest) users with verified emails MAY create organizations. | Middleware |
| BR-ORG-002 | The user who creates an organization MUST automatically be assigned the "Organization Admin" role for that organization. | Service layer |
| BR-ORG-003 | Organization names MUST be unique across the platform (case-insensitive). | Database unique constraint |
| BR-ORG-004 | Organization names MUST be between 3 and 100 characters. | Server validation |
| BR-ORG-005 | An organization MUST have at least one Organization Admin at all times. The last admin MUST NOT be removable. | Service layer |
| BR-ORG-006 | Organization logos MUST be images (JPEG, PNG, WebP) with a maximum size of 2 MB. | File validation |
| BR-ORG-007 | Organization banners MUST be images (JPEG, PNG, WebP) with a maximum size of 5 MB. | File validation |
| BR-ORG-008 | Organization theme colors MUST be valid hex color codes. | Server validation |

### Limits

| ID | Rule | Enforcement |
|----|------|-------------|
| BR-ORG-009 | Organization limits (max users, max quizzes, max questions per quiz, max storage) MUST be configurable by Super Admins. | System configuration |
| BR-ORG-010 | Default organization limits: max 500 users, 1000 quizzes, 100 questions per quiz, 10 GB storage. | Default configuration |
| BR-ORG-011 | When an organization reaches its user limit, new member invitations MUST be rejected with a clear error message. | Service layer |
| BR-ORG-012 | When an organization reaches its quiz limit, new quiz creation MUST be rejected with a clear error message. | Service layer |
| BR-ORG-013 | When an organization reaches its storage limit, new file uploads MUST be rejected. | Service layer |
| BR-ORG-014 | Organization limits MUST be checked before every create/upload operation, not just at the UI level. | Service layer |

### Members

| ID | Rule | Enforcement |
|----|------|-------------|
| BR-ORG-015 | Members MAY be invited via email or via a shareable invitation link. | Service layer |
| BR-ORG-016 | Invitation links MUST expire after 7 days (configurable). | Service layer |
| BR-ORG-017 | Invitation links MUST be single-use OR multi-use (configurable per invitation). | Service layer |
| BR-ORG-018 | Organizations MAY require admin approval for join requests (configurable). | Configuration |
| BR-ORG-019 | A user MAY belong to multiple organizations simultaneously. | Data model |
| BR-ORG-020 | A user's membership in one organization MUST NOT grant them any access to another organization. | Authorization |
| BR-ORG-021 | Removed members MUST immediately lose access to all organization resources. | Service layer |
| BR-ORG-022 | Removed members' contributions (quizzes, questions) to organization banks MUST be retained and ownership transferred to the organization. | Service layer |

### Privacy

| ID | Rule | Enforcement |
|----|------|-------------|
| BR-ORG-023 | Organization membership MUST NOT appear on a user's public profile. | API response filtering |
| BR-ORG-024 | Organization names, members, departments, and internal data MUST NOT be accessible to non-members. | Authorization middleware |
| BR-ORG-025 | Organization search MUST NOT be available to the public. Organizations are accessed only via invitation or direct link. | Route protection |
| BR-ORG-026 | Quizzes created within an organization context and marked as "organization" visibility MUST NOT appear in the public marketplace unless explicitly published. | Service layer |

### Deactivation

| ID | Rule | Enforcement |
|----|------|-------------|
| BR-ORG-027 | Deactivating an organization MUST soft-delete it (not permanently remove). | Service layer |
| BR-ORG-028 | Deactivated organizations MUST become inaccessible to all members. | Authorization |
| BR-ORG-029 | Deactivated organizations MAY be reactivated by a Super Admin. | Admin service |
| BR-ORG-030 | Organization data (quizzes, question banks, certificates) MUST be retained for 90 days after deactivation before entering the permanent deletion queue. | Scheduler |

---

## 6. Department Rules

| ID | Rule | Enforcement |
|----|------|-------------|
| BR-DEPT-001 | Departments MAY only exist within an organization. | Data model |
| BR-DEPT-002 | Department names MUST be unique within an organization. | Database unique constraint (scoped) |
| BR-DEPT-003 | Department names MUST be between 2 and 100 characters. | Server validation |
| BR-DEPT-004 | A member MAY belong to multiple departments within the same organization. | Data model |
| BR-DEPT-005 | A member's role MAY differ per department (e.g., "Department Admin" in Dept A, "Faculty" in Dept B). | Authorization |
| BR-DEPT-006 | Deleting a department MUST NOT delete the members. Members remain in the organization. | Service layer |
| BR-DEPT-007 | Deleting a department MUST reassign department-level quizzes and question banks to the organization level. | Service layer |
| BR-DEPT-008 | Department-level content (quizzes, question banks) MUST only be accessible to members of that department or organization admins. | Authorization |

---

## 7. RBAC Rules

### Roles

| ID | Rule | Enforcement |
|----|------|-------------|
| BR-RBAC-001 | System roles (Guest, User, Super Admin) MUST NOT be modifiable or deletable. | Service layer |
| BR-RBAC-002 | Organization roles (Student, Faculty, Moderator, Department Admin, Organization Admin, IT Admin) MAY be customized per organization. | Service layer |
| BR-RBAC-003 | Custom roles MUST be scoped to an organization. They MUST NOT affect system-level access. | Authorization |
| BR-RBAC-004 | Every role MUST be defined as a collection of permissions. Roles MUST NOT carry implicit behavior. | Data model |
| BR-RBAC-005 | A user MAY have different roles in different organizations. | Data model |
| BR-RBAC-006 | A user MAY have multiple roles within the same organization (e.g., "Faculty" + "Moderator"). | Data model |
| BR-RBAC-007 | When multiple roles are assigned, the effective permissions MUST be the union of all role permissions (additive, never subtractive). | Authorization |
| BR-RBAC-008 | Role assignment MUST only be performed by users with the `role:assign` permission. | Authorization |
| BR-RBAC-009 | A user MUST NOT be able to assign a role with higher privileges than their own. | Service layer |
| BR-RBAC-010 | The default role for new registered users MUST be "User" (configurable). | Configuration |

### Permissions

| ID | Rule | Enforcement |
|----|------|-------------|
| BR-RBAC-011 | Permissions MUST follow the `resource:action` naming convention (e.g., `quiz:create`). | Convention |
| BR-RBAC-012 | Permission checks MUST be performed on every API request that modifies or accesses protected resources. | Middleware |
| BR-RBAC-013 | Permission checks MUST be performed server-side. Client-side checks are for UX only. | Architecture |
| BR-RBAC-014 | If a user lacks the required permission, the API MUST return HTTP 403 Forbidden with error code `AUTHZ_001`. | Controller |
| BR-RBAC-015 | Super Admins MUST have all permissions implicitly (bypass permission checks). | Authorization middleware |
| BR-RBAC-016 | Permissions MUST be evaluated in the context of the resource's organization. A user with `quiz:delete` in Org A MUST NOT be able to delete quizzes in Org B. | Authorization |

---

## 8. Quiz Rules

### Creation

| ID | Rule | Enforcement |
|----|------|-------------|
| BR-QUIZ-001 | Only registered users with the `quiz:create` permission MAY create quizzes. | Authorization |
| BR-QUIZ-002 | Guest users MUST NOT create quizzes. | Middleware |
| BR-QUIZ-003 | Quiz titles MUST be between 3 and 200 characters. | Server validation |
| BR-QUIZ-004 | Quiz descriptions MUST NOT exceed 2000 characters. | Server validation |
| BR-QUIZ-005 | A quiz MUST have at least 1 question before it can be used in a live session. | Service layer |
| BR-QUIZ-006 | A quiz MUST NOT have more than the configured maximum questions (default: 100, configurable per organization). | Service layer |
| BR-QUIZ-007 | Quiz cover images MUST be images (JPEG, PNG, WebP) with a maximum size of 5 MB. | File validation |

### Visibility

| ID | Rule | Enforcement |
|----|------|-------------|
| BR-QUIZ-008 | Private quizzes MUST only be visible to the creator. | Query filters |
| BR-QUIZ-009 | Private quizzes MUST NEVER appear in search results or the marketplace. | Query filters |
| BR-QUIZ-010 | Department-level quizzes MUST only be visible to members of that department and organization admins. | Authorization |
| BR-QUIZ-011 | Organization-level quizzes MUST only be visible to organization members. | Authorization |
| BR-QUIZ-012 | Public quizzes MUST be visible to all registered users. | Query filters |
| BR-QUIZ-013 | Changing quiz visibility from public to private MUST NOT remove it from the marketplace if it was published. The quiz MUST first be unpublished, then visibility changed. | Service layer |

### Lifecycle

| ID | Rule | Enforcement |
|----|------|-------------|
| BR-QUIZ-014 | Deleting a quiz MUST be a soft delete (`deleted_at` timestamp). | Repository |
| BR-QUIZ-015 | Soft-deleted quizzes MUST NOT appear in any listing, search, or API response. | Query filters |
| BR-QUIZ-016 | Soft-deleted quizzes MAY be restored within 30 days. After 30 days, they enter the permanent deletion queue. | Scheduler |
| BR-QUIZ-017 | Archived quizzes MUST NOT be usable for new live sessions. | Service layer |
| BR-QUIZ-018 | Archiving a quiz MUST NOT affect historical session data. | Data model |
| BR-QUIZ-019 | Cloning a quiz MUST create a complete deep copy (quiz + all questions + all options). The clone is owned by the cloning user. | Service layer |
| BR-QUIZ-020 | Cloning MUST NOT copy session history or analytics. | Service layer |

### Editing

| ID | Rule | Enforcement |
|----|------|-------------|
| BR-QUIZ-021 | A quiz MUST NOT be editable while it has an active live session (status: Lobby, Countdown, Live, or Paused). | Service layer |
| BR-QUIZ-022 | Editing a published quiz MUST NOT affect existing clones (clones are independent copies). | Data model |
| BR-QUIZ-023 | Only users with the `quiz:update` permission and ownership of the quiz MAY edit it. | Authorization |

---

## 9. Question Rules

| ID | Rule | Enforcement |
|----|------|-------------|
| BR-QUES-001 | Every question MUST have a type (from the supported question types list). | Server validation |
| BR-QUES-002 | Every question MUST have a title/prompt (1–1000 characters). | Server validation |
| BR-QUES-003 | Single choice questions MUST have exactly one correct answer and at least 2 options. | Server validation |
| BR-QUES-004 | Multiple choice questions MUST have at least one correct answer and at least 2 options. | Server validation |
| BR-QUES-005 | True/False questions MUST have exactly 2 options (True and False). | Server validation |
| BR-QUES-006 | Fill in the blank questions MUST have at least one acceptable answer (case-insensitive matching by default, configurable). | Server validation |
| BR-QUES-007 | Ordering questions MUST have at least 2 items to order. | Server validation |
| BR-QUES-008 | Matching questions MUST have at least 2 pairs. | Server validation |
| BR-QUES-009 | Numerical questions MUST define either an exact answer or an acceptable range (min, max). | Server validation |
| BR-QUES-010 | Code questions MUST define the expected output or test cases for validation. | Server validation |
| BR-QUES-011 | Poll questions MUST NOT have a correct answer (all options are valid). | Server validation |
| BR-QUES-012 | Survey questions MUST NOT have scoring. | Service layer |
| BR-QUES-013 | Image questions MUST reference a valid uploaded image. | Service layer |
| BR-QUES-014 | Audio questions MUST reference a valid uploaded audio file (MP3, WAV, OGG, max 10 MB). | File validation |
| BR-QUES-015 | Video questions MUST reference a valid uploaded video file (MP4, WebM, max 50 MB). | File validation |
| BR-QUES-016 | Question timer MUST be between 5 seconds and 300 seconds (configurable range). | Server validation |
| BR-QUES-017 | Question points MUST be a non-negative integer (default: 1000). | Server validation |
| BR-QUES-018 | Questions MUST support an optional explanation field (shown after answering, max 2000 characters). | Data model |
| BR-QUES-019 | Questions MUST support an optional hint field (shown during answering if enabled, max 500 characters). | Data model |
| BR-QUES-020 | Deleting a question from a quiz MUST NOT delete it from the question bank (if it was added from there). | Service layer |

---

## 10. Question Bank Rules

| ID | Rule | Enforcement |
|----|------|-------------|
| BR-QB-001 | Every user MUST have a private question bank (accessible only to them). | Data model |
| BR-QB-002 | Department question banks MUST only be accessible to department members and organization admins. | Authorization |
| BR-QB-003 | Organization question banks MUST only be accessible to organization members. | Authorization |
| BR-QB-004 | Public question bank entries MUST be accessible to all registered users. | Query filters |
| BR-QB-005 | Adding a question to a quiz from a question bank MUST create a copy (not a reference). Changes to the bank question MUST NOT affect existing quizzes. | Service layer |
| BR-QB-006 | Bulk import MUST validate every question before importing any (all-or-nothing transaction). | Service layer |
| BR-QB-007 | Bulk import MUST support CSV format with a documented column structure. | Service layer |
| BR-QB-008 | Bulk import MUST NOT exceed 500 questions per import operation. | Server validation |
| BR-QB-009 | Question bank entries MUST support tagging (max 10 tags per question, each tag max 30 characters). | Server validation |
| BR-QB-010 | Question bank entries MUST support category assignment (max 3 categories per question). | Server validation |
| BR-QB-011 | Question bank entries MUST support difficulty levels: Easy, Medium, Hard, Expert. | Server validation |

---

## 11. Live Session Rules

### Session Creation

| ID | Rule | Enforcement |
|----|------|-------------|
| BR-SESSION-001 | Only users with the `room:create` permission MAY create live sessions. | Authorization |
| BR-SESSION-002 | A quiz MUST have at least 1 valid question to start a live session. | Service layer |
| BR-SESSION-003 | Room codes MUST be 6-character alphanumeric strings (uppercase, no ambiguous characters like O/0, I/1/L). | Service layer |
| BR-SESSION-004 | Room codes MUST be unique among all active sessions. Expired/completed session codes MAY be reused. | Service layer |
| BR-SESSION-005 | A quiz MAY have at most 1 active session at a time by default (configurable to allow multiple). | Configuration |
| BR-SESSION-006 | Sessions MUST have a configurable maximum participant limit (default: 500). | Configuration |

### Session Lifecycle

| ID | Rule | Enforcement |
|----|------|-------------|
| BR-SESSION-007 | Sessions MUST follow the state machine: Draft → Scheduled → Lobby → Countdown → Live → Paused → Completed → Archived. Not all transitions are required (e.g., Draft can go directly to Lobby). | State machine |
| BR-SESSION-008 | Only valid state transitions MUST be allowed. Invalid transitions MUST be rejected. | State machine |
| BR-SESSION-009 | A session in "Live" state MAY transition to "Paused" and back to "Live" (unlimited pauses). | State machine |
| BR-SESSION-010 | A session MUST NOT transition backwards (e.g., Completed → Live). | State machine |
| BR-SESSION-011 | Completed sessions MUST NOT be re-opened or resumed. | Service layer |
| BR-SESSION-012 | Sessions MUST be automatically moved to "Completed" if the host disconnects and does not reconnect within 30 minutes (configurable). | Scheduler |
| BR-SESSION-013 | Sessions MUST be automatically cleaned up (moved to "Archived") if they remain in "Completed" state for more than 24 hours. | Scheduler |

### Timing

| ID | Rule | Enforcement |
|----|------|-------------|
| BR-SESSION-014 | All timers MUST be authoritative on the server. Client timers are for display only. | WebSocket server |
| BR-SESSION-015 | When the server timer expires for a question, answer submissions MUST be rejected regardless of client-reported time. | WebSocket server |
| BR-SESSION-016 | Timer extensions MUST add time to the remaining duration, not reset the timer. | Service layer |
| BR-SESSION-017 | The countdown before quiz start MUST be configurable (default: 3 seconds, range: 3–10 seconds). | Configuration |

### Participation

| ID | Rule | Enforcement |
|----|------|-------------|
| BR-SESSION-018 | Participants MAY join a session only when it is in "Lobby" state, OR in "Live" state if late join is enabled. | Service layer |
| BR-SESSION-019 | Late-joining participants MUST start from the current question. They MUST NOT receive credit for skipped questions. | Service layer |
| BR-SESSION-020 | If the room is locked, new join attempts MUST be rejected with a clear message. | Service layer |
| BR-SESSION-021 | Participants MUST NOT submit answers for the same question more than once (no changing answers after submission). | Service layer |
| BR-SESSION-022 | If a participant disconnects and reconnects, they MUST see the current question state. Their previous answers MUST be intact. | WebSocket server |
| BR-SESSION-023 | If a participant disconnects during a question and the question expires before they reconnect, that question is marked as "unanswered" for that participant. | Service layer |

### Scoring

| ID | Rule | Enforcement |
|----|------|-------------|
| BR-SESSION-024 | Scoring MUST be calculated server-side. Clients MUST NOT report scores. | Service layer |
| BR-SESSION-025 | Default scoring: correct answer = base points × speed bonus. Speed bonus MUST decrease linearly from 1.0 to 0.5 as time approaches the limit. | Scoring engine |
| BR-SESSION-026 | Incorrect answers MUST score 0 points (no negative scoring by default, configurable). | Configuration |
| BR-SESSION-027 | Poll and survey questions MUST NOT contribute to scoring. | Scoring engine |
| BR-SESSION-028 | Scores MUST be integers (no fractional points). Rounding uses floor. | Scoring engine |

---

## 12. Game Mode Rules

### Practice Mode

| ID | Rule | Enforcement |
|----|------|-------------|
| BR-MODE-001 | Practice mode MUST NOT require a live session. It is self-paced and single-player. | Service layer |
| BR-MODE-002 | Practice mode MUST show the correct answer and explanation after each question. | Client + API |
| BR-MODE-003 | Practice mode MUST award reduced XP (50% of live session XP, configurable). | Gamification service |
| BR-MODE-004 | Practice mode MUST NOT appear on leaderboards. | Service layer |
| BR-MODE-005 | Practice mode attempts MUST be unlimited. | Service layer |

### Flash Quiz

| ID | Rule | Enforcement |
|----|------|-------------|
| BR-MODE-006 | Flash quizzes MUST use a maximum timer of 10 seconds per question (configurable). | Configuration |
| BR-MODE-007 | Flash quizzes MUST NOT pause (no pause allowed). | Service layer |
| BR-MODE-008 | Flash quizzes MUST award a speed bonus multiplier higher than standard mode (1.5x, configurable). | Scoring engine |

### Team Battles (V2)

| ID | Rule | Enforcement |
|----|------|-------------|
| BR-MODE-009 | Teams MUST have equal sizes (±1 member if uneven). | Service layer |
| BR-MODE-010 | Team scores MUST be the sum of individual member scores. | Scoring engine |
| BR-MODE-011 | Team assignments MAY be random, host-assigned, or player-chosen (configurable). | Configuration |
| BR-MODE-012 | The team leaderboard MUST be separate from the individual leaderboard. | Service layer |

### Tournaments (V2)

| ID | Rule | Enforcement |
|----|------|-------------|
| BR-MODE-013 | Tournaments MUST support single-elimination and round-robin formats. | Service layer |
| BR-MODE-014 | Tournament brackets MUST be generated automatically based on participant count. | Service layer |
| BR-MODE-015 | Tournament results MUST be final. No replays or appeals (configurable). | Service layer |

---

## 13. Marketplace Rules

### Publishing

| ID | Rule | Enforcement |
|----|------|-------------|
| BR-MKT-001 | Only registered users with verified emails and the `marketplace:publish` permission MAY publish quizzes. | Authorization |
| BR-MKT-002 | Guest users MUST NOT publish to the marketplace. | Middleware |
| BR-MKT-003 | Only completed quizzes (with at least 1 question) MAY be published. | Service layer |
| BR-MKT-004 | Publishing a quiz MUST create a snapshot. Subsequent edits to the original MUST NOT automatically update the marketplace listing. | Service layer |
| BR-MKT-005 | A user MAY update their marketplace listing by re-publishing (creating a new snapshot). | Service layer |
| BR-MKT-006 | Everything on the marketplace MUST be free. No paid content, no paywalls. | Architecture |

### Interactions

| ID | Rule | Enforcement |
|----|------|-------------|
| BR-MKT-007 | Users MUST be able to rate a quiz only once (1–5 stars). They MAY update their rating. | Service layer |
| BR-MKT-008 | Users MUST NOT rate their own quizzes. | Service layer |
| BR-MKT-009 | Guest users MUST NOT rate, favorite, like, bookmark, or report quizzes. | Middleware |
| BR-MKT-010 | Cloning a quiz MUST create a full deep copy owned by the cloning user. The clone has no link to the original. | Service layer |
| BR-MKT-011 | Clone count MUST be tracked on the original listing. | Service layer |
| BR-MKT-012 | Favorites, likes, and bookmarks MUST be idempotent (toggling on/off). | Service layer |

### Moderation

| ID | Rule | Enforcement |
|----|------|-------------|
| BR-MKT-013 | Reports MUST include a reason (selected from predefined categories) and an optional description (max 500 characters). | Server validation |
| BR-MKT-014 | When a quiz reaches the configurable report threshold (default: 5 unique reports), it MUST be automatically hidden from the marketplace and added to the moderation queue. | Service layer |
| BR-MKT-015 | A user MUST NOT be able to report the same quiz more than once. | Service layer |
| BR-MKT-016 | Moderation happens ONLY after reports. There is no pre-publication review. | Architecture |
| BR-MKT-017 | Moderators MAY dismiss a report (quiz stays published), hide the quiz, or permanently remove it. | Service layer |
| BR-MKT-018 | If a quiz is permanently removed, the creator MUST be notified with the reason. | Notification service |
| BR-MKT-019 | Creators with 3 or more permanently removed quizzes SHOULD be flagged for review. | Service layer |

### Discovery

| ID | Rule | Enforcement |
|----|------|-------------|
| BR-MKT-020 | "Trending" quizzes MUST be calculated based on clone count + rating + recency (weighted algorithm, configurable weights). | Service layer |
| BR-MKT-021 | "Featured" quizzes MUST be manually curated by Super Admins or Moderators. | Admin service |
| BR-MKT-022 | Search results MUST be ranked by relevance (title match > tag match > description match). | Search service |
| BR-MKT-023 | Hidden/removed quizzes MUST NOT appear in any search results, browsing, or API responses. | Query filters |

---

## 14. Gamification Rules

### XP

| ID | Rule | Enforcement |
|----|------|-------------|
| BR-GAM-001 | XP MUST NEVER become negative. The minimum XP value is 0. | Service layer |
| BR-GAM-002 | XP MUST be awarded server-side only. Clients MUST NOT report or request XP. | Service layer |
| BR-GAM-003 | Daily XP cap MUST be enforced (default: 5000 XP/day, configurable). | Service layer |
| BR-GAM-004 | XP earned from practice mode MUST be reduced (default: 50% of live session XP). | Configuration |
| BR-GAM-005 | XP MUST NOT be awarded for the same quiz session more than once per user (no replay farming). | Service layer |
| BR-GAM-006 | XP earned MUST be: base XP + (accuracy percentage × accuracy multiplier) + (speed bonus) + (streak bonus). | Scoring engine |
| BR-GAM-007 | Host-configured XP multipliers MUST be between 0.5x and 3.0x (configurable range). | Server validation |
| BR-GAM-008 | XP MUST be awarded only after a session completes, not during. | Service layer |

### Levels

| ID | Rule | Enforcement |
|----|------|-------------|
| BR-GAM-009 | Levels MUST use non-linear XP thresholds (each level requires more XP than the previous). | Configuration |
| BR-GAM-010 | Level 1 starts at 0 XP. The maximum level MUST be configurable (default: 100). | Configuration |
| BR-GAM-011 | Level progression formula: `required_xp = base_xp × (level ^ exponent)` where base_xp = 100, exponent = 1.5 (configurable). | Configuration |
| BR-GAM-012 | Leveling up MUST trigger a notification and MAY unlock rewards (titles, badges). | Notification service |

### Badges

| ID | Rule | Enforcement |
|----|------|-------------|
| BR-GAM-013 | Badges MUST have defined unlock criteria that are evaluated automatically. | Service layer |
| BR-GAM-014 | Badges MUST be categorized: Creation, Participation, Social, Mastery, Special. | Data model |
| BR-GAM-015 | Badges MUST have rarity tiers: Common, Uncommon, Rare, Epic, Legendary. | Data model |
| BR-GAM-016 | A badge MUST only be awarded once per user (no duplicates). | Service layer |
| BR-GAM-017 | Badge unlock MUST trigger a notification. | Notification service |
| BR-GAM-018 | Progressive badges (e.g., "Complete 10/50/100 quizzes") MUST auto-upgrade when higher tiers are reached. | Service layer |

### Streaks

| ID | Rule | Enforcement |
|----|------|-------------|
| BR-GAM-019 | A streak day is counted when a user participates in at least one quiz (live or practice) OR creates at least one quiz. | Service layer |
| BR-GAM-020 | Streaks reset to 0 if a user misses a calendar day (based on user's timezone). | Scheduler |
| BR-GAM-021 | Streak bonuses MUST apply a multiplier to XP earned: streak of 7+ days = 1.2x, 30+ days = 1.5x, 100+ days = 2.0x (configurable). | Scoring engine |
| BR-GAM-022 | The maximum streak display MUST be the current active streak and the longest historical streak. | API |

### Coins

| ID | Rule | Enforcement |
|----|------|-------------|
| BR-GAM-023 | Coins MUST NEVER become negative. | Service layer |
| BR-GAM-024 | Coins MUST be earned through participation and achievements (no purchase with real money in V1). | Service layer |
| BR-GAM-025 | Coin spending mechanics are reserved for V2+ (cosmetics, profile customization). | Architecture |

---

## 15. Leaderboard Rules

| ID | Rule | Enforcement |
|----|------|-------------|
| BR-LDB-001 | Session leaderboards MUST freeze when a session completes. No retroactive score changes. | Service layer |
| BR-LDB-002 | Session leaderboards MUST be computed after each question (not just at the end). | WebSocket server |
| BR-LDB-003 | Session leaderboard ranking MUST use: total score (primary), number of correct answers (secondary), average response time (tertiary) as tiebreakers. | Scoring engine |
| BR-LDB-004 | Global leaderboards MUST be ranked by total XP. | Service layer |
| BR-LDB-005 | Country leaderboards MUST filter by user's self-reported country. | Service layer |
| BR-LDB-006 | Seasonal leaderboards MUST reset on the 1st of each month. Previous season results MUST be archived. | Scheduler |
| BR-LDB-007 | Leaderboards MUST display the top 100 users and the requesting user's rank (even if outside top 100). | API |
| BR-LDB-008 | Guest users MUST NOT appear on global, country, or seasonal leaderboards. They MAY appear on session leaderboards. | Service layer |
| BR-LDB-009 | Deactivated users MUST be hidden from leaderboards. | Query filters |

---

## 16. Profile Rules

| ID | Rule | Enforcement |
|----|------|-------------|
| BR-PROF-001 | Every registered user MUST have a public profile accessible via a unique URL slug (e.g., `/profile/{username}`). | Route |
| BR-PROF-002 | Profiles MUST display: avatar, display name, bio, level, title, contribution heatmap, quiz stats, achievements. | API |
| BR-PROF-003 | Profiles MUST NOT display: email, organization memberships, private quizzes, or any organization-internal data. | API response filtering |
| BR-PROF-004 | Users MAY pin up to 5 achievements on their profile. | Server validation |
| BR-PROF-005 | The contribution heatmap MUST show a 365-day rolling window of daily activity (quizzes played + quizzes created + marketplace contributions). | Service layer |
| BR-PROF-006 | Avatars MUST be images (JPEG, PNG, WebP) with a maximum size of 2 MB and minimum dimensions of 100x100px. | File validation |
| BR-PROF-007 | Banners MUST be images (JPEG, PNG, WebP) with a maximum size of 5 MB and recommended aspect ratio of 3:1. | File validation |
| BR-PROF-008 | Guest users MUST NOT have profiles. | Middleware |

---

## 17. Certificate Rules

| ID | Rule | Enforcement |
|----|------|-------------|
| BR-CERT-001 | Certificate generation MUST be enabled/disabled by the host per session (default: disabled). | Configuration |
| BR-CERT-002 | Certificate types: Participation (attended session), Completion (answered all questions), Winner (1st place), Runner-Up (2nd/3rd place). | Service layer |
| BR-CERT-003 | Every certificate MUST have a unique verification UUID. | Database |
| BR-CERT-004 | Certificate verification MUST be publicly accessible without authentication (via `/verify/{certificate_id}`). | Public route |
| BR-CERT-005 | Certificates MUST include: recipient name, quiz title, date, score (if applicable), rank (if applicable), organization branding (if applicable), verification ID. | PDF generator |
| BR-CERT-006 | Certificate PDFs MUST be generated server-side. | Service layer |
| BR-CERT-007 | Certificate generation MUST NOT block the session completion flow. It SHOULD be processed asynchronously (background job). | Job queue |
| BR-CERT-008 | Guest participants MAY receive certificates with their nickname, but the certificate MUST note "Guest Participant". | Service layer |
| BR-CERT-009 | Certificates MUST be retained indefinitely (no auto-deletion). | Data retention |
| BR-CERT-010 | Organization-branded certificates MUST use the organization's logo and colors if configured. | PDF generator |

---

## 18. Analytics Rules

| ID | Rule | Enforcement |
|----|------|-------------|
| BR-ANA-001 | Analytics data MUST be computed from actual event data, not self-reported by clients. | Service layer |
| BR-ANA-002 | System analytics MUST only be accessible to Super Admins. | Authorization |
| BR-ANA-003 | Organization analytics MUST only be accessible to Organization Admins and IT Admins. | Authorization |
| BR-ANA-004 | Department analytics MUST only be accessible to Department Admins, Organization Admins, and IT Admins. | Authorization |
| BR-ANA-005 | Faculty analytics MUST only be accessible to the faculty member themselves and their department/organization admins. | Authorization |
| BR-ANA-006 | Quiz analytics MUST only be accessible to the quiz creator and their organization admins (if applicable). | Authorization |
| BR-ANA-007 | Player analytics MUST only be accessible to the player themselves and authorized admins. | Authorization |
| BR-ANA-008 | Analytics exports MUST NOT include personally identifiable information (PII) unless the requesting user has explicit permission. | Service layer |
| BR-ANA-009 | Analytics date range MUST be limited to a maximum of 1 year per query (to prevent excessive server load). | Server validation |
| BR-ANA-010 | Real-time analytics (during live sessions) MUST be scoped to the current session only. | WebSocket server |

---

## 19. Notification Rules

| ID | Rule | Enforcement |
|----|------|-------------|
| BR-NOTIF-001 | In-app notifications MUST be delivered in real time via WebSocket to connected users. | WebSocket server |
| BR-NOTIF-002 | Email notifications MUST NOT be sent if the user has disabled that notification type in their preferences. | Service layer |
| BR-NOTIF-003 | Notification preferences MUST be configurable per channel (in-app, email) AND per type (quiz invites, org invites, follower alerts, etc.). | Data model |
| BR-NOTIF-004 | Critical system notifications (e.g., security alerts, password changes) MUST bypass user preferences and always be delivered. | Service layer |
| BR-NOTIF-005 | Email notifications MUST use the organization's SMTP configuration if available, falling back to the system default. | Service layer |
| BR-NOTIF-006 | Notification content MUST be generated from templates, not hardcoded strings. | Template engine |
| BR-NOTIF-007 | Notifications MUST be stored for at least 90 days. Older notifications MAY be purged. | Scheduler |
| BR-NOTIF-008 | Unread notification count MUST be accurate and updated in real time. | WebSocket server |
| BR-NOTIF-009 | "Mark all as read" MUST only mark currently visible notifications, not future ones. | Service layer |
| BR-NOTIF-010 | Failed email deliveries MUST be retried up to 3 times with exponential backoff (1 min, 5 min, 15 min). | Job queue |

---

## 20. Search Rules

| ID | Rule | Enforcement |
|----|------|-------------|
| BR-SEARCH-001 | Marketplace search MUST support full-text search across quiz titles, descriptions, and tags. | Search service |
| BR-SEARCH-002 | Search results MUST NOT include hidden, removed, soft-deleted, or private quizzes. | Query filters |
| BR-SEARCH-003 | Search MUST support pagination (default: 20 results per page, max: 100). | Server validation |
| BR-SEARCH-004 | Search queries MUST be sanitized to prevent injection attacks. | Server validation |
| BR-SEARCH-005 | Search MUST support filters: category, difficulty, rating (min), question count (range), language. | Query builder |
| BR-SEARCH-006 | Search MUST support sorting: relevance, newest, most popular, highest rated, most cloned. | Query builder |
| BR-SEARCH-007 | Empty search queries MUST return trending/popular results. | Service layer |
| BR-SEARCH-008 | Search queries MUST be logged for analytics (trending searches, autocomplete). | Analytics service |

---

## 21. File Upload Rules

| ID | Rule | Enforcement |
|----|------|-------------|
| BR-FILE-001 | All file uploads MUST be validated for file type (MIME type and file extension) server-side. | Middleware |
| BR-FILE-002 | All file uploads MUST be validated for file size server-side. | Middleware |
| BR-FILE-003 | Allowed image types: JPEG, PNG, WebP. Maximum size: 5 MB (configurable). | Configuration |
| BR-FILE-004 | Allowed audio types: MP3, WAV, OGG. Maximum size: 10 MB (configurable). | Configuration |
| BR-FILE-005 | Allowed video types: MP4, WebM. Maximum size: 50 MB (configurable). | Configuration |
| BR-FILE-006 | Allowed document types for import: CSV, JSON, XLSX. Maximum size: 10 MB (configurable). | Configuration |
| BR-FILE-007 | Uploaded files MUST be renamed with a UUID to prevent path traversal attacks. | Service layer |
| BR-FILE-008 | Uploaded files MUST NOT be served from the same domain as the application (use a separate static file path). | Infrastructure |
| BR-FILE-009 | File content MUST be scanned for basic validation (e.g., image files must have valid image headers). | Service layer |
| BR-FILE-010 | Executable files (EXE, BAT, SH, PHP, etc.) MUST always be rejected. | Middleware |

---

## 22. Audit Rules

| ID | Rule | Enforcement |
|----|------|-------------|
| BR-AUDIT-001 | Every state-changing operation (create, update, delete, archive, restore) MUST be logged in the audit log. | Middleware / Service layer |
| BR-AUDIT-002 | Audit log entries MUST include: who (user ID), what (action), when (timestamp), where (resource type + ID), old value, new value, IP address, user agent. | Audit service |
| BR-AUDIT-003 | Audit logs MUST be immutable. They MUST NOT be editable or deletable by any user, including Super Admins. | Database (append-only) |
| BR-AUDIT-004 | Audit logs MUST be retained for at least 1 year (configurable, default: 2 years). | Configuration |
| BR-AUDIT-005 | Audit logs MUST be queryable by: user, resource type, action, date range. | Query layer |
| BR-AUDIT-006 | System-level audit logs MUST only be accessible to Super Admins. | Authorization |
| BR-AUDIT-007 | Organization-level audit logs MUST only be accessible to Organization Admins and IT Admins. | Authorization |
| BR-AUDIT-008 | Authentication events (login, logout, failed login, password change) MUST always be audited. | Auth service |
| BR-AUDIT-009 | Permission changes (role assignment, permission modification) MUST always be audited. | RBAC service |

---

## 23. Feature Flag Rules

| ID | Rule | Enforcement |
|----|------|-------------|
| BR-FF-001 | Feature flags MUST be evaluated server-side. Client-side flags are for UI display only. | Middleware |
| BR-FF-002 | When a feature is disabled via flag, its API endpoints MUST return HTTP 404 (as if the feature doesn't exist), not 403. | Middleware |
| BR-FF-003 | Feature flags MUST support the following states: enabled, disabled, percentage rollout, user-list rollout. | Feature flag service |
| BR-FF-004 | Changes to feature flags MUST be audit-logged. | Audit service |
| BR-FF-005 | Feature flags MUST be loadable without a server restart (hot reload from database). | Service layer |
| BR-FF-006 | Default feature flags for V1: marketplace (enabled), certificates (enabled), tournaments (disabled), team_battles (disabled), puzzle_mode (disabled), push_notifications (disabled), drawing_questions (disabled), ai_features (disabled). | Configuration |

---

## 24. Data Retention Rules

| ID | Rule | Enforcement |
|----|------|-------------|
| BR-RET-001 | Soft-deleted records MUST be retained for 30 days before permanent deletion (configurable). | Scheduler |
| BR-RET-002 | Deactivated user accounts MUST be retained for 30 days before entering the permanent deletion queue. | Scheduler |
| BR-RET-003 | Completed session data MUST be retained for at least 2 years. | Configuration |
| BR-RET-004 | Audit logs MUST be retained for at least 2 years. | Configuration |
| BR-RET-005 | Notification history MUST be retained for at least 90 days. | Scheduler |
| BR-RET-006 | Analytics data MUST be retained for at least 1 year at full granularity, then aggregated for long-term storage. | Scheduler |
| BR-RET-007 | Guest session data MUST be anonymized after 30 days (nicknames replaced with generic identifiers). | Scheduler |
| BR-RET-008 | Certificates MUST be retained indefinitely. | Policy |
| BR-RET-009 | Permanent deletion MUST be irreversible and MUST remove all associated files. | Service layer |
| BR-RET-010 | Users MAY request data export (GDPR compliance) — response within 30 days. | Admin service |

---

## 25. Rate Limiting Rules

| ID | Rule | Enforcement |
|----|------|-------------|
| BR-RATE-001 | Login: 5 requests per minute per IP. | Rate limiter |
| BR-RATE-002 | Registration: 3 requests per hour per IP. | Rate limiter |
| BR-RATE-003 | Password reset: 3 requests per hour per email. | Rate limiter |
| BR-RATE-004 | API general (authenticated): 100 requests per minute per user. | Rate limiter |
| BR-RATE-005 | API general (unauthenticated): 30 requests per minute per IP. | Rate limiter |
| BR-RATE-006 | Quiz creation: 20 per hour per user. | Rate limiter |
| BR-RATE-007 | Marketplace publish: 10 per hour per user. | Rate limiter |
| BR-RATE-008 | File upload: 30 per hour per user. | Rate limiter |
| BR-RATE-009 | Search: 60 per minute per user. | Rate limiter |
| BR-RATE-010 | WebSocket messages: 50 per second per connection. | WebSocket middleware |
| BR-RATE-011 | Email notifications: 100 per hour per user (to prevent spam). | Service layer |
| BR-RATE-012 | Rate limit responses MUST include `Retry-After` header with seconds until the limit resets. | Middleware |

---

## 26. References

| Document | Relationship |
|----------|-------------|
| [01-master-prd.md](./01-master-prd.md) | Business rules derived from PRD requirements |
| [03-state-machines.md](./03-state-machines.md) | State transitions referenced by session and entity rules |
| [07-database-design.md](./07-database-design.md) | Database constraints implementing these rules |
| [09-backend-architecture.md](./09-backend-architecture.md) | Service layer enforcing these rules |
| [16-rbac.md](./16-rbac.md) | Permission rules detailed further |
| [39-security.md](./39-security.md) | Security rules expanded |
| [40-error-reference.md](./40-error-reference.md) | Error codes for rule violations |
| [41-system-configuration.md](./41-system-configuration.md) | Configurable values referenced in rules |
| [44-audit-logging.md](./44-audit-logging.md) | Audit rules expanded |

---

*End of Document — AERO-BR-002 v1.0*
