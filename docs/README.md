# Aero MAGE — Documentation Repository

> **Next Generation Real-Time Interactive Learning Platform**

[![Version](https://img.shields.io/badge/Docs-v3.0-blue)]()
[![Status](https://img.shields.io/badge/Status-In%20Progress-orange)]()
[![License](https://img.shields.io/badge/License-Proprietary-red)]()

---

## About This Repository

This repository contains the **complete enterprise-grade documentation** for Aero MAGE — a modular SaaS platform for live quizzes, interactive learning, organizations, community-created content, gamification, and real-time engagement.

This documentation is designed to serve as the **single source of truth** for all architectural, product, and engineering decisions. It is written to the standard maintained by mature engineering organizations at companies like Microsoft, Atlassian, Google, and GitHub.

---

## Quick Navigation

### 🎯 Product

| # | Document | Description |
|---|----------|-------------|
| 01 | [Master PRD](./01-master-prd.md) | Product vision, personas, user stories, requirements, use cases |
| 02 | [Business Rules](./02-business-rules.md) | 200+ codified business rules across all domains |
| 03 | [State Machines](./03-state-machines.md) | Every entity state transition with Mermaid diagrams |

### 🏗️ Architecture

| # | Document | Description |
|---|----------|-------------|
| 04 | [System Architecture](./04-system-architecture.md) | High-level architecture, component diagrams, request flows |
| 05 | [Domain Driven Design](./05-domain-driven-design.md) | Core domains, bounded contexts, aggregates, context maps |
| 06 | [Event Catalog](./06-event-catalog.md) | Every domain event with producers, consumers, payloads |

### 💾 Data

| # | Document | Description |
|---|----------|-------------|
| 07 | [Database Design](./07-database-design.md) | Full PostgreSQL schema, ER diagrams, 60+ tables |
| 08 | [Data Lifecycle](./08-data-lifecycle.md) | Create/update/archive/restore/delete/purge per entity |

### ⚙️ Backend

| # | Document | Description |
|---|----------|-------------|
| 09 | [Backend Architecture](./09-backend-architecture.md) | Modular monolith, patterns, folder structure, DI |
| 10 | [Backend Modules Reference](./10-backend-modules-reference.md) | Every module: controllers, services, repos, DTOs |

### 🖥️ Frontend & Design

| # | Document | Description |
|---|----------|-------------|
| 11 | [Frontend Architecture](./11-frontend-architecture.md) | React/Vite structure, routing, state management |
| 12 | [Frontend Pages Reference](./12-frontend-pages-reference.md) | Every page specification with states and permissions |
| 13 | [UI/UX Specification](./13-ui-ux-specification.md) | Every screen, modal, drawer, toast, animation |
| 14 | [Design System](./14-design-system.md) | Colors, typography, spacing, icons, component library |

### 🚀 Features

| # | Document | Description |
|---|----------|-------------|
| 15 | [Authentication & Authorization](./15-authentication-authorization.md) | JWT, OAuth, guest join, session management |
| 16 | [RBAC](./16-rbac.md) | Every permission, role, mapping, inheritance |
| 17 | [Live Quiz Engine](./17-live-quiz-engine.md) | Session lifecycle, host controls, recovery, sync |
| 18 | [Question Types](./18-question-types.md) | 22+ question types fully documented |
| 19 | [Question Bank](./19-question-bank.md) | Ownership, versioning, import/export |
| 20 | [Practice & Game Modes](./20-practice-and-game-modes.md) | Practice, battles, tournaments, polls, puzzles |
| 21 | [Marketplace](./21-marketplace.md) | Publishing, cloning, moderation, discovery |
| 22 | [Gamification](./22-gamification.md) | XP, levels, badges, streaks, leaderboards |
| 23 | [Public Profile](./23-public-profile.md) | Profile, heatmap, stats, social features |
| 24 | [Certificates](./24-certificates.md) | Templates, designer, verification |
| 25 | [Analytics](./25-analytics.md) | Every metric, dashboards, exports |
| 26 | [Notifications](./26-notifications.md) | In-app, email, push, templates, preferences |
| 27 | [Search Engine](./27-search-engine.md) | Ranking, filtering, autocomplete, full-text |

### 📡 API

| # | Document | Description |
|---|----------|-------------|
| 28 | [API Design](./28-api-design.md) | REST conventions, versioning, pagination, errors |
| 29 | [API — Auth](./29-api-reference-auth.md) | Authentication endpoints |
| 30 | [API — Users](./30-api-reference-users.md) | User & profile endpoints |
| 31 | [API — Organizations](./31-api-reference-organizations.md) | Org, department, member endpoints |
| 32 | [API — Quizzes](./32-api-reference-quizzes.md) | Quiz, question, question bank endpoints |
| 33 | [API — Sessions](./33-api-reference-sessions.md) | Live session & participant endpoints |
| 34 | [API — Marketplace](./34-api-reference-marketplace.md) | Marketplace endpoints |
| 35 | [API — Gamification](./35-api-reference-gamification.md) | XP, badges, leaderboards endpoints |
| 36 | [API — Analytics](./36-api-reference-analytics.md) | Analytics & reporting endpoints |
| 37 | [API — Admin](./37-api-reference-admin.md) | Notifications, certificates, config, admin |

### 🔌 Real-Time

| # | Document | Description |
|---|----------|-------------|
| 38 | [WebSocket Events](./38-websocket-events.md) | Every WS event, payloads, recovery, presence |

### 🔒 Cross-Cutting Concerns

| # | Document | Description |
|---|----------|-------------|
| 39 | [Security](./39-security.md) | OWASP, threat model, hardening |
| 40 | [Error Reference](./40-error-reference.md) | Every error code (AUTH_001, QUIZ_101, etc.) |
| 41 | [System Configuration](./41-system-configuration.md) | Every configurable parameter |
| 42 | [Feature Flags](./42-feature-flags.md) | Every feature flag, toggles, rollout strategy |
| 43 | [Scheduler & Background Jobs](./43-scheduler-background-jobs.md) | Every cron job and background task |
| 44 | [Audit Logging](./44-audit-logging.md) | Who/what/when/old/new per module |
| 45 | [Performance Targets](./45-performance-targets.md) | SLAs, latency targets, throughput goals |
| 46 | [Observability](./46-observability.md) | Logs, metrics, tracing, alerts, health checks |

### 🛠️ Operations

| # | Document | Description |
|---|----------|-------------|
| 47 | [Deployment & Infrastructure](./47-deployment-infrastructure.md) | AWS, CI/CD, environments, scaling |
| 48 | [Backup & Disaster Recovery](./48-backup-disaster-recovery.md) | PostgreSQL, uploads, certificates, retention |
| 49 | [Testing Strategy](./49-testing-strategy.md) | Unit, integration, E2E, load, security |

### 📏 Engineering

| # | Document | Description |
|---|----------|-------------|
| 50 | [Coding Standards](./50-coding-standards.md) | Naming, git, branching, code review |
| 51 | [Engineering Handbook](./51-engineering-handbook.md) | Workflows, PRs, releases, issue templates |
| 52 | [Accessibility](./52-accessibility.md) | WCAG, keyboard, ARIA, screen readers |
| 53 | [Future Integrations](./53-future-integrations.md) | LMS, OAuth, S3, AI, payments, mobile |

### 📋 Planning & Review

| # | Document | Description |
|---|----------|-------------|
| 54 | [Roadmap](./54-roadmap.md) | V1, V2, V3, tech debt, expansion |
| 55 | [Sequence Diagrams](./55-sequence-diagrams.md) | Major flow sequence diagrams |
| 56 | [Requirements Traceability Matrix](./56-requirements-traceability-matrix.md) | Req → Feature → API → DB → Test |
| 57 | [Glossary](./57-glossary.md) | Every term and abbreviation |
| 58 | [Appendices](./58-appendices.md) | Sample records, env vars, checklists |
| 59 | [Design Review](./59-design-review.md) | Principal Architect review & audit |

### 📁 Supporting

| Document | Description |
|----------|-------------|
| [Architecture Decision Records](./decisions/) | ADR-001 through ADR-010 |
| [Changelog](./changelog/CHANGELOG.md) | Documentation version history |
| [Templates](./templates/) | ADR and module documentation templates |

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React, Vite, TypeScript, TailwindCSS, React Router, TanStack Query, Socket.IO Client, Framer Motion |
| Backend | Node.js, Express.js, Socket.IO |
| Database | PostgreSQL |
| Architecture | Modular Monolith |
| Authentication | JWT, Refresh Tokens, Google OAuth, Guest Join |
| Storage | Local (V1), AWS S3 (V2+) |
| Hosting | AWS |

---

## Core Principles

- **Configuration over hardcoding** — Everything configurable
- **Modular architecture** — Every feature is a self-contained module
- **UUIDs everywhere** — No sequential IDs exposed
- **Soft delete** — Data is never permanently lost without intent
- **Audit everything** — Every mutation is logged
- **Feature flags** — Every feature can be toggled
- **RBAC** — Permission-based, not role-hardcoded
- **Repository pattern** — Clean data access layer
- **No business logic in controllers** — Services own the logic

---

## Contributing to Documentation

1. Follow the naming conventions established in [Coding Standards](./50-coding-standards.md)
2. Use Mermaid for all diagrams
3. Cross-reference related documents
4. Update the changelog when modifying documents
5. Create ADRs for significant architectural decisions

---

*Last updated: 2026-07-16*
