# MIGRATION_STATUS.md

Functional-parity feature matrix. Status legend:
`⬜ not started` · `🟡 in progress / scaffolded` · `✅ done + tested` · `➖ dropped (dead code)`

This is a **long, incremental migration**. All new Spring Boot + Angular code
lives in the **`Kadr on Java/`** folder (the legacy Node/Vue app stays at the
repo root as reference). Delivered so far: Phases 1–5 (analysis, target
structure, Spring Boot foundation, Flyway baseline, Security + Users slice) plus
the Cases read/authorization slice. Remaining domains follow the same pattern.

---

## Phase tracker

| Phase | Description | Status |
|---|---|---|
| 1 | Analyze & document current system | ✅ |
| 2 | Target architecture & project structure | ✅ |
| 3 | Spring Boot foundation | ✅ |
| 4 | Database / Flyway baseline | ✅ |
| 5 | Security / authentication / authorization | 🟡 (login, refresh, logout, password reset, signup, OTP; Google login + admin sub-permissions pending) |
| 6 | Core domains (users→cases→mediation→documents→payments→admin→notifications) | 🟡 (users done; cases read + authz) |
| 7 | Angular foundation | 🟡 (workspace + core scaffolding) |
| 8 | Angular features (incremental) | 🟡 (cases list/detail + correspondence with live SSE) |
| 9 | Public website/blog → Thymeleaf SSR | 🟡 (home + blog + SEO done; more static pages + admin authoring pending) |
| 10 | S3 document management | ✅ (upload/presign/authz + agreement PDF) |
| 11 | Payment gateway integration | 🟡 (PayU end-to-end; Cashfree/PhonePe adapters pending) |
| 12 | Comprehensive tests | 🟡 (131 backend + 23 Angular unit/slice tests; full-app runtime smoke verified against MySQL incl. SPA serving, OpenAPI, dashboard, subscription, audit, finance, and full signup + password-reset flows + Flyway V4; SSR integration test tagged `integration`) |
| 13 | Dockerize | ✅ (multi-stage: Angular→Maven→JRE, non-root, SPA at /admin, healthcheck; full image build verified) |
| 14 | Deployment documentation | 🟡 (DEPLOYMENT.md drafted) |

---

## Feature matrix (current → target)

| Feature | Legacy impl | Target impl | Status | Tests |
|---|---|---|---|---|
| Password login (multi user-type) | `authController.login` | `AuthController`/`AuthService` | 🟡 | 🟡 |
| Google login | `authController.googleLogin` | `AuthService.googleLogin` | ⬜ | ⬜ |
| Access/refresh tokens (web cookie + mobile body) | `helper` + cookies | `JwtService` + cookie/body strategy | 🟡 | 🟡 |
| Logout | `authController.logout` | `AuthController.logout` | 🟡 | ⬜ |
| Password reset (email OTP) | `resetPassword`/`confirmPasswordChange` | `PasswordResetService` + `OtpService` (SecureRandom) | ✅ | ✅ |
| Angular: forgot-password (request OTP + confirm) | Vue reset views | `features/auth/forgot-password` | ✅ | ✅ |
| Signature OTP (SMS) | `sendOtp`/`verifyOtp` | `OtpService` | ⬜ | ⬜ |
| Email-exists check | `isEmailExist` | `UserQueryService` | 🟡 | ⬜ |
| Client signup (inactive, pending approval) | `clientController.newUserSignup` | `SignupService` (`/api/v1/signup/client`) | ✅ (S3 uploads + case-on-signup pending) | ✅ |
| Mediator signup (inactive, pending review) | `mediatorController.newMediatorSignup` | `SignupService` (`/api/v1/signup/mediator`) | ✅ (certificate uploads pending) | ✅ |
| Angular: client/mediator self-signup | Vue signup views | `features/auth/signup` | ✅ | ✅ |
| OTP service (secure codes, 10-min expiry, single-use) | inline in `authController` | `OtpService` (`otp_resets`) | ✅ | ✅ |
| Roles (ADMIN/MEDIATOR/CLIENT) | `requireRole` | Spring Security authorities | 🟡 | 🟡 |
| Admin sub-permissions (JSON) | `admin_permissions` | `AdminPermission` authorities | ⬜ | ⬜ |
| Resource authz (own cases/docs) | `caseAccessService` | `CaseAccessService` + service checks | 🟡 | ✅ |
| User profile update / delete account | `generalController` | `UserController` | ⬜ | ⬜ |
| Dashboard (role-specific) | `getDashboardContent` | `dashboard` module (`DashboardController`) + Angular `features/dashboard` | ✅ | ✅ |
| Cases: read/list (role-scoped, paginated) | `getMediationData`/helper | `cases` module (`CaseController`) | 🟡 | ✅ |
| Angular: cases list + detail (facade + API client, lazy routes) | Vue case views | `features/cases` | ✅ | ✅ |
| Angular: case correspondence UI + live SSE updates | Vue correspondence | `features/cases/correspondence` + `core/realtime` | ✅ | ✅ |
| Angular: payments (initiate → gateway redirect → verify on return) | Vue payment views | `features/payments` | ✅ | ✅ |
| SPA deep-link fallback (serve /admin index for client routes) | (SPA serve) | `common/web/WebConfig` | ✅ | ✅ (runtime-verified: /admin, deep links, assets all 200) |
| Angular: authorized document access (presigned URLs via FileService seam) | `getPresignedUrl` | `core/files/FileService` + correspondence attachments | ✅ | ✅ |
| OpenAPI contract (spec + Swagger UI + bearer-JWT scheme) | (none) | `common/web/OpenApiConfig` + springdoc | ✅ | ✅ (runtime-verified: /v3/api-docs, /swagger-ui.html 200) |
| Angular: role-aware dashboard (role-scoped case counts + quick links) | `getDashboardContent` view | `features/dashboard` → `/api/v1/dashboard/summary` | ✅ | ✅ (endpoint runtime-verified: 401 unauth + in OpenAPI) |
| Cases: object-level authorization (BOLA/IDOR) | `caseAccessService` | `CaseAccessService` | ✅ | ✅ |
| Cases: admin create | `generalController.newCase` | `CaseWriteService.createByAdmin` | ✅ | ✅ |
| Cases: client initiate | `clientController.initiateNewCase` | `CaseWriteService.initiateByClient` | 🟡 (evidence S3 pending) | ✅ |
| Cases: approve type | `clientCaseService.approveCaseType` | `CaseWriteService.approveType` | ✅ | ✅ |
| Cases: assign mediator (+milestone, audit, email) | `adminAssignCaseMediator` | `CaseWriteService.assignMediator` | ✅ | ✅ |
| Case milestones → case_history | `caseMilestoneService` | `CaseMilestoneService` | ✅ | 🟡 |
| Human case numbers (KDR-n, concurrency-safe) | `caseIdTracker` | `CaseNumberService` | ✅ | 🟡 |
| Audit hooks (CASE_CREATED/ASSIGNED/...) | `auditLogService` | `AuditPort` → `PersistentAuditPort` (DB-backed) | ✅ | ✅ |
| Mediation data / progress / milestones | `case` services | `mediation` module | ⬜ | ⬜ |
| Calendar events (create/list, case + personal) | `newCalendarEvent`/`getCalendarInit` | `calendar` module | 🟡 (meeting link via port) | ✅ |
| Calendar meeting invitations (email) | `meetingInvitationService` | notifications (port) | ⬜ | ⬜ |
| Event feedback / next steps | `submitEventFeedback` | `mediation` module | ⬜ | ⬜ |
| Case correspondence (channels + threads) | `caseCorrespondenceController` | `cases.correspondence` module | 🟡 (attachments need S3) | ✅ |
| Correspondence channel authorization | `canUseChannel` | `CaseCorrespondenceService` | ✅ | ✅ |
| Admin correspondence inbox / read-state | `listInbox`/`markInboxRead` | `cases.correspondence` (admin) | ⬜ | ⬜ |
| Case acknowledgment signing (sequential, OTP-gated, expiring) | `signatureController` | `mediation.SignatureService` | 🟡 (email/PDF via ports) | ✅ |
| Final agreement e-signature (both parties → PDF + invoice) | `submitAgreementSignature` | `mediation.SignatureService` | 🟡 (PDF/invoice via ports) | ✅ |
| Agreement/signature detail pages (public) | `getSignatureRequestDetails`/`getAgreementDetailsForSignature` | `PublicSignatureController` | ✅ | ✅ |
| Agreement PDF generation | puppeteer in controller | `AgreementPdfPort` (impl pending) | 🟡 | ⬜ |
| Documents → S3 upload (allow-list, size limits) | `uploadService.uploadToS3` | `S3FileStoragePort` + `UploadValidator` | ✅ | ✅ |
| Presigned download URLs (authorized) | `getPresignedUrl` | `DocumentUrlService` + `DocumentAccessService` | ✅ | ✅ |
| Agreement PDF generation (no puppeteer/Node) | puppeteer | `OpenHtmlAgreementPdfPort` (openhtmltopdf) | ✅ | 🟡 |
| Document access authorization | (scattered) | `DocumentAccessService` (case-access gated) | ✅ | ✅ |
| Payments: initiate/verify (purpose-authorized) | `paymentGatewayController` | `payments.PaymentController` + `PaymentOrderService` | ✅ | ✅ |
| Payments: gateway state machine + idempotent completion | `paymentOrderService` | `PaymentOrderService` | ✅ | ✅ |
| Payments: PayU adapter (SHA-512 hash forward+reverse verify) | `payuAdapter` | `PayuGatewayAdapter` | ✅ | ✅ |
| Payments: Cashfree/PhonePe adapters | `cashfree/phonepeAdapter` | (adapters pending) | ⬜ | ⬜ |
| Payments: return/webhook endpoints | `payuReturn`/`*Webhook` | `PaymentController` | ✅ | 🟡 |
| Payment fulfilment (idempotent) | `paymentFulfillmentService` | `PaymentFulfillmentPort` → `DefaultPaymentFulfillmentPort` | 🟡 (ledger; pipeline/PRO via ports) | ✅ |
| Transactions ledger | `transactions` | `Transaction` + `DefaultPaymentFulfillmentPort` | ✅ | ✅ |
| Mediator invoices (generate on payment, list, mark-paid) | `invoice` services | `finance` module (`InvoiceService`, `FinanceCaseInvoicePort`) | ✅ (PDF pending) | ✅ |
| Case→invoice pipeline (idempotent, commission/GST/tax) | `ensureInvoiceForCase` | `InvoiceService` ← `CaseInvoicePort` | ✅ | ✅ |
| Mediator bank account (upsert, masked read) | `financeController` | `finance.BankAccountService` | ✅ | ✅ |
| Angular: mediator finance (invoices list + bank account) | Vue invoice/finance views | `features/finance` | ✅ | ✅ |
| Private invoices (+ settings, PDF) | `privateInvoice*` | `finance` module | ⬜ | ⬜ |
| Mediator invoice PDF | `invoice` services | `finance` (PDF via openhtmltopdf, pending) | ⬜ | ⬜ |
| Subscriptions (PRO) + entitlements | `subscription*` | `subscription` module (`SubscriptionService`, real activation + pricing ports) | ✅ | ✅ |
| PRO activation on verified payment (idempotent, renew-extends) | `subscription*` | `RealSubscriptionActivationPort` ← payments fulfilment | ✅ | ✅ |
| PRO expiry sweep (daily, DB-locked, multi-instance safe) | `scheduler/*` | `SubscriptionExpiryJob` + `SchedulerLockService` | ✅ | ✅ |
| Angular: mediator PRO screen (status + features + upgrade) | Vue subscription | `features/subscription` → `/api/v1/subscription/status` | ✅ | ✅ |
| Rewards (catalog/redeem/fulfilment) | `reward*` | `rewards` module | ⬜ | ⬜ |
| Premium feature catalog | `premiumAdminController` | `subscription` module | ⬜ | ⬜ |
| Notifications engine (templates + {var} render + send + log) | `notification/*` | `notifications.NotificationService` | ✅ | ✅ |
| Email delivery (SMTP via Spring Mail) | nodemailer | `EmailChannelSender` | ✅ | 🟡 |
| SMS/WhatsApp/Push channels | channel modules | stub senders (provider seam) | 🟡 | ⬜ |
| Default email templates (seeded) | `seedNotificationTemplates` | Flyway `V2` | ✅ | ✅ |
| Cross-domain emails now live (case assign, signature, agreement, contact) | scattered | `@Primary` email-backed ports | ✅ | ✅ |
| Trigger-rule engine (table/field-driven auto-notifications) | `triggerRuleEngine` | `notifications` (pending) | ⬜ | ⬜ |
| Admin notifications console (templates/channels/bulk/logs) | `notificationAdminController` | `notifications` (admin, pending) | ⬜ | ⬜ |
| SSE real-time | `sseManager` | `SseManager` + `SseController` (Spring `SseEmitter`) | ✅ | 🟡 |
| File storage abstraction (S3-backed) | `uploadService` | `FileStoragePort` → `S3FileStoragePort` | ✅ | ✅ |
| Schedulers (daily reminder, sub expiry) + lock | `scheduler/*` | `@Scheduled` + `SchedulerLockService` (`scheduler_locks`) | 🟡 (sub-expiry done + DB lock infra; daily reminder pending) | 🟡 |
| Audit logging (persistent, correlation-id, admin query) | `auditLogService` | `audit` module (`PersistentAuditPort` + `AdminAuditController`) | ✅ | ✅ |
| Angular: admin audit-trail view (paginated + action filter) | (none) | `features/admin/audit` → `/api/v1/admin/audit-logs` | ✅ | ✅ |
| Website content (settings/banner/testimonials/pricing/FAQ, en/hi) | `website*` | `website` module + Thymeleaf | ⬜ | ⬜ |
| Public website home SSR (SEO meta/OG/JSON-LD) | `public/website` static | `WebsiteController` + Thymeleaf | 🟡 (home+blog; about/services pending) | 🟡 (unit + Docker-gated E2E) |
| Blog SSR (server-rendered, indexable, 301 redirects) | static `.html` gen | `WebsiteController` + `BlogService` | ✅ | ✅ |
| Blog public JSON API | `getBlogs`/`getBlog` | `PublicBlogController` | ✅ | ✅ |
| Sitemap.xml + robots.txt | (static) | `SeoController` | ✅ | 🟡 |
| HTML sanitisation (blog/rich content) | `sanitize-html` | `HtmlSanitizer` (jsoup) | ✅ | ✅ |
| Site settings (server-controlled, cached) | `websiteContentService` | `SiteSettingsService` (Caffeine) | 🟡 | ⬜ |
| Blog authoring/publish + comments + taxonomy admin | `blogController` + helper | `blog` module (admin) | ⬜ | ⬜ |
| Public contact form (validation, header-injection defence, API-key gate) | `submitPublicLead` | `contact.PublicContactController` | ✅ | ✅ |
| Portal support threads (client/mediator, scoped) | `portal/support/*` | `contact.PortalSupportController` | ✅ | ✅ |
| Admin contact reply (+ customer email) | `postAdminReply`/`getThread` | `contact.AdminContactController` | ✅ | ✅ |
| Admin contact inbox list + read states | `listInbox`/`markInboxRead` | `contact` (admin) | ⬜ | ⬜ |
| Video reels | `videoReelController` | `mediator` feature | ⬜ | ⬜ |
| Mediator tools (court case, e-courts, legal feeds) | `mediatorTools/*` | `mediator` module | ⬜ | ⬜ |
| Mediator offboarding / 360 | `mediatorAdminController` | `administration` module | ⬜ | ⬜ |
| Google Calendar connect | `helper` google | `mediation`/integration | ⬜ | ⬜ |
| Angular app (web) | Vue 2 SPA | Angular standalone | 🟡 | ⬜ |
| Mobile packaging (Ionic/Capacitor-ready) | Capacitor on Vue | Angular + platform services | ⬜ | ⬜ |

### Dropped (dead code, not migrated)
- `src/views/_unused/*`, `src/views/_unused-sofbox-demos/*` ➖
- Filesystem static-blog generation (`writeStaticBlogPage`) — replaced by SSR ➖
- `"fs"` npm junk dependency ➖ (never reproduced)
