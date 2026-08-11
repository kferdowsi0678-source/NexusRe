# NexusRe — Status

Digital reinsurance placement platform. Monorepo: `apps/backend` (NestJS) +
`apps/frontend` (Next.js 15).

## Verification state

| Check | Result |
|---|---|
| `tsc --noEmit` backend | passes (0 errors) |
| `tsc --noEmit` frontend | passes (0 errors) |
| `nest build` backend | passes |
| `next build` frontend | passes, 15 routes |
| Migrations run against a database | **not done** |
| Seeds run | **not done** |
| API called at runtime | **not done** |
| Automated tests | **none written** |

Everything below is verified to compile and build. None of it has been executed
against a live database, so runtime behaviour is unproven.

### What blocks runtime verification
- **Postgres + Redis** — `docker-compose up -d postgres redis` has not been run here.
- **AWS S3 credentials** — document upload/download needs a real bucket. Env
  validation calls `getOrThrow` on `AWS_S3_BUCKET`, `AWS_REGION` and the key pair,
  so the backend will refuse to boot until those are set.
- **pnpm** — not installed on this machine (node v24 only). The repo has
  `pnpm-workspace.yaml`, but all installs here were done with `npm` per app.

## Backend

6 modules: auth, users, organizations, submissions, storage, forms. Plus a small
`public` module exposing `/public/organizations` and `/public/roles` so the
unauthenticated register screen can populate its dropdowns (`super_admin` is
filtered out server-side).

- 5 migrations, indexed on the columns the list/filter queries actually use
- Auth: JWT + rotating refresh tokens, bcrypt, expiring password-reset tokens
- Submissions: draft→submitted workflow, enforced status transitions, weighted
  100-point completeness score, minimum 50% to submit, full change history
- Documents: S3 with pre-signed upload/download, type + 50MB size validation,
  6 categories
- Forms: JSON Schema definitions, 5 seeded schemas (property, engineering,
  treaty, casualty, energy)

## Frontend

Auth pages (login, register, forgot, reset), protected routes with role checks,
role-filtered nav, dashboard, submissions list with filters/pagination, two-step
new-submission wizard rendering the backend's JSON Schema, submission detail with
details/documents/history tabs, drag-and-drop document manager, organizations,
users, profile, forms catalogue.

## Run it

```bash
# deps (npm works per-app; pnpm also fine if installed)
cd apps/backend  && npm install
cd ../frontend   && npm install

# database
docker-compose up -d postgres redis

# configure — backend will not boot without the AWS vars
cp apps/backend/.env.example apps/backend/.env

cd apps/backend
npm run migration:run
npm run seed
npm run seed:forms
npm run seed:additional-forms
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
limiting, notifications), unit and E2E tests.
