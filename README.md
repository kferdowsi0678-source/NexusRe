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

### ✅ Completed Features

#### Phase 1: Project Foundation
- Monorepo structure with pnpm workspaces
- Next.js 15 frontend application
- NestJS backend API
- Docker configuration for all services
- TypeScript configuration
- Environment variable setup

#### Phase 2: Authentication & Authorization
- User authentication with JWT
- Local authentication strategy
- Password hashing with bcrypt
- Role-based access control (RBAC) foundation
- User and Organization management
- API endpoints with Swagger documentation

#### Phase 3: Risk Submission Foundation
- Submission entity (Treaty & Facultative)
- Submission document management
- Quote entity and workflow
- Completeness scoring system
- Status lifecycle management
- CRUD operations with access control

### 🚧 In Progress / Planned

- MFA (Multi-Factor Authentication)
- Document upload with AWS S3
- AI-powered document extraction
- Risk appetite matching engine
- Frontend UI components
- Database migrations
- Seed data for roles and initial admin

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

**API Documentation**: http://localhost:3001/api/docs

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
