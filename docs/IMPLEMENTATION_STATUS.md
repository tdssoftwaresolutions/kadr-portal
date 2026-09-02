# Implementation Status — App Review Remediation

**Last updated:** July 14, 2026

This document tracks implementation of items from [APP_REVIEW.md](./APP_REVIEW.md).

## Completed

### Security (Phase 0–1)
- [x] Helmet security headers (`middleware/securityMiddleware.js`)
- [x] Global + auth/OTP/signup/signature rate limiting (`middleware/rateLimitMiddleware.js`)
- [x] Role middleware: `requireAdmin`, `requireMediator`, `requireRole` (`middleware/requireRole.js`)
- [x] Case access service + IDOR fixes for cases, notes, payments, calendar events
- [x] Removed public `/api/test` debug endpoint
- [x] Admin-only: `newCase`, `assignMediator`, mediator lists, `getGoogleToken` (returns connected status only)
- [x] Fake Pro payment gated behind `ALLOW_FAKE_PAYMENTS=1` (non-production only)
- [x] Refresh token re-validates user active/not-deleted
- [x] OTP password reset scoped by type + min 8 char password
- [x] Strict admin permissions via `KADR_STRICT_ADMIN_PERMISSIONS=1` (default)
- [x] File upload validation: MIME allowlist, size limits, env-based S3 bucket (`utils/uploadService.js`)
- [x] Blog HTML sanitization on save (`utils/htmlSanitizer.js`)
- [x] Startup env validation (`config/envValidation.js`)
- [x] Reduced request body limit (4mb default)
- [x] `.env.mobile` added to `.gitignore`

### API structure
- [x] Routes split into modules: `routes/modules/{auth,public,user,case,mediator,finance,admin}Routes.js`
- [x] Extracted `controller/noteController.js`, `controller/calendarController.js`
- [x] Pagination on calendar events and invoice lists
- [x] DB index on `events.start_datetime` (schema — run `prisma db push` to apply)

### Performance
- [x] Puppeteer browser pool for PDF generation
- [x] HTTP compression middleware
- [x] `/health` and `/health/ready` (DB check)
- [x] Vue route-level code splitting (lazy imports by chunk)

### Frontend UX
- [x] Sign In button visible; email label; accessible password toggle
- [x] Calendar legend color fix
- [x] Auth layout professional copy (replaced Lorem ipsum)
- [x] Error page copy + working home link
- [x] Support contact constants updated
- [x] Alert component: text-only (no v-html XSS); `error` type maps to `danger`
- [x] Design tokens (`src/theme/tokens.css`)
- [x] Shared workspace SCSS (`src/assets/scss/_workspace.scss`) + theme README
- [x] Kadr presentation primitives (EmptyState, PageHeader, DashboardHero, FormField, SectionCard, CaseWorkspaceLayout, PageLoader)
- [x] Centralized messages (`src/constants/messages.js`)
- [x] Copyright year dynamic
- [x] Memory leak fix: `DashboardMediator.vue` keydown listener
- [x] Route alias: `client-calendar` (+ redirect from `calendar2`)
- [x] Client accept mediation action calls `acceptMediationRequest` (not notice payment)

### DevOps
- [x] `Dockerfile` + `docker-compose.yml` (Docker-first workflow)
- [x] `docker-compose.prod.yml` for EC2 (MySQL not exposed on host)
- [x] Docker entrypoint with automatic `prisma db push`
- [x] Production static serving for `/admin` SPA and marketing website
- [x] `.env.docker.example` for container configuration
- [x] Master admin bootstrap script (`scripts/createMasterAdmin.js`)
- [x] HTTP/HTTPS-aware auth cookies for local Docker and production TLS
- [x] [GET_STARTED.md](./GET_STARTED.md) — local, ngrok, and AWS EC2 setup guide
- [x] GitHub Actions CI (lint, test, build)
- [x] Node test scaffold (`npm test`)

## Phase 2 (completed — no Redis)

- [x] DB-backed scheduler locks (`scheduler_locks` table) for multi-instance cron safety
- [x] Structured request logging middleware (`X-Request-Id`)
- [x] Admin inbox N+1 reduction (batch last-message fetch)
- [x] Multi-gateway payments: **PayU**, **Cashfree**, **PhonePe** (env-switchable)
- [x] End-to-end checkout UI (`PaymentCheckout.vue`) + return page
- [x] `payment_orders` table + fulfillment service
- [x] See [PAYMENTS.md](./PAYMENTS.md) for credentials and testing

## Payment gateway (env-controlled)

```bash
PAYMENT_GATEWAY=payu      # or cashfree | phonepe
```

Copy credentials from `.env.payment.example` into your `.env`, then run `npx prisma db push`.

## Remaining / Next Steps

### Requires your input
- **Payment credentials:** Add test keys for PayU, Cashfree, and PhonePe in `.env` (see `.env.payment.example`)
- **Support phone:** Update `src/constants/kadrSupportContact.js` with your real number
- **S3 bucket:** Set `S3_BUCKET_NAME` in production and ensure bucket is private (use presigned URLs)
- **Payment webhook signatures:** Implement Cashfree and PhonePe webhook signature verification before accepting live payments

### Recommended follow-up (Phase 3+)
- [x] ~~Split `src/store/index.js` into domain modules~~ (already done: auth, cases, admin, payment, etc.)
- [ ] Split `controller/generalController.js` further (dashboard, users)
- [x] Field-level form validation (Zod) on signup/auth flows (`utils/validationSchemas.js`)
- [x] SSE for case correspondence real-time updates (`services/sse/sseManager.js`, `routes/modules/sseRoutes.js`)
- [x] Critical error alerting via email (`services/alerting/criticalAlertService.js`)
- [x] Admin audit logging (`services/audit/auditLogService.js`)
- [x] CSRF protection (`middleware/csrfMiddleware.js`)
- [x] Content Security Policy enabled (`middleware/securityMiddleware.js`)
- [x] HTTPS redirect in production (`middleware/httpsRedirectMiddleware.js`)
- [x] Agreement terms HTML sanitization (XSS fix)
- [x] Graceful shutdown (SIGTERM/SIGINT handling)
- [x] JWT secret strength validation in production
- [x] S3 presigned URL utility (`utils/uploadService.js`)
- [x] i18n Hindi/English for admin portal (`src/i18n/`)
- [ ] Sentry integration (deferred — using email alerts for now)
- [ ] Cashfree/PhonePe webhook signature verification (pending gateway credentials)
- [ ] Migrate FCM push to v1 API (when mobile app is ready)
- [ ] Full E2E test suite
- [ ] Redis/BullMQ (when infrastructure available) for job queue

## Deploy checklist (Docker)

See **[GET_STARTED.md](./GET_STARTED.md)** for full instructions. Summary:

1. Generate production secrets: `node scripts/generateSecrets.js` and copy into `.env`
2. Copy `.env.docker.example` to `.env` and set production secrets (`SECRET_KEY`, `REFRESH_SECRET_KEY`, `SIGN_SECRET_KEY` — must be unique, 32+ chars)
3. Set `BASE_URL`, `PORTAL_APP_URL`, and `COOKIE_SECURE=1` for HTTPS deployments
4. Add payment credentials from `.env.payment.example` if using live checkout
5. Set `S3_BUCKET_NAME` and AWS keys for production uploads (ensure bucket is private)
6. Set `WEBSITE_CONTACT_API_KEY` for the public contact form
7. Set `ALERT_TECH_TEAM_EMAILS` for critical error notifications
8. Set `EMAIL_SMTP_HOST`, `EMAIL_USER`, `EMAIL_PASSWORD` for emails (required for password reset)
9. Run `docker compose up --build -d`
10. Create master admin: `docker compose exec api node scripts/createMasterAdmin.js admin@domain.com 'Password123'`
11. Verify: `GET /health/ready` returns `{ "status": "ready", "database": "ok" }`
12. Open `/admin/` for the portal and `/` for the marketing site

## Deploy checklist (manual / legacy)

1. Set all required env vars (see `config/envValidation.js`)
2. Run `npx prisma db push` or migrate for new index
3. Set `KADR_STRICT_ADMIN_PERMISSIONS=1`, `ALLOW_FAKE_PAYMENTS=0`
4. Assign explicit `admin_permissions` to all admin users
5. Set `WEBSITE_CONTACT_API_KEY` for public contact form
6. Build: `npm run build` → deploy API + `dist/`
7. Set `SERVE_ADMIN_STATIC=1` and `SERVE_WEBSITE_STATIC=1` on the Node process
8. Verify: `GET /health/ready` returns `{ status: "ready" }`
