# NexusRe — Status

Digital reinsurance placement platform. Monorepo: `apps/backend` (NestJS) +
`apps/frontend` (Next.js 15).

**All phases of `Todolist.md` (0 through 5) are implemented.** What remains is
runtime verification and the integration/E2E testing called out at the bottom.

## Verification state

| Check | Result |
|---|---|
| `tsc --noEmit` backend | passes, 0 errors |
| `tsc --noEmit` frontend | passes, 0 errors |
| `nest build` backend | passes |
| `next build` frontend | passes, **18 routes** |
| `npm test` backend | **181 tests, 13 suites, all passing** |
| Migrations run against a database | **not done** |
| Seeds run | **not done** |
| API called at runtime | **not done** |
| Frontend exercised in a browser | **not done** |
| A real document sent to the extraction model | **not done** |

Compile, build and unit tests are executed results. Anything needing a live
database, SMTP server, S3 bucket or model API key is unproven.

### What blocks runtime verification
- **Docker** — no `docker` CLI on this machine, so `docker-compose up postgres redis`
  cannot run. Postgres and Redis are unavailable.
- **pnpm** — not installed either (node v24 only). Installs here used `npm` per app;
  `pnpm-workspace.yaml` is still valid if you have pnpm.
- **AWS S3 credentials** — env validation calls `getOrThrow` on `AWS_S3_BUCKET`,
  `AWS_REGION` and the key pair, so the backend refuses to boot without them.
- **SMTP** — optional by design. With no `SMTP_HOST` the email service logs what it
  would have sent and returns.
- **`ANTHROPIC_API_KEY`** — optional by design. Without it, extraction falls back to
  local heuristics and market matching stays purely rule-based.

### Known unverified risks
- The first migration runs `CREATE EXTENSION IF NOT EXISTS "uuid-ossp"` before the
  tables that call `uuid_generate_v4()`. Reasoned, not runtime-confirmed: if the DB
  user cannot create extensions this needs a superuser or a switch to
  `gen_random_uuid()`.
- The audit interceptor infers `resourceType` from the URL path. Routes that do not
  follow the REST shape log against the closest recognised segment.
- Rate limiting is in-memory. Behind more than one backend instance the 100/min
  ceiling is per-instance until a Redis throttler store is wired in.
- The extraction prompt and JSON schema have been exercised against the type system
  and the normalisation tests, but never against the live model. Field keys the model
  actually returns may need the prompt tightening.
- PDF layout was rendered and inspected during development, but not against a
  submission loaded from a real database.

## Backend

Modules: auth, users, organizations, submissions, storage, forms, public, quotes,
appetite, messaging, notifications, audit, email, **extraction**, **analytics**,
**documents-export**.

9 migrations. Auth uses JWT + rotating refresh tokens, bcrypt, expiring reset tokens.
Submissions have a draft→submitted workflow, enforced status transitions, a weighted
100-point completeness score gated at 50% to submit, and full change history.
Documents use S3 pre-signed upload/download with type and 50MB validation.

### Phase 4 — audit, rate limiting, email
- **audit** — immutable trail. A global interceptor records every POST/PATCH/DELETE
  with actor, resource, after-snapshot, IP and user agent; password and token fields
  are redacted before persisting. Writes are deferred with `setImmediate` so logging
  never delays a response, and failures are swallowed so it cannot break the
  operation it is tracking. `@SkipAudit()` opts a route out. Search is super-admin only.
- **rate limiting** — `@nestjs/throttler`, 100 requests/minute per IP globally,
  with `@CustomThrottle(limit, ttl)` and `@SkipThrottle()` for per-route control.
- **email** — nodemailer + Handlebars, 5 templates. Degrades to console logging when
  SMTP is unset. Per-user `EmailPreferences` created lazily on first read.

### Phase 5 — AI, analytics, export, i18n, form admin
- **extraction** — reads an uploaded document and proposes structured risk fields.
  PDFs and images go to the model as native input; text files fall back to
  deterministic local parsing when no API key is set. Model output is treated as
  untrusted: keys are restricted to safe dot paths (a forbidden segment rejects the
  whole key rather than being stripped), values are coerced and length-capped,
  confidence is clamped, and placeholders like "N/A" are dropped.
- **human-in-the-loop review** — a proposed field reaches `riskDetails` only after a
  reviewer accepts or edits it. The model's original reading is never overwritten, so
  every run stays auditable, and applying recomputes the completeness score.
- **AI-assisted matching** — the rule engine still decides eligibility; the model only
  re-orders and explains markets the rules already allowed, capped at ±20 points.
  Assessments naming markets that were not offered are discarded. `?ai=false` returns
  the unassisted ranking.
- **analytics** — volume, average and median time to first quote, conversion rate,
  status funnel and LOB breakdown, scoped by role. A reinsurer never sees a
  competitor's quote through this module.
- **documents-export** — placement slip / submission summary as a streamed PDF.
  Access is enforced per viewer: the ceding side and super admins get the whole slip;
  a market that has quoted gets the slip with its own quotes only; anyone else is
  refused.
- **form schema admin** — versioned create/edit/clone/publish for dynamic form
  schemas, super-admin only, with server-side validation that a schema is renderable
  before it can be saved.

### Error handling and observability
- A global exception filter gives every endpoint one error envelope:
  `{ statusCode, error, message[], requestId, path, timestamp }`. Database errors are
  logged in full but reduced to a generic message, so schema details never reach a
  caller.
- `RequestIdMiddleware` sets a correlation id (honouring an upstream `x-request-id`
  when it looks like one) and echoes it back; `LoggingInterceptor` writes one
  structured line per request, JSON in production.

### Environment variables
Mandatory: database, Redis, JWT pair, `FRONTEND_URL`, and the AWS S3 set.
Optional: `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`,
`EMAIL_FROM`, `EMAIL_FROM_NAME`, `THROTTLE_TTL`, `THROTTLE_LIMIT`,
`ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL` (default `claude-opus-5`),
`AI_EXTRACTION_ENABLED`, `AWS_TEXTRACT_REGION`.

## Frontend

18 routes. Auth pages, protected routes with role checks, role-filtered nav,
an analytics dashboard, submissions list with filters and pagination, a two-step
wizard that renders the backend's JSON Schema, and a submission detail page with
seven tabs: details, documents, extracted data, quotes, markets, messages, history.

Also: organizations, users, profile, a form-schema admin panel with live preview,
appetite management and an opportunities feed (both reinsurer-only), a notification
bell, and an audit log viewer at `/audit` for super admins. Email preferences live on
the profile page. A 429 from the API becomes a readable message including the
`retry-after` window.

**Internationalisation** — English and French, with the French dictionary typed as
`typeof en` so a missing or misspelled key is a compile error. Locale persists to
localStorage and seeds from `navigator.language` on first visit. The shared chrome
and the auth pages are fully translated; `submissions/**`, `forms`, `dashboard` and
several secondary pages still carry hardcoded English, though the vocabulary they
need is already in the dictionary.

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
npm test                      # 181 unit tests, no database required
npm run dev                   # :3001, docs at /api/docs

cd ../frontend
npm run dev                   # :3000
```

Seeded logins: `admin@nexusre.com` / `Admin123!@#`,
`cedant@lagosgeneral.ng` / `Cedant123!`,
`broker@africanrebrokers.ke` / `Broker123!`,
`underwriter@munichre.com` / `Reinsurer123!`

## Not started
Controller and integration tests, E2E tests, Redis-backed throttler store, and the
weekly digest job (the preference toggle exists but nothing sends it yet).
Translating the remaining pages is a mechanical follow-up.
