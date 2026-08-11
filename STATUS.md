# NexusRe — Status

Digital reinsurance placement platform. Monorepo: `apps/backend` (NestJS) +
`apps/frontend` (Next.js 15).

## Verification state

| Check | Result |
|---|---|
| `tsc --noEmit` backend | passes, 0 errors |
| `tsc --noEmit` frontend | passes, 0 errors |
| `nest build` backend | passes |
| `next build` frontend | passes, 15 routes |
| `npm test` backend | **17 tests, 4 suites, all passing** |
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

7 modules: auth, users, organizations, submissions, storage, forms, public. The
`public` module exposes `/public/organizations` and `/public/roles` so the
unauthenticated register screen can populate its dropdowns; `super_admin` is
filtered out server-side.

- 5 migrations, indexed on the columns the list and filter queries use
- Auth: JWT + rotating refresh tokens, bcrypt, expiring password-reset tokens
- Submissions: draft→submitted workflow, enforced status transitions, weighted
  100-point completeness score, 50% minimum to submit, full change history
- Documents: S3 pre-signed upload/download, type + 50MB validation, 6 categories
- Forms: JSON Schema definitions, 5 seeded schemas

## Frontend

Auth pages (login, register, forgot, reset), protected routes with role checks,
role-filtered nav, dashboard, submissions list with filters and pagination,
two-step new-submission wizard that renders the backend's JSON Schema, submission
detail with details/documents/history tabs, drag-and-drop document manager,
organizations, users, profile, forms catalogue.

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
npm test             # 17 unit tests, no database required
npm run dev          # :3001, docs at /api/docs

cd ../frontend
npm run dev          # :3000
```

Seeded logins: `admin@nexusre.com` / `Admin123!@#`,
`cedant@lagosgeneral.ng` / `Cedant123!`,
`broker@africanrebrokers.ke` / `Broker123!`,
`underwriter@munichre.com` / `Reinsurer123!`

## Not started
Phase 3 (quotes, risk-appetite matching, messaging), Phase 4 (audit log, rate
limiting, notifications), E2E tests, controller/integration tests.
