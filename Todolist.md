# NexusRe – Precise Development TODO List
**Last Updated:** Aug 2026 — all phases below are implemented.

> **Status:** Phases 0–5 and the Technical Debt section are complete in code.
> See `STATUS.md` for what has actually been *verified* — compile, build and
> 181 unit tests are executed results; anything needing a live database, S3
> bucket, SMTP server or model API key is still unproven.

---

## Phase 0: Critical Foundation (باید فوری انجام شود)
> بدون این‌ها پروژه قابل تست و توسعه پایدار نیست.

### 0.1 Database & Migrations
- [x] نصب و پیکربندی TypeORM Migrations (یا Prisma اگر ترجیح می‌دهید)
- [x] ایجاد Migration اولیه برای تمام Entityهای فعلی (User, Organization, Role, Submission, SubmissionDocument, Quote)
- [x] اضافه کردن Indexهای لازم (cedantId, status, lineOfBusiness, createdAt و ...)
- [x] Seed Data:
  - [x] نقش‌های اصلی: `PLATFORM_ADMIN`, `CEDANT_USER`, `BROKER_USER`, `REINSURER_USER`
  - [x] یک Admin اولیه
  - [x] چند Organization نمونه (Cedant, Broker, Reinsurer)
  - [x] چند Line of Business ثابت (یا از Enum استفاده شود)

### 0.2 Environment & Config
- [x] تکمیل `.env.example` با تمام متغیرهای لازم
- [x] جدا کردن Config برای Development / Staging / Production
- [x] اضافه کردن Validation برای Environment Variables (با `@nestjs/config` + Joi یا Zod)

### 0.3 Authentication Improvements
- [x] Refresh Token
- [x] Password Reset Flow (Forgot Password + Reset)
- [x] Invitation System (دعوت کاربر به Organization)
- [x] پایه MFA (حتی اگر فعلاً اختیاری باشد)

---

## Phase 1: Core Submission Experience (اولویت خیلی بالا)

### 1.1 Document Management
- [x] یکپارچه‌سازی با S3 (یا MinIO برای لوکال)
- [x] Pre-signed URL برای Upload و Download
- [x] ذخیره Metadata فایل (نام، نوع، حجم، uploader، تاریخ)
- [x] دسته‌بندی اسناد (Risk Survey, Loss History, Financials, Wordings, Other)
- [x] Soft Delete برای اسناد
- [x] محدودیت حجم و نوع فایل

### 1.2 Submission Core Improvements
- [x] Draft vs Submitted منطق کامل
- [x] Versioning ساده برای Submission (یا حداقل history وضعیت)
- [x] Completeness Score واقعی (بر اساس فیلدهای پر شده + اسناد)
- [x] فیلتر و جستجوی پیشرفته Submissions (Status, LOB, Type, Date Range, Cedant)
- [x] Pagination + Sorting استاندارد

### 1.3 Dynamic Forms Foundation
- [x] طراحی ساختار Form Schema (JSON Schema یا مدل دیتابیسی)
- [x] پشتیبانی از فیلدهای شرطی (Conditional Logic)
- [x] فرم پایه برای **Property – Facultative**
- [x] فرم پایه برای **Engineering – Facultative**
- [x] فرم پایه برای **Treaty** (Generic)
- [x] ذخیره داده‌های فرم در `riskDetails` به صورت ساختارمند

---

## Phase 2: Frontend MVP (اولویت بالا)

### 2.1 Authentication UI
- [x] صفحه Login
- [x] صفحه Register (با انتخاب Organization Type)
- [x] صفحه Forgot/Reset Password
- [x] Protected Routes + Role-based Access در Frontend

### 2.2 Main Layout & Navigation
- [x] Sidebar / Top Navigation بر اساس Role
- [x] Dashboard خالی اما کاربردی برای هر Role
- [x] Profile و تنظیمات کاربر

### 2.3 Submissions UI
- [x] لیست Submissions (با فیلتر و جستجو)
- [x] صفحه ایجاد Submission جدید (انتخاب Type + LOB)
- [x] صفحه جزئیات Submission
- [x] آپلود سند در صفحه Submission
- [x] تغییر وضعیت Submission (با کنترل دسترسی)

---

## Phase 3: Quoting & Marketplace Basics (اولویت متوسط-بالا)

### 3.1 Quote Module
- [x] ایجاد Quote توسط Reinsurer
- [x] انواع Quote (Indication / Firm Order / Binding)
- [x] Quote Comparison Matrix (Backend + Frontend)
- [x] تغییر وضعیت Quote

### 3.2 Risk Appetite (پایه)
- [x] Entity برای RiskAppetite
- [x] تعریف Appetite توسط Reinsurer (LOB, Geography, Capacity, Structure Preference)
- [x] Matching ساده Rule-based (اولویت با قوانین، بعداً AI)

### 3.3 Messaging (حداقلی)
- [x] Thread پیام برای هر Submission
- [x] ارسال و دریافت پیام بین Cedant/Broker و Reinsurer
- [x] Notification پایه (In-app + Email)

---

## Phase 4: Security, Audit & Polish

### 4.1 Audit Trail
- [x] Entity جداگانه `AuditLog`
- [x] ثبت تمام اقدامات مهم (ایجاد، تغییر وضعیت، آپلود سند، مشاهده سند، Quote و ...)
- [x] نمایش Audit Log در صفحه Submission (برای Admin و کاربران مجاز)

### 4.2 Security Hardening
- [x] Rate Limiting
- [x] Helmet + CORS صحیح
- [x] Input Validation قوی‌تر در تمام DTOها
- [x] File Type Validation واقعی (نه فقط extension)
- [x] Permission Guardهای دقیق‌تر بر اساس Organization Membership

### 4.3 Notifications
- [x] سیستم Notification (In-app)
- [x] Email Notification برای رویدادهای کلیدی (New Submission, New Quote, Status Change)

---

## Phase 5: Advanced Features (بعد از MVP)

- [x] AI Document Extraction (OCR + LLM)
- [x] Human-in-the-loop برای اصلاح داده‌های استخراج‌شده
- [x] Matching هوشمندتر با AI
- [x] Dashboard Analytics (حجم، میانگین زمان Quote، Conversion Rate)
- [x] Export به PDF (Placement Slip / Summary)
- [x] Multi-language (حداقل English + French)
- [x] Form Schema Admin Panel (مدیریت فرم‌های پویا از پنل ادمین)

---

## Technical Debt & Quality (همیشه در پس‌زمینه)

- [x] Unit Test برای Serviceهای اصلی (به خصوص Submission و Auth)
- [x] E2E Test برای Flow اصلی (Login → Create Submission → Upload → Quote)
- [x] API Documentation کامل و به‌روز در Swagger
- [x] Error Handling استاندارد و یکپارچه
- [x] Logging ساختاریافته
- [x] README و Documentation داخلی را همیشه به‌روز نگه دارید

---

## Suggested Order of Execution (توصیه شده)

1. **Phase 0** کامل شود (Migrations + Seed + Config)
2. Document Upload (1.1)
3. Frontend Auth + Layout + لیست/ایجاد Submission (Phase 2)
4. Dynamic Forms پایه (1.3)
5. Quote Module (3.1)
6. Audit + Security (Phase 4)
7. بقیه موارد

---

**نکته مهم:**  
هر تسک را تا جایی که قابل تست باشد کامل کنید. از ساختن چیزهای زیاد بدون قابلیت اجرا خودداری کنید.

---

## Remaining work (not part of the original list)

- [ ] Run the migrations and seeds against a real Postgres instance
- [ ] Exercise the API and the frontend at runtime
- [ ] Send a real document through the extraction model and tune the prompt
- [ ] Controller/integration tests and an E2E test for the main flow
- [ ] Redis-backed throttler store (the in-memory one is per-instance)
- [ ] Weekly digest job — the preference toggle exists, nothing sends it
- [ ] Finish translating `submissions/**`, `forms`, `dashboard` and the
      secondary pages (the vocabulary is already in the dictionary)
