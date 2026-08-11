# NexusRe — Status

Digital reinsurance placement platform. Monorepo: `apps/backend` (NestJS) +
`apps/frontend` (Next.js 15).

## Verification state

| Check | Result |
|---|---|
| `tsc --noEmit` backend | passes, 0 errors |
| `tsc --noEmit` frontend | passes, 0 errors |
| `nest build` backend | passes |
| `next build` frontend | passes, **17 routes** |
| `npm test` backend | **34 tests, 6 suites, all passing** |
| Migrations run against a database | **not done** |
| Seeds run | **not done** |
| API called at runtime | **not done** |
| Frontend exercised in a browser | **not done** |

Compile, build and unit tests are executed results. Anything needing a live
database, SMTP server or S3 bucket is unproven.

### What the unit tests cover
Pure business logic, no database or AWS needed:
- `calculateCompletenessScore` — weighting, short-title cutoff, riskDetails and
  documents caps, the 100 ceiling
- `updateStatus` — legal transitions, refusal to skip review, terminal states,
  history written only when an actor is known
- `submitSubmission` — author-only, drafts only, the 50% gate and its message
- `validateFormData` — required fields, type mismatches, unknown form type
- `quote transitions` — reinsurer firms up, cedant accepts, either declines,
  terminals cannot move, allowed-next lists
- `appetite matching` — hard filters (line of business, structure, excluded
  geographies), soft scoring (territory, sum insured band penalties), clamping,
  stable ranking

Not covered by tests: the audit interceptor, throttler behaviour, and email
delivery. All three need an HTTP layer or a live transport to exercise properly.

### What blocks runtime verification
- **Docker** — no `docker` CLI on this machine, so `docker-compose up postgres redis`
  cannot run. Postgres and Redis are unavailable.
- **pnpm** — not installed either (node v24 only). Installs here used `npm` per app;
  `pnpm-workspace.yaml` is still valid if you have pnpm.
- **AWS S3 credentials** — env validation calls `getOrThrow` on `AWS_S3_BUCKET`,
  `AWS_REGION` and the key pair, so the backend refuses to boot without them.
- **SMTP** — optional by design. With no `SMTP_HOST` the email service logs what it
  would have sent and returns, so nothing breaks.

### Known unverified risks
- The first migration runs `CREATE EXTENSION IF NOT EXISTS "uuid-ossp"` before the
  tables that call `uuid_generate_v4()`. Reasoned, not runtime-confirmed: if the DB
  user cannot create extensions this needs a superuser or a switch to
  `gen_random_uuid()`.
- The audit interceptor infers `resourceType` from the URL path. Routes that do not
  follow the REST shape will log as `unknown`.
- Rate limiting is in-memory. Behind more than one backend instance the 100/min
  ceiling is per-instance until a Redis throttler store is wired in.

## Backend

**Phase 4 complete**: audit trail, rate limiting, email notifications.

Modules: auth, users, organizations, submissions, storage, forms, public, quotes,
appetite, messaging, notifications, audit, email.

- **audit** — immutable trail. A global interceptor records every POST/PATCH/DELETE
  with actor, resource, after-snapshot, IP and user agent; password and token fields
  are redacted before persisting. Writes are deferred with `setImmediate` so logging
  never delays a response, and failures are swallowed so it cannot break the
  operation it is tracking. `@SkipAudit()` opts a route out. Search is super-admin only.
- **rate limiting** — `@nestjs/throttler`, 100 requests/minute per IP globally,
  with `@CustomThrottle(limit, ttl)` and `@SkipThrottle()` for per-route control.
- **email** — nodemailer + Handlebars, 5 templates (welcome, password reset, quote
  received, quote status changed, message received). Degrades to console logging
  when SMTP is unset. Per-user `EmailPreferences` with 5 toggles, created lazily on
  first read so pre-existing users get defaults rather than a 404.

7 migrations. Auth uses JWT + rotating refresh tokens, bcrypt, expiring reset tokens.
Submissions have a draft→submitted workflow, enforced status transitions, a weighted
100-point completeness score gated at 50% to submit, and full change history.
Documents use S3 pre-signed upload/download with type and 50MB validation.

New env vars, all optional: `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`,
`SMTP_PASS`, `EMAIL_FROM`, `EMAIL_FROM_NAME`.

## Frontend

17 routes. Auth pages, protected routes with role checks, role-filtered nav,
dashboard, submissions list with filters and pagination, two-step wizard that renders
the backend's JSON Schema, and a submission detail page with six tabs: details,
documents, quotes, messages, markets, history.

Also: organizations, users, profile, forms catalogue, appetite management and an
opportunities feed (both reinsurer-only), a notification bell, and an **audit log
viewer** at `/audit` for super admins. Email preferences live on the profile page and
save per toggle. A 429 from the API is turned into a readable message that includes
the `retry-after` window when the server sends one.

## Run it

```bash
cd apps/backend  && npm install
cd ../frontend   && npm install

docker-compose up -d postgres redis
cp apps/backend/.env.example apps/backend/.env   # AWS vars are mandatory to boot

cd apps/backend
npm run migration:run
npm run seed
npm run seed:forms
npm run seed:additional-forms
npm run seed:appetite
npm test                      # 34 unit tests, no database required
npm run dev                   # :3001, docs at /api/docs

cd ../frontend
npm run dev                   # :3000
```

Seeded logins: `admin@nexusre.com` / `Admin123!@#`,
`cedant@lagosgeneral.ng` / `Cedant123!`,
`broker@africanrebrokers.ke` / `Broker123!`,
`underwriter@munichre.com` / `Reinsurer123!`

## Not started
Controller and integration tests, E2E tests, Redis-backed throttler store,
weekly digest job (the preference toggle exists but nothing sends it yet).
