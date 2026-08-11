# NexusRe – Precise Development TODO List
**Last Updated:** Based on current repo state (Aug 2026)

---

## Phase 0: Critical Foundation (باید فوری انجام شود)
> بدون این‌ها پروژه قابل تست و توسعه پایدار نیست.

### 0.1 Database & Migrations
- [ ] نصب و پیکربندی TypeORM Migrations (یا Prisma اگر ترجیح می‌دهید)
- [ ] ایجاد Migration اولیه برای تمام Entityهای فعلی (User, Organization, Role, Submission, SubmissionDocument, Quote)
- [ ] اضافه کردن Indexهای لازم (cedantId, status, lineOfBusiness, createdAt و ...)
- [ ] Seed Data:
  - [ ] نقش‌های اصلی: `PLATFORM_ADMIN`, `CEDANT_USER`, `BROKER_USER`, `REINSURER_USER`
  - [ ] یک Admin اولیه
  - [ ] چند Organization نمونه (Cedant, Broker, Reinsurer)
  - [ ] چند Line of Business ثابت (یا از Enum استفاده شود)

### 0.2 Environment & Config
- [ ] تکمیل `.env.example` با تمام متغیرهای لازم
- [ ] جدا کردن Config برای Development / Staging / Production
- [ ] اضافه کردن Validation برای Environment Variables (با `@nestjs/config` + Joi یا Zod)

### 0.3 Authentication Improvements
- [ ] Refresh Token
- [ ] Password Reset Flow (Forgot Password + Reset)
- [ ] Invitation System (دعوت کاربر به Organization)
- [ ] پایه MFA (حتی اگر فعلاً اختیاری باشد)

---

## Phase 1: Core Submission Experience (اولویت خیلی بالا)

### 1.1 Document Management
- [ ] یکپارچه‌سازی با S3 (یا MinIO برای لوکال)
- [ ] Pre-signed URL برای Upload و Download
- [ ] ذخیره Metadata فایل (نام، نوع، حجم، uploader، تاریخ)
- [ ] دسته‌بندی اسناد (Risk Survey, Loss History, Financials, Wordings, Other)
- [ ] Soft Delete برای اسناد
- [ ] محدودیت حجم و نوع فایل

### 1.2 Submission Core Improvements
- [ ] Draft vs Submitted منطق کامل
- [ ] Versioning ساده برای Submission (یا حداقل history وضعیت)
- [ ] Completeness Score واقعی (بر اساس فیلدهای پر شده + اسناد)
- [ ] فیلتر و جستجوی پیشرفته Submissions (Status, LOB, Type, Date Range, Cedant)
- [ ] Pagination + Sorting استاندارد

### 1.3 Dynamic Forms Foundation
- [ ] طراحی ساختار Form Schema (JSON Schema یا مدل دیتابیسی)
- [ ] پشتیبانی از فیلدهای شرطی (Conditional Logic)
- [ ] فرم پایه برای **Property – Facultative**
- [ ] فرم پایه برای **Engineering – Facultative**
- [ ] فرم پایه برای **Treaty** (Generic)
- [ ] ذخیره داده‌های فرم در `riskDetails` به صورت ساختارمند

---

## Phase 2: Frontend MVP (اولویت بالا)

### 2.1 Authentication UI
- [ ] صفحه Login
- [ ] صفحه Register (با انتخاب Organization Type)
- [ ] صفحه Forgot/Reset Password
- [ ] Protected Routes + Role-based Access در Frontend

### 2.2 Main Layout & Navigation
- [ ] Sidebar / Top Navigation بر اساس Role
- [ ] Dashboard خالی اما کاربردی برای هر Role
- [ ] Profile و تنظیمات کاربر

### 2.3 Submissions UI
- [ ] لیست Submissions (با فیلتر و جستجو)
- [ ] صفحه ایجاد Submission جدید (انتخاب Type + LOB)
- [ ] صفحه جزئیات Submission
- [ ] آپلود سند در صفحه Submission
- [ ] تغییر وضعیت Submission (با کنترل دسترسی)

---

## Phase 3: Quoting & Marketplace Basics (اولویت متوسط-بالا)

### 3.1 Quote Module
- [ ] ایجاد Quote توسط Reinsurer
- [ ] انواع Quote (Indication / Firm Order / Binding)
- [ ] Quote Comparison Matrix (Backend + Frontend)
- [ ] تغییر وضعیت Quote

### 3.2 Risk Appetite (پایه)
- [ ] Entity برای RiskAppetite
- [ ] تعریف Appetite توسط Reinsurer (LOB, Geography, Capacity, Structure Preference)
- [ ] Matching ساده Rule-based (اولویت با قوانین، بعداً AI)

### 3.3 Messaging (حداقلی)
- [ ] Thread پیام برای هر Submission
- [ ] ارسال و دریافت پیام بین Cedant/Broker و Reinsurer
- [ ] Notification پایه (In-app + Email)

---

## Phase 4: Security, Audit & Polish

### 4.1 Audit Trail
- [ ] Entity جداگانه `AuditLog`
- [ ] ثبت تمام اقدامات مهم (ایجاد، تغییر وضعیت، آپلود سند، مشاهده سند، Quote و ...)
- [ ] نمایش Audit Log در صفحه Submission (برای Admin و کاربران مجاز)

### 4.2 Security Hardening
- [ ] Rate Limiting
- [ ] Helmet + CORS صحیح
- [ ] Input Validation قوی‌تر در تمام DTOها
- [ ] File Type Validation واقعی (نه فقط extension)
- [ ] Permission Guardهای دقیق‌تر بر اساس Organization Membership

### 4.3 Notifications
- [ ] سیستم Notification (In-app)
- [ ] Email Notification برای رویدادهای کلیدی (New Submission, New Quote, Status Change)

---

## Phase 5: Advanced Features (بعد از MVP)

- [ ] AI Document Extraction (OCR + LLM)
- [ ] Human-in-the-loop برای اصلاح داده‌های استخراج‌شده
- [ ] Matching هوشمندتر با AI
- [ ] Dashboard Analytics (حجم، میانگین زمان Quote، Conversion Rate)
- [ ] Export به PDF (Placement Slip / Summary)
- [ ] Multi-language (حداقل English + French)
- [ ] Form Schema Admin Panel (مدیریت فرم‌های پویا از پنل ادمین)

---

## Technical Debt & Quality (همیشه در پس‌زمینه)

- [ ] Unit Test برای Serviceهای اصلی (به خصوص Submission و Auth)
- [ ] E2E Test برای Flow اصلی (Login → Create Submission → Upload → Quote)
- [ ] API Documentation کامل و به‌روز در Swagger
- [ ] Error Handling استاندارد و یکپارچه
- [ ] Logging ساختاریافته
- [ ] README و Documentation داخلی را همیشه به‌روز نگه دارید

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
