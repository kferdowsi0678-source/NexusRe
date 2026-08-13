# NexusRe - Digital Reinsurance Placement Platform

A B2B SaaS platform and marketplace for Non-Life reinsurance placement, connecting African insurers and brokers with European and international capacity providers.

## 🎯 Overview

NexusRe reduces friction, time, and cost in placing Non-Life reinsurance (Treaty and Facultative) by providing a secure, transparent, AI-assisted digital placement workflow.

### Key Features

- **Multi-Role Access**: Support for Cedants, Brokers, Reinsurers, and Platform Admins
- **Risk Submission**: Dynamic forms for Treaty and Facultative placements
- **Document Intelligence**: AI-powered document extraction and summarization
- **Smart Matching**: Intelligent matching engine based on risk appetite profiles
- **Quoting Workflow**: Complete negotiation and binding flow
- **Secure Data Room**: Encrypted document storage with granular access control
- **Audit Trail**: Comprehensive tracking of all platform activities

### Lines of Business

Non-Life only: Property, Casualty, Specialty, Energy, Cyber, Political Violence, Agriculture, and more.

## 🏗️ Architecture

### Technology Stack

- **Frontend**: Next.js 15 (App Router), TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: NestJS (TypeScript)
- **Database**: PostgreSQL + Redis
- **File Storage**: AWS S3 (or compatible)
- **AI/ML**: OpenAI GPT-4o, Claude 3.5, AWS Textract
- **Authentication**: JWT + Passport.js (MFA ready)
- **API Documentation**: Swagger/OpenAPI
- **Container**: Docker + Docker Compose

## 📋 Current Implementation Status

**All phases of `Todolist.md` (0 through 5) are implemented.** `STATUS.md` is the
authoritative record of what has been *verified* versus merely written — compile,
build and 181 unit tests are executed results; anything requiring a live database,
S3 bucket, SMTP server or model API key is still unproven.

### ✅ Implemented

#### Foundation
- pnpm-workspace monorepo, Next.js 15 frontend, NestJS backend, Docker compose
- 9 TypeORM migrations, seed scripts for roles, organizations, form schemas and appetite
- Joi-validated environment configuration, separate dev/staging/production settings

#### Authentication & access control
- JWT with rotating refresh tokens, bcrypt hashing, expiring password-reset tokens
- Role-based access control across every module
- User, organization and membership management

#### Submissions & documents
- Treaty and facultative submissions with a draft → submitted workflow
- Enforced status transitions and a full change history
- Weighted 100-point completeness score, gated at 50% before submitting
- S3 pre-signed upload/download with file type and 50MB validation
- Dynamic forms driven by JSON Schema, with conditional logic

#### Marketplace & negotiation
- Quotes with indication / firm order / binding types and an enforced lifecycle
- Quote comparison matrix
- Risk appetite definitions and rule-based market matching
- Per-submission message threads with in-app and email notifications

#### Security & operations
- Immutable audit trail with credential redaction, written off the response path
- Rate limiting, helmet security headers, strict CORS
- One error envelope for every endpoint, carrying a correlation id
- Structured request logging, JSON in production

#### AI & analytics
- Document extraction via the Anthropic API with native PDF and image input,
  degrading to deterministic local parsing when no key is configured
- Human-in-the-loop review: a proposed field reaches the submission only after a
  reviewer accepts or edits it
- AI-assisted market matching layered over the rule engine, which still owns
  eligibility
- Dashboard analytics: volume, time to first quote, conversion rate, status funnel
- Placement slip / submission summary PDF export, with per-viewer quote visibility

#### Presentation
- English and French, with the French dictionary compile-checked against English
- Form schema admin panel with live preview

### 🚧 Remaining

- Runtime verification against a real database, S3 bucket and model API key
- Controller/integration tests and an E2E test for the main flow
- MFA (the data model accommodates it; the flow is not built)
- Redis-backed throttler store — the in-memory one is per-instance
- Weekly digest job — the preference toggle exists, nothing sends it
- Translating the remaining pages into French

## 🚀 Getting Started

### Prerequisites

- Node.js >= 20.0.0
- pnpm >= 8.0.0
- Docker and Docker Compose
- PostgreSQL 16 (or use Docker)
- Redis 7 (or use Docker)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/kferdowsi0678-source/NexusRe.git
   cd NexusRe
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**
   
   Backend:
   ```bash
   cd apps/backend
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start the services with Docker**
   ```bash
   # Start PostgreSQL and Redis
   docker-compose up -d postgres redis
   ```

5. **Run database migrations** (coming soon)
   ```bash
   cd apps/backend
   pnpm run migration:run
   ```

6. **Start the development servers**
   
   Backend:
   ```bash
   cd apps/backend
   pnpm run dev
   # Backend runs on http://localhost:3001
   # API docs at http://localhost:3001/api/docs
   ```
   
   Frontend:
   ```bash
   cd apps/frontend
   pnpm run dev
   # Frontend runs on http://localhost:3000
   ```

### Using Docker (Full Stack)

```bash
# Build and start all services
docker-compose up --build

# Run in background
docker-compose up -d

# Stop all services
docker-compose down

# View logs
docker-compose logs -f
```

## 📁 Project Structure

```
NexusRe/
├── apps/
│   ├── backend/              # NestJS API
│   │   ├── src/
│   │   │   ├── modules/
│   │   │   │   ├── auth/     # Authentication
│   │   │   │   ├── users/    # User management
│   │   │   │   ├── organizations/  # Organizations
│   │   │   │   └── submissions/    # Risk submissions
│   │   │   ├── common/
│   │   │   │   ├── guards/   # Auth guards
│   │   │   │   └── decorators/
│   │   │   ├── app.module.ts
│   │   │   └── main.ts
│   │   ├── Dockerfile
│   │   └── package.json
│   └── frontend/             # Next.js app
│       ├── src/
│       │   └── app/
│       ├── Dockerfile
│       └── package.json
├── packages/                 # Shared packages (future)
├── docker-compose.yml
├── pnpm-workspace.yaml
└── package.json
```

## 🔐 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Users
- `GET /api/users` - Get all users
- `GET /api/users/me` - Get current user profile
- `GET /api/users/:id` - Get user by ID
- `PATCH /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### Organizations
- `POST /api/organizations` - Create organization
- `GET /api/organizations` - Get all organizations
- `GET /api/organizations/:id` - Get organization by ID
- `PATCH /api/organizations/:id` - Update organization
- `DELETE /api/organizations/:id` - Delete organization

### Submissions
- `POST /api/submissions` - Create submission
- `GET /api/submissions` - Get all submissions
- `GET /api/submissions/:id` - Get submission by ID
- `PATCH /api/submissions/:id` - Update submission
- `PATCH /api/submissions/:id/status` - Update submission status
- `POST /api/submissions/:id/calculate-score` - Calculate completeness
- `DELETE /api/submissions/:id` - Delete submission
- `GET /api/submissions/:id/placement-slip` - Download the placement slip as a PDF

### Document extraction
- `POST /api/submissions/:id/extractions` - Read a document, propose risk fields
- `GET /api/submissions/:id/extractions` - List extraction runs
- `GET /api/submissions/:id/extractions/:extractionId` - One run with its fields
- `PATCH /api/submissions/:id/extractions/:extractionId/review` - Accept/edit/reject fields
- `POST /api/submissions/:id/extractions/:extractionId/apply` - Write reviewed fields in

### Marketplace
- `GET /api/submissions/:id/matches` - Suggested markets (`?ai=false` for rules only)
- `GET /api/risk-appetite` - Manage appetite definitions (reinsurers)
- `GET /api/risk-appetite/opportunities` - Submissions matching my appetite

### Analytics
- `GET /api/analytics/overview` - Counts by status, conversion rate, average completeness
- `GET /api/analytics/time-to-quote` - Average and median hours to first quote
- `GET /api/analytics/volume` - Submissions per month by line of business
- `GET /api/analytics/funnel` - How far submissions get through the lifecycle

### Form schema administration (super admin)
- `GET /api/forms/admin/schemas` - List every schema and version
- `POST /api/forms/admin/schemas` - Create a schema
- `PATCH /api/forms/admin/schemas/:id` - Edit, creating a new version
- `POST /api/forms/admin/schemas/:id/publish` - Publish or unpublish a version

**API Documentation**: http://localhost:3001/api/docs

### Error responses

Every endpoint returns the same envelope on failure. Quote `requestId` when
reporting a problem — it appears in the server logs for the same request.

```json
{
  "statusCode": 400,
  "error": "validation_failed",
  "message": ["sumInsured must be a positive number"],
  "requestId": "4f2c1a90-...",
  "path": "/api/submissions",
  "timestamp": "2026-08-13T09:14:22.001Z"
}
```

## 🗄️ Database Schema

### Core Entities

- **Organization** - Companies (Cedants, Brokers, Reinsurers)
- **User** - Platform users with role-based access
- **Role** - User roles (admin, cedant_user, broker_user, etc.)
- **Submission** - Risk placement submissions (Treaty/Facultative)
- **SubmissionDocument** - Uploaded documents with AI extraction
- **Quote** - Reinsurer quotes and offers

## 🛠️ Development

### Code Quality

```bash
# Lint
pnpm run lint

# Format
pnpm run format

# Test
pnpm run test
```

### Building for Production

```bash
# Build all apps
pnpm run build

# Build specific app
cd apps/backend && pnpm run build
cd apps/frontend && pnpm run build
```

## 📚 Documentation

- [Project Instructions](./instructions.md) - Detailed project requirements
- [API Documentation](http://localhost:3001/api/docs) - Swagger UI (when running)

## 🤝 Contributing

This is a private project. For questions or contributions, please contact the project maintainer.

## 📄 License

Proprietary - All rights reserved

## 🌐 Links

- **Repository**: https://github.com/kferdowsi0678-source/NexusRe
- **Issues**: https://github.com/kferdowsi0678-source/NexusRe/issues

## 📞 Support

For support and questions, please open an issue on GitHub or contact the development team.
## Toolchain note

The repo is configured for pnpm workspaces, but every command also works with
`npm install` / `npm run <script>` executed inside `apps/backend` or
`apps/frontend`. Build status and runtime caveats live in [STATUS.md](./STATUS.md).
