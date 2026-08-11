# NexusRe — Status

Digital reinsurance placement platform. Monorepo: `apps/backend` (NestJS) +
`apps/frontend` (Next.js 15).

## Verification state

| Check | Result |
|---|---|
| `tsc --noEmit` backend | passes, 0 errors |
| `tsc --noEmit` frontend | passes, 0 errors |
| `nest build` backend | passes |
| `next build` frontend | passes, 16 routes |
| `npm test` backend | **34 tests, 6 suites, all passing** |
| Migrations run | **not done** |
| Seeds run | **not done** |
| API called at runtime | **not done** |

**Phase 4 complete**: Audit log, rate limiting (throttler), email notifications.

### What the unit tests cover
- Completeness scoring, status transitions, submit gates, form validation
- Quote state transitions, appetite matching with scoring
- (Phase 4 tests pending: audit capture, throttle behavior)

### What blocks runtime verification
- **Docker** — no CLI available, so postgres/redis cannot start
- **pnpm** — not installed (npm used per-app instead)
- **AWS S3** — env validation requires credentials to boot
- **SMTP** — optional; emails log to console when unconfigured

## Backend (Phase 4 additions)

**Audit Log:**
- `AuditLog` entity tracking actor, action, resource type/id, before/after snapshots, IP, user agent
- Global interceptor capturing all POST/PATCH/DELETE with automatic resource inference
- Admin-only search endpoint with filters (actor, resource, date range)
- `@SkipAudit()` decorator to bypass tracking on sensitive routes

**Rate Limiting:**
- `@nestjs/throttler` with global default: 100 req/min per IP
- `@CustomThrottle(limit, ttl)` to override per-route
- `@SkipThrottle()` to disable on specific endpoints
- Redis-backed storage ready when Redis is available

**Email Notifications:**
- `EmailService` with nodemailer + Handlebars templates
- 5 templates: welcome, password-reset, quote-received, quote-status-changed, message-received
- `EmailPreferences` entity for opt-in/opt-out per notification type
- Graceful degradation: logs to console when SMTP unconfigured
- Email delivery never blocks the operation it's notifying about

New env vars (all optional):
- `SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS`
- `EMAIL_FROM, EMAIL_FROM_NAME`

## Frontend

Auth pages, protected routes, role-filtered nav, dashboard, submissions with filters/pagination,
two-step wizard, submission detail (6 tabs: details/documents/quotes/messages/markets/history),
organizations, users, profile, forms, appetite management (reinsurer), opportunities feed (reinsurer),
notification bell with unread badge.

**Phase 4 frontend additions pending**: audit log viewer, email preferences UI, 429 rate-limit feedback.

## Run it

```bash
cd apps/backend  && npm install
cd ../frontend   && npm install

docker-compose up -d postgres redis
cp apps/backend/.env.example apps/backend/.env

cd apps/backend
npm run migration:run
npm run seed
npm run seed:forms
npm run seed:additional-forms
npm run seed:appetite
npm test             # 34 unit tests
npm run dev          # :3001, /api/docs

cd ../frontend
npm run dev          # :3000
```

Seeded logins: `admin@nexusre.com` / `Admin123!@#`, `cedant@lagosgeneral.ng` / `Cedant123!`,
`broker@africanrebrokers.ke` / `Broker123!`, `underwriter@munichre.com` / `Reinsurer123!`

## Not started
Controller/integration tests, E2E tests, Phase 4 frontend (audit viewer, email prefs UI, 429 handling).
