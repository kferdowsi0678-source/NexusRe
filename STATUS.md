# NexusRe — Status

Digital reinsurance placement platform. Monorepo: `apps/backend` (NestJS) +
`apps/frontend` (Next.js 15).

## Verification state

| Check | Result |
|---|---|
| `tsc --noEmit` backend | passes, 0 errors |
| `tsc --noEmit` frontend | passes, 0 errors |
| `nest build` backend | passes |
| `next build` frontend | passes, **16 routes** (added /appetite, /opportunities) |
| `npm test` backend | **34 tests, 6 suites, all passing** |
| Migrations run against a database | **not done** |
| Seeds run | **not done** |
| API called at runtime | **not done** |
| Frontend exercised in a browser | **not done** |

Compile, build and unit tests are executed results. Anything needing a live
database or S3 is unproven.

### What the unit tests cover
Pure business logic, no database or AWS needed:
- `calculateCompletenessScore` — weighting, the short-title cutoff, the
  riskDetails/documents caps, and the 100 ceiling
- `updateStatus` — legal transitions, refusal to skip review, bound/declined
  as terminal, history written only when an actor is known
- `submitSubmission` — author-only, drafts only, the 50% gate and its message
- `validateFormData` — required fields, type mismatches, unknown form type
- `quote transitions` — reinsurer firms up, cedant accepts, either declines,
  terminals cannot move, allowed-next lists
- `appetite matching` — hard filters (line of business, structure, excluded
  geographies), soft scoring (territory exact/worldwide/unknown, sum insured
  band penalties), score clamping, stable ranking

### What blocks runtime verification
- **Docker** — no `docker` CLI on this machine, so `docker-compose up postgres redis`
  cannot run. Postgres and Redis are unavailable.
- **pnpm** — not installed either (node v24 only). Installs here used `npm` per app;
  `pnpm-workspace.yaml` is still valid if you have pnpm.
- **AWS S3 credentials** — env validation calls `getOrThrow` on `AWS_S3_BUCKET`,
  `AWS_REGION` and the key pair, so the backend refuses to boot without them.
  Document upload/download is the only feature that needs them to actually work.

### Known unverified risk
The first migration now runs `CREATE EXTENSION IF NOT EXISTS "uuid-ossp"` before
the tables that call `uuid_generate_v4()`. Postgres does not enable that extension
by default, so without it every migration in the chain would fail on a fresh
database. The fix is reasoned, not runtime-confirmed — if the database user lacks
rights to create extensions, this needs a superuser or a switch to the built-in
`gen_random_uuid()`.

## Backend

**Phase 3 complete**: Quotes, risk-appetite matching, messaging, in-app notifications.

7 modules: auth, users, organizations, submissions, storage, forms, public, plus:
- **quotes** — reinsurers submit indication/firm order/binding quotes, cedants
  accept or decline, status transitions with role gates, comparison matrix
- **appetite** — reinsurers define what they want to write (lines, territories,
  capacity bands, structure), rule-based matcher scores incoming risks 0–100
- **messaging** — one thread per submission per counterparty so reinsurers bidding
  on the same risk never see each other's chat
- **notifications** — in-app only (no email/SMS), fans out to org members on
  quote/message events, polled unread-count endpoint for the bell badge

5 migrations (initial schema, submissions, auth enhancements, form schemas,
history) + Phase 3 migration (quotes gains `quoteType` + `declineReason`,
history gains `quote_received` + `quote_status_changed`, notifications,
risk appetites, message threads, messages)

Auth: JWT + rotating refresh tokens, bcrypt, expiring password-reset tokens  
Submissions: draft→submitted workflow, enforced status transitions, weighted
100-point completeness score, 50% minimum to submit, full change history  
Documents: S3 pre-signed upload/download, type + 50MB validation, 6 categories  
Forms: JSON Schema definitions, 5 seeded schemas

## Frontend

Auth pages (login, register, forgot, reset), protected routes with role checks,
role-filtered nav, dashboard, submissions list with filters and pagination,
two-step new-submission wizard that renders the backend's JSON Schema, submission
detail with **6 tabs**:
- **details, documents, history** (Phase 1/2)
- **quotes** — reinsurers submit quotes inline, cedants see all quotes + comparison
  matrix with summary stats, status buttons respect transition rules
- **messages** — cedants start threads with any market, reinsurers message the
  cedant, org-scoped access so counterparties never cross-contaminate
- **markets** — appetite match panel showing rule-based scoring + reasons (cedant only)

Plus: organizations, users, profile, forms catalogue, **appetite management**
(reinsurer-only page for defining what they want to look at), **opportunities**
feed (best-fit submissions ranked by their appetite score).

**Notification bell** in nav (unread badge, dropdown, mark read/all).

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
npm run seed:appetite         # gives matching 3 reinsurer appetites to demo with
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
Phase 4 (audit log, rate limiting, email/SMS notifications), unit and E2E tests
outside the 6 existing suites, controller/integration tests.
