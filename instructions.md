\# Project Instruction: NexusRe – Digital Reinsurance Placement Platform



\## 1. Project Overview



\*\*Name:\*\* NexusRe  

\*\*Type:\*\* B2B SaaS Platform + Marketplace for Non-Life Reinsurance Placement  

\*\*Focus Lines:\*\* Non-Life only (Property, Casualty, Specialty, Energy, Cyber, Political Violence, Agriculture, etc.)  

\*\*Contract Types:\*\* Both \*\*Treaty\*\* (proportional \& non-proportional) and \*\*Facultative\*\*  

\*\*Primary Geography (Phase 1):\*\* Africa (cedants \& local brokers) + Europe (capacity providers / London market)  

\*\*Later phases:\*\* Iran and other markets  



\*\*Core Value Proposition:\*\*  

Reduce friction, time, and cost of placing Non-Life reinsurance (especially facultative and specialty) between African insurers/brokers and European/international capacity by providing a secure, transparent, AI-assisted digital placement workflow.



\*\*Important Strategic Constraint:\*\*  

We start as a \*\*technology platform\*\*. Full regulated brokerage activities and complex regulatory features will be added only after obtaining the necessary licenses. Design the system so that licensing layers can be activated later without major rewrites.



\---



\## 2. Target Users \& Roles



| Role              | Description                                      | Key Needs                                      |

|-------------------|--------------------------------------------------|------------------------------------------------|

| Cedant            | African insurance companies                      | Easy submission, tracking, transparency        |

| Broker            | Local or international reinsurance brokers       | Manage multiple clients, submission packaging  |

| Reinsurer         | European / international capacity providers      | Appetite matching, clean risk packs, audit trail |

| Platform Admin    | Internal team                                    | User management, configuration, monitoring     |



Support multi-tenancy and hierarchical access (e.g. broker managing multiple cedants).



\---



\## 3. MVP Scope (Phase 1 – Must Have)



\### 3.1 Authentication \& Access Control

\- Secure multi-role authentication (Email + Password + MFA)

\- Role-based access control (RBAC)

\- Organization / Company structure

\- Invitation system

\- Future-ready for SSO / SAML / SCIM (enterprise readiness)



\### 3.2 Risk Submission

\- Dynamic forms based on Line of Business + Treaty vs Facultative

\- Support for both:

&#x20; - Facultative (single risk)

&#x20; - Treaty (program / structure definition)

\- Rich document upload (PDF, Excel, Word, images)

\- Version control of submissions

\- Completeness scoring / validation before submission

\- Ability to save as draft



\### 3.3 Document Intelligence

\- AI-powered document extraction and summarization (OCR + LLM)

\- Automatic extraction of key fields (sums insured, locations, loss history, occupancy, etc.)

\- Human-in-the-loop review and correction

\- Structured risk summary generation



\### 3.4 Marketplace \& Matching

\- Reinsurers can define and manage Risk Appetite profiles (LOB, geography, capacity, preferred structures, exclusions)

\- Intelligent matching engine that suggests suitable reinsurers for a given submission

\- Ability for brokers/cedants to select target markets (manual + suggested)



\### 3.5 Quoting \& Negotiation Workflow

\- Reinsurers can submit quotes / indications / firm offers

\- Quote comparison matrix (side-by-side)

\- Messaging / Q\&A thread per risk (secure, auditable)

\- Status lifecycle: Draft → Submitted → Under Review → Quoted → Negotiating → Bound / Declined / Expired

\- Binding confirmation and generation of basic placement summary / slip (PDF)



\### 3.6 Secure Data Room \& Collaboration

\- Encrypted document storage

\- Granular access control per document / folder

\- Full audit trail of who viewed / downloaded / uploaded what and when

\- Watermarking option for sensitive documents



\### 3.7 Dashboards \& Tracking

\- Role-specific dashboards

\- Pipeline view of all placements

\- Status filters, search, and basic analytics (volume, average time to quote, etc.)



\### 3.8 Notifications

\- Email + in-app notifications for key events (new submission, new quote, status change, messages)



\---



\## 4. Out of Scope for MVP (Future Phases)

\- Full treaty accounting / bordereaux automation

\- Claims management

\- Automated premium calculation \& settlement

\- Full ACORD GRLC message generation (but design data model to be compatible)

\- Advanced portfolio analytics / accumulation

\- Mobile native apps

\- Direct regulatory reporting

\- Tokenization / blockchain features



\---



\## 5. Recommended Technical Architecture



\### Preferred Stack (Modern, Secure, Scalable)

\- \*\*Frontend:\*\* Next.js 15 (App Router) + TypeScript + Tailwind CSS + shadcn/ui

\- \*\*Backend:\*\* NestJS (TypeScript) or FastAPI (Python) — prefer NestJS for strong typing and enterprise patterns

\- \*\*Database:\*\* PostgreSQL (primary) + Redis (caching / queues)

\- \*\*File Storage:\*\* AWS S3 (or equivalent) with server-side encryption + pre-signed URLs

\- \*\*Authentication:\*\* Clerk or Auth0 (easy enterprise SSO later) or self-hosted Keycloak

\- \*\*AI Layer:\*\* 

&#x20; - Document extraction: combination of OCR (e.g. AWS Textract / Azure Document Intelligence) + LLM (Claude 3.5 / GPT-4o)

&#x20; - Matching \& summarization: LLM + structured outputs

\- \*\*Background Jobs:\*\* BullMQ / Celery / Inngest

\- \*\*Search:\*\* PostgreSQL full-text + optional Meilisearch / Typesense

\- \*\*Infrastructure:\*\* Docker + Kubernetes (or Railway / Render / AWS ECS for faster start)

\- \*\*Observability:\*\* OpenTelemetry + Sentry + structured logging



\### Key Architectural Principles

\- Multi-tenancy from day one

\- Event-driven where possible (for audit trail and future integrations)

\- API-first design

\- Strong encryption at rest and in transit

\- Data residency awareness (ability to keep African data in specific regions later)

\- Design data models with future ACORD GRLC compatibility in mind



\---



\## 6. Core Data Models (High Level)



\- Organization (Company)

\- User + Role + Membership

\- LineOfBusiness

\- RiskAppetite (Reinsurer)

\- Submission (Treaty or Facultative)

\- SubmissionDocument

\- ExtractedData / RiskSummary

\- Quote / Offer

\- MessageThread / Message

\- PlacementStatusHistory

\- AuditLog (immutable)



Treat Treaty and Facultative as different subtypes of Submission with shared and specific fields.



\---



\## 7. Security \& Compliance Requirements (MVP Level)



\- All documents encrypted at rest

\- Strict access control and audit logging

\- MFA mandatory for all users

\- Rate limiting and basic bot protection

\- GDPR / data protection ready (right to access, deletion, export)

\- Clear separation of environments (dev / staging / prod)

\- Secrets management (no secrets in code)



Design so that later we can add:

\- Stronger KYC / AML

\- Regulatory reporting modules

\- Jurisdiction-specific data residency



\---



\## 8. Non-Functional Requirements



\- Performance: Page loads < 2s, document processing feedback within seconds

\- Availability target: 99.5%+ for MVP

\- Scalability: Designed to handle hundreds of concurrent users and thousands of submissions per year initially

\- Mobile-responsive (desktop-first is acceptable for MVP)

\- Excellent error handling and user feedback



\---



\## 9. Development Priorities (Suggested Order)



1\. Project setup + Auth + Organizations + RBAC

2\. Submission creation (basic forms + document upload)

3\. Document storage + basic data room

4\. AI extraction pipeline (start simple)

5\. Risk Appetite management

6\. Matching engine (rule-based first, then AI-assisted)

7\. Quoting workflow + comparison matrix

8\. Messaging + status management

9\. Dashboards + notifications

10\. Audit trail polish + security hardening



\---



\## 10. Success Metrics for MVP



\- Time from submission to first quote < 48 hours (target)

\- High completeness score of submissions

\- Positive feedback from pilot African brokers and European capacity providers

\- Clean, auditable trail of every placement action



\---



\## 11. Additional Notes for the Coding Agent



\- Prioritize clean, maintainable, well-documented code.

\- Use strong typing everywhere.

\- Write meaningful tests for core business logic (especially matching, status transitions, and access control).

\- Make configuration of Lines of Business and form fields admin-driven as much as possible.

\- Prepare the system for future multi-language support (English first, French/Arabic later for Africa).

\- Keep the UI professional, clean, and trustworthy (reinsurance buyers and underwriters are conservative users).



\---



\*\*End of Instruction\*\*



Please start by scaffolding the project with the recommended stack, implementing authentication + organizations + basic submission creation, and then proceed according to the priority order above. Ask clarifying questions if any part of the domain logic needs more detail before implementation.



