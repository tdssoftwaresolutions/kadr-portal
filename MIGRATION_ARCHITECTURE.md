# MIGRATION_ARCHITECTURE.md

Enterprise migration of the **Kadr Portal** online mediation platform from
**Node.js (Express) + Vue 2 + Prisma/MySQL** to a **Spring Boot (Java 21) modular
monolith + Angular + Thymeleaf + MySQL (Flyway)** architecture.

> This document is produced from a full audit of the existing repository. The
> legacy application is **kept intact** as the behavioural reference during
> migration. Nothing legacy is deleted until functional parity is demonstrated.

---

## 1. Current architecture (as-is)

**Single Node process** (`server.js` → `lib/serverApp.js`) that simultaneously serves:

| Concern | How it is served today |
|---|---|
| REST API | Express router mounted at `/api` (`routes/apiRoutes.js`) |
| Authenticated SPA | Vue 2 build in `dist/`, served as static at `/admin` |
| Public marketing website | Static HTML in `public/website`, served at `/` |
| SEO blog pages | **Pre-generated static `.html` files** written to `public/website/blog/<slug>.html` (`utils/helper.js#writeStaticBlogPage`) |
| Real-time | Server-Sent Events at `/api/sse/events` (`services/sse/sseManager.js`) |
| Scheduled jobs | `node-cron` (`services/scheduler/*`) with DB-based locking (`scheduler_locks`) |

The same codebase is also packaged as an **Electron desktop app** and a
**Capacitor mobile app** (Android/iOS) that bundle the Vue build and talk to the
remote API.

### Middleware pipeline (order matters — preserved in target)
`httpsRedirect → helmet/security → compression → requestLogger → CORS →
global rate limit → json/urlencoded (4mb) → cookieParser → CSRF verify →
CSRF cookie set → blogRedirect → /api routes → static → SPA fallback → errorHandler`

---

## 2. Current dependencies (notable)

- **Express 4**, **Prisma 5** (`@prisma/client`), **mysql** driver
- **jsonwebtoken**, **bcryptjs**, **google-auth-library**, **googleapis** (OAuth + Calendar)
- **@aws-sdk/client-s3** + **s3-request-presigner** (document storage)
- **nodemailer** (email), **helmet**, **express-rate-limit**, **cookie-parser**, **compression**
- **sanitize-html**, **striptags**, **cheerio** (blog HTML handling)
- **puppeteer** (invoice/agreement PDF generation)
- **node-cron** (schedulers), **zod** (request validation), **uuid**
- Payment gateway HTTP integrations: **PayU**, **Cashfree**, **PhonePe** (no SDK — signed HTTP + webhooks)
- Frontend: **Vue 2.6**, **vue-router 3**, **vuex 3**, **bootstrap-vue**, **axios**,
  FullCalendar, flatpickr, signature_pad, TinyMCE, i18n (en/hi)
- Mobile/desktop: **@capacitor/\*** (camera, filesystem, push, preferences,
  network, secure-storage), **electron**, **electron-builder**

---

## 3. Current frontend architecture (Vue 2)

- `src/main.js` bootstraps Vue + router + Vuex + BootstrapVue + i18n (en/hi).
- **Router** (`src/router/index.js`): history mode, base `/admin/`. Layout shells
  (`StandardLayout`, `AuthLayout`, `BlankLayout`) with lazy-loaded views.
  Role is resolved at runtime; a single dashboard route renders role-specific
  dashboards (`DashboardAdmin`/`DashboardMediator`/`DashboardClient`).
- **State**: Vuex store (`src/store`) + endpoint map (`store/endpoints.js`),
  axios client with token handling (`utils/apiClient.js`, `utils/tokenStorage.js`),
  SSE client (`utils/sseClient.js`).
- **Platform abstractions already exist**: `utils/platform.js`, `utils/mobileMedia.js`,
  `utils/mobileDownloads.js`, `utils/offlinePages.js`, `plugins/capacitor.js`
  — these map cleanly onto the target platform-service abstraction.

### View inventory (by role)
- **Auth**: SignIn, SignUp, RecoverPassword
- **Standard/shared**: Dashboard (role dispatch), PastMediations, PortalSupport,
  PaymentReturn, ProfileEdit
- **Admin**: Users list, Cases management, Correspondence inbox, Admin management,
  Settings, Notifications, Website content, Calendar, Blog taxonomy, Reward orders,
  Reward catalog, Mediator 360, Google account management, Inactive users
- **Mediator**: Dashboard, MyCases, Invoices, Rewards (view+panel), Calendar,
  MyVideoReels, private invoices (folded into invoices)
- **Client**: Dashboard, ClientCases, Calendar, Signature, AgreementSignature
- **Blog**: MyBlogs
- **Pages**: Error, ComingSoon, Maintenance, BlankPage
- `_unused/` and `_unused-sofbox-demos/` are dead code (excluded from migration).

---

## 4. Current backend architecture (Express)

Controllers (`controller/*.js`) are thin-ish HTTP handlers that call Prisma
directly and/or delegate to `services/*` and the large `utils/helper.js`
(≈1900 lines — a "god" helper that is a key refactor target).

### Route modules → domains
| Route module | Mount | Domain(s) |
|---|---|---|
| `authRoutes` | `/api` | login, google-login, refresh, logout, OTP, password reset, email-exists, Google connect/callback |
| `publicRoutes` | `/api` | signup (client/mediator), public website lead, signature flows, public blogs, public mediator profile, video reels, languages |
| `userRoutes` | `/api` (auth) | user data, dashboard, profile update, delete account, push register, portal support threads |
| `caseRoutes` | `/api` (auth) | mediation data, new/initiate case, approve type, accept request, client payment, assign mediator, active cases, correspondence, calendar events, notes |
| `mediatorRoutes` | `/api` (auth) | rewards, legal feeds, court-case trackers, subscription, private invoices, income, bank account, my blogs, blog comments, video reels |
| `financeRoutes` | `/api` (auth) | invoices list + PDF |
| `paymentRoutes` | `/api/payment` | config, amounts, initiate, verify, PayU return, Cashfree/PhonePe webhooks |
| `adminRoutes` | `/api` (auth) | users admin, settings, transactions, invoices sync/mark-paid, rewards admin, mediator offboarding/360, premium features, correspondence inbox, website-contact inbox, notifications admin, website content, blog taxonomy |
| `sseRoutes` | `/api` (auth) | SSE event stream |

### Service domains (`services/`)
alerting, audit, case (milestones/progress/client), email (+providers),
invoice (+mediator income, private invoices), mediator (offboarding),
mediatorTools (court case, ecourts CNR, ecourts India partner, legal feed),
meeting (invitations), notification (template engine, trigger rule engine,
channels, prisma middleware, code triggers), payment (config, constants,
fulfillment, gateway factory + adapters, order service), push, reward
(fulfillment engine + flow compiler), scheduler (daily reminder, subscription
expiry, lock), security (case access), sse, subscription (entitlement + service),
website (content + static generator).

---

## 5. Current database (MySQL via Prisma)

~50 tables. Full inventory and target JPA/Flyway mapping in **DATABASE_MIGRATION.md**.
Key groups:

- **Identity**: `user` (single table, `user_type` enum ADMIN/MEDIATOR/CLIENT,
  `admin_permissions` JSON, referral graph, subscription tier), `otp_resets`,
  `google_connect`, `user_push_devices`.
- **Cases/mediation**: `cases`, `case_statuses`, `case_sub_statuses`,
  `case_events`, `case_history`, `caseIdTracker`, `case_assignment_state`,
  `events` (calendar), `case_agreement_tracking`, `signature_tracking`,
  `case_messages`, `case_message_attachments`.
- **Payments/finance**: `payment_orders`, `transactions`, `mediator_invoices`,
  `mediator_invoice_settings`, `mediator_private_invoices`(+lines),
  `mediator_bank_accounts`, `admin_settings`.
- **Subscriptions/rewards**: `mediator_subscriptions`, `subscription_tier` enum,
  `premium_feature_catalog`, `reward_catalog_items`, `reward_fulfillment_rules`,
  `reward_redemption_orders`, `mediator_reward_transactions`.
- **Notifications**: `notification_templates`, `notification_channel_settings`,
  `notification_trigger_rules`, `notification_send_logs`, `notifications`.
- **Website/blog/contact**: `website_settings`, `website_banner`,
  `website_testimonials`, `website_pricing_plans`(+features),
  `website_faq_categories`(+items), `blogs`, `blog_categories`, `blog_tags`,
  `categories`, `tags`, `blog_comments`, `redirect_blogs`,
  `website_contact_threads`, `website_contact_messages`, `admin_inbox_read_states`,
  `available_languages`, `MediatorVideoReel`.
- **Mediator tools/ops**: `mediator_court_case_trackers`,
  `mediator_offboarding_events`, `scheduler_locks`.

IDs are mostly `CHAR(36)` UUID strings (application-generated). This must be
preserved on migration to keep existing data/relationships valid.

---

## 6. Current authentication

- **Password login** (`authController.login`): looks up by `email` (+ optional
  `user_type`), BCrypt-compares against `password_hash`. Supports the same email
  existing as multiple user types (asks user to disambiguate).
- **Google login** (`google-login`): verifies Google ID token, matches by email.
- **Tokens**: short-lived **access JWT** (Bearer) + **refresh JWT**. Web refresh
  token stored in an **HttpOnly cookie**; mobile clients get the refresh token in
  the response body (detected via `isMobileClientRequest`). Refresh endpoint
  re-issues access tokens after re-checking the DB user is active/not deleted.
- **OTP**: signature OTP over **SMS**; password-reset OTP over **email**
  (`otp_resets` table, 10-min expiry).
- **Google Calendar connect**: separate OAuth code flow storing tokens in
  `google_connect`.
- Hashing: **BCrypt** (`bcryptjs`). No MFA. No external IdP.

---

## 7. Current authorization

- `authMiddleware` verifies the access token and loads `req.user`.
- `requireRole` provides `requireAdmin` / `requireMediator` / `requireClient`,
  applied **per route** (deliberately not blanket, to allow route fall-through).
- Admin sub-permissions via `user.admin_permissions` (JSON) +
  `src/constants/adminPermissionCatalog.js` / `src/utils/adminNavPermissions.js`.
- **Resource-level checks** exist for cases (`services/security/caseAccessService.js`)
  and are enforced in controllers (e.g. mediator can only see own cases; parties
  only their own cases; document/signature access gated).

---

## 8. Current payment integration

- Multi-gateway via **factory + adapters** (`services/payment/paymentGatewayFactory.js`,
  `services/payment/adapters/`): **PayU**, **Cashfree**, **PhonePe**.
- Flow: `/api/payment/initiate` creates a `payment_orders` row (status `PENDING`),
  returns gateway params. Confirmation via **webhook** (Cashfree, PhonePe) or
  **return URL** (PayU). `paymentFulfillmentService` verifies signature/status,
  flips order status, and fulfils (case payment / subscription / reward).
- `purpose` field distinguishes case payment vs subscription vs other.
- Amounts/config exposed via `/api/payment/config` + `/api/payment/amounts`.
- `transactions` records case payments; `payment_orders` is the gateway ledger.

---

## 9. Current document management

- Uploads go to **AWS S3** (`utils/uploadService.js`, `@aws-sdk/client-s3`),
  base64 payloads uploaded server-side; presigner available.
- MySQL stores metadata/URLs (e.g. `evidence_document_url`,
  `case_message_attachments.s3_url`, profile/certificate URLs, invoice logos).
- Signatures stored as data URLs in `case_agreement_tracking` /
  `signature_tracking`.
- Some large content is served through the app; presigned URLs are the target
  direction for large download/upload.

---

## 10. Current website / blog architecture

- Public site is **static HTML** in `public/website`, with server-controlled
  values seeded/updated from DB (`website_settings`, `website_banner`,
  `website_testimonials`, `website_pricing_plans`, `website_faq_*`) via
  `services/website/websiteContentService.js` and regenerated by
  `websiteStaticGenerator.js`.
- **Blogs** are authored in the admin/mediator SPA and **rendered to static
  `.html` files** at publish time (`helper.writeStaticBlogPage`) using
  `blog.sample` as the template. URLs are slug-based (`blog/<slug>`), with
  `redirect_blogs` maintaining 301s when slugs change
  (`middleware/blogRedirectMiddleware.js`).
- Bilingual (English/Hindi) content is first-class (`*_en` / `*_hi` columns).

---

## 11. Identified technical debt

1. **`utils/helper.js` god-object** (~1900 lines) mixing auth, blog, cases, S3,
   email, PDF — must be decomposed into domain services.
2. **Controllers call Prisma directly** in many places (no consistent
   service/DTO boundary) → entity/API coupling and mass-assignment risk.
3. **Static-file blog generation** couples publishing to the filesystem — not
   container-safe (violates guide §30). Target: DB-backed, server-rendered.
4. **`fs` dependency in package.json** (`"fs": "^0.0.1-security"`) is a
   well-known junk package — must not be reproduced.
5. **Mixed responsibilities** in `serverApp.js` (API + SPA + website in one).
6. **No schema versioning** (Prisma `db push`, not migrations) — target Flyway.
7. Dead code: `src/views/_unused*`.

---

## 12. Security concerns (to address, not reproduce)

- **BOLA/IDOR**: enforce resource-level authorization on every case/document/
  payment/invoice endpoint server-side (guide §13/§14). Some legacy endpoints
  rely on role-only checks.
- **Refresh token in cookie**: keep HttpOnly + Secure + SameSite; verify CSRF
  strategy carries over (legacy uses a CSRF cookie/verify pair).
- **Payment trust**: never trust client "success"; always verify via
  webhook/return + signature (legacy already does — preserve).
- **Secrets**: `.env` present in repo tree — ensure secrets come from env/secrets
  manager, never committed. Payment/SMTP/AWS/Google secrets externalised.
- **HTML content** (blogs, correspondence): sanitize server-side (legacy uses
  `sanitize-html` — preserve; Angular must not `innerHTML` untrusted content).
- **File uploads**: enforce type allow-list, size limits, filename sanitisation,
  private S3, short-lived presigned URLs.
- **Password hashing**: BCrypt today; target BCrypt (Spring Security default,
  strength ≥ 10) or Argon2id — **must remain verify-compatible with existing
  BCrypt hashes** so current users can still log in (see DECISIONS).

---

## 13. Target architecture

**One Spring Boot application** (modular monolith) that serves:
1. `/api/v1/**` — REST API (Angular web + future Ionic/Capacitor mobile).
2. `/` public website + `/blog/**` — **Thymeleaf server-side rendering** (SEO).
3. `/admin/**` — packaged **Angular** production build (static, SPA fallback).

Real-time via Spring MVC SSE. Scheduling via Spring `@Scheduled` + DB lock
(reuse `scheduler_locks`). No Redis. No microservices. Stateless app instances
(JWT), documents in S3, MySQL as source of truth.

```
AWS EC2 → Docker → ONE Spring Boot app  ──►  MySQL
                         │                    S3
                         ├─ /api/v1 (REST, Angular + mobile)
                         ├─ / , /blog (Thymeleaf SSR, SEO)
                         └─ /admin (Angular static build)
```

---

## 14. Target technology stack

- **Java 21 LTS**, **Spring Boot 3.3.x**, Spring MVC, Spring Security,
  Spring Data JPA / Hibernate, Jakarta Bean Validation, **Maven** (wrapper),
  **Flyway**, **Thymeleaf**, JUnit 5, Mockito, Spring Boot Test, **Testcontainers**,
  springdoc **OpenAPI**, Spring Boot Actuator, Caffeine (Spring Cache).
- **Angular (standalone components, Signals, RxJS, Router, HttpClient, reactive
  forms)**, TypeScript, Angular Material. OpenAPI-generated TS client.
- **AWS SDK v2 for Java** (S3 + presigner). **Spring Mail** (SMTP). Google
  API client (Java) for Calendar/ID-token verification.
- **Playwright** for E2E.

---

## 15. Old → new component mapping (summary)

| Legacy | Target |
|---|---|
| `server.js` / `lib/serverApp.js` | `PlatformApplication` + Spring config (security, web, static, SSE) |
| `controller/*.js` | `*/controller/*Controller.java` per domain, thin, DTO in/out |
| `services/*` | `*/service/*Service.java` per domain (transaction boundaries) |
| `utils/helper.js` | decomposed into domain services + `common` utilities |
| Prisma models | JPA `@Entity` per table + Flyway `V1__baseline.sql` |
| `middleware/*` | Spring Security filters, `@ControllerAdvice`, interceptors, filters |
| `routes/modules/*` | Spring `@RequestMapping` under `/api/v1/**` |
| Vue `src/` | Angular `Kadr on Java/frontend` (`core/`, `shared/`, `features/`, `platform/`) |
| `public/website` + static blogs | Thymeleaf templates + DB-backed blog rendering |
| Capacitor utils | Angular `platform/browser` + `platform/mobile` services |

Full per-endpoint mapping in **API_MIGRATION.md**; per-table in **DATABASE_MIGRATION.md**;
per-feature status in **MIGRATION_STATUS.md**.

---

## 16. Database migration strategy

- Introspect the **live** MySQL schema (or the Prisma schema as the contract) and
  author a **Flyway `V1__baseline.sql`** that matches the existing tables exactly
  (same names, columns, types, PKs, FKs, indexes) so **existing production data is
  preserved** and Flyway can `baseline` an existing DB.
- All subsequent changes are additive, reversible-where-practical Flyway scripts
  (`V2__...`, `V3__...`). Never drop production tables/columns silently.
- Preserve `CHAR(36)` UUID string IDs (app-generated) — JPA `@Id String` with
  application-assigned UUIDs; do **not** switch to auto-increment.

---

## 17. API migration strategy

- Re-expose all business endpoints under **`/api/v1`** with domain-oriented paths.
- Preserve request/response semantics required by the (initially unchanged) Vue
  client during transition; the new Angular client consumes the same v1 contract.
- Where legacy used action-style names (`/getUserData`, `/getMediationData`),
  provide clean REST equivalents **and** document compatibility (temporary
  aliases if the old SPA must keep running against the new backend).
- OpenAPI is the source of truth; generate the Angular TS client.

---

## 18. Deployment strategy

- Multi-stage Docker: (1) Angular build, (2) Maven build (fat jar with Angular
  static + Thymeleaf), (3) minimal JRE 21 runtime, non-root user. One artifact.
- EC2 + Docker; env-driven config; Actuator health/readiness for orchestration.
- Details in **DEPLOYMENT.md**.

---

## 19. Testing strategy

- Backend: unit (services), slice tests (`@WebMvcTest`, `@DataJpaTest`),
  security/authorization tests, payment webhook tests, document authorization
  tests, Testcontainers MySQL integration tests.
- Frontend: Angular unit/component tests for auth, routing, forms, role-based UI.
- E2E: Playwright for login, case creation, payment, document, signature flows.
- Quality bar per guide §59 — parity, not just "compiles".

---

## 20. Rollback strategy

- Legacy Node/Vue app stays deployable throughout (guide §56). Blue/green or
  path-based cutover per domain. Flyway `baseline` + additive migrations mean the
  DB stays compatible with the legacy app during transition. Documented in
  **DEPLOYMENT.md**.

---

## 21. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Big-bang rewrite failure | Incremental, domain-by-domain vertical slices; green build each milestone |
| BCrypt hash compatibility | Use Spring Security `BCryptPasswordEncoder` (verifies existing hashes) |
| Payment regressions | Preserve webhook/return verification; idempotent fulfilment; contract tests |
| SEO regressions on blog URLs | Preserve slugs + `redirect_blogs` 301s in Thymeleaf routing |
| Data loss | Flyway baseline of exact schema; additive-only changes; backups before cutover |
| Multi-type email accounts | Preserve `(email, user_type)` uniqueness + disambiguation flow |
| Local JDK is 17, target is 21 | JDK 21 provisioned for builds; POM targets 21 (see MIGRATION_DECISIONS.md) |
```
