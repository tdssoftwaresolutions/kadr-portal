# MIGRATION_DECISIONS.md

Architectural decisions and recorded uncertainties for the Kadr Portal migration.
Where the safest backward-compatible option exists, it is chosen (guide §57).

---

## D1 — Java version (21 LTS)
**Decision:** Target **Java 21 LTS** with Spring Boot 3.3.x (guide §4).
**Context:** Only JDK 17 is installed on the current machine; JDK 21 was
provisioned (Homebrew `openjdk@21`) so the build is genuinely verifiable.
Builds set `JAVA_HOME=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home`.
Production Docker image uses an eclipse-temurin 21 base.

## D2 — Build tool: Maven Wrapper
**Decision:** Use the **Maven Wrapper** (`mvnw`) committed to the repo so no
global Maven install is required (none exists locally).

## D3 — Password hashing compatibility (BCrypt)
**Decision:** Use Spring Security **`BCryptPasswordEncoder`**.
**Reason:** The legacy system stores **bcrypt** hashes (`bcryptjs`) in
`user.password_hash`. Spring's `BCryptPasswordEncoder` verifies existing hashes
unchanged, so **all current users can log in without a reset**. Argon2id (guide
§12) is preferred *in principle* but would break existing logins; we therefore
keep BCrypt for verification and MAY upgrade-on-login later (documented uncertainty).

## D4 — Single `user` table + `user_type` enum
**Decision:** Keep the single-table user model with `user_type`
(ADMIN/MEDIATOR/CLIENT) and the composite unique `(email, user_type)`.
**Reason:** The legacy system deliberately allows the same email to exist as
different user types and disambiguates at login. Splitting tables would break
data and this business rule.

## D5 — Application-assigned CHAR(36) UUID IDs
**Decision:** Preserve `CHAR(36)` string UUID primary keys, assigned by the
application (as Prisma `@default(uuid())` did). JPA entities use
`@Id String id` populated in `@PrePersist` when absent.
**Reason:** Preserves existing IDs, foreign keys, external references
(payment refs, blog URLs, email links). No switch to numeric auto-increment.

## D6 — Flyway baseline of the existing schema
**Decision:** `V1__baseline.sql` reproduces the **existing** MySQL schema exactly
(table/column names, types, FKs, indexes as defined by the current Prisma schema).
Flyway is configured with `baseline-on-migrate` so it can adopt an existing
production database without recreating it. All further changes are additive
Flyway scripts.
**Reason:** Guide §10/§41 — never silently recreate/drop production data.

## D7 — Public website & blogs: Thymeleaf SSR (replace static-file generation)
**Decision:** Serve the public website and blog pages via **Thymeleaf**,
reading content from the existing DB tables (`website_*`, `blogs`, taxonomy).
Retire the filesystem `.html` generation (`writeStaticBlogPage`).
**Reason:** Filesystem generation is not container-safe (guide §30) and couples
publishing to disk. SSR keeps SEO (full HTML, meta/OG/JSON-LD, sitemap, 301s via
`redirect_blogs`). Slugs and redirects are preserved for backward-compatible URLs
(guide §51).

## D8 — One deployable artifact
**Decision:** Angular production build + Thymeleaf templates + REST API are all
packaged into **one Spring Boot jar / one Docker image** (guide §8/§45).
Angular served under `/admin`, website at `/`, API at `/api/v1`.

## D9 — No Redis; Caffeine + Spring Cache
**Decision:** Use **Caffeine** in-memory caching behind Spring Cache abstraction
only for safe, non-authoritative data (e.g. website settings, notification rule
cache — mirroring legacy `notificationRuleCache`). No Redis (guide §2/§29).
Cached items and rationale documented at each cache site.

## D10 — Scheduling: Spring @Scheduled + DB lock
**Decision:** Reuse the `scheduler_locks` table with Spring `@Scheduled` jobs so
scheduling is safe across multiple instances without Redis (guide §28).

## D11 — SSE retained (no WebSocket/Kafka)
**Decision:** Keep **Server-Sent Events** for real-time (Spring MVC
`SseEmitter`), matching the existing client contract. No message broker.

## D12 — DTO boundary everywhere
**Decision:** Controllers accept **Request DTOs** and return **Response DTOs**;
JPA entities are never serialized directly (guide §17). Mapping in the service layer.

## D13 — Payments: preserve multi-gateway + verification
**Decision:** Reimplement the **factory + adapter** design for PayU / Cashfree /
PhonePe, preserving webhook/return verification, idempotent fulfilment, and the
`payment_orders` state machine (guide §19). No card data stored.

## D14 — Mobile abstraction boundaries
**Decision:** Angular exposes `FileService`, `NotificationService`,
`StorageService`, `CameraService`, etc. with web implementations now and
Capacitor implementations later (guide §6/§54). No Capacitor code in business
components.

## D15 — API versioning `/api/v1`
**Decision:** All endpoints under `/api/v1`. Legacy action-style endpoints are
mapped to REST equivalents; temporary compatibility aliases are documented in
API_MIGRATION.md if the legacy Vue client must run against the new backend during
transition.

---

## Recorded uncertainties (safest choice taken, revisit with stakeholders)

- **U1 — CSRF strategy:** Legacy uses a CSRF cookie/verify pair *plus* Bearer
  tokens. For a token-authenticated API, CSRF risk is limited to the cookie-based
  refresh flow. Safest choice: keep refresh in HttpOnly+SameSite cookie and apply
  CSRF protection to the refresh/logout cookie endpoints only. To confirm.
- **U2 — Argon2 upgrade-on-login:** Whether to transparently rehash to Argon2id
  on successful login. Safe default: keep BCrypt; no silent change. To confirm.
- **U3 — Exact PayU/Cashfree/PhonePe field contracts:** Reproduce from legacy
  adapters byte-for-byte; verify against gateway docs/sandbox before cutover.
- **U4 — Google Calendar token storage** (`google_connect`): single-row token
  store retained as-is initially; revisit for per-admin tokens.
- **U5 — SMS provider for OTP:** legacy `sendOtpSMS` provider to be confirmed and
  externalised via `NotificationService`/config.
- **U6 — Correspondence PII stripping:** an older comment in the legacy controller
  claims emails/phones are removed from messages, but the current
  `caseCorrespondenceSanitizer` only collapses whitespace and always sets
  `hadPiiRemoved=false`. Preserved current (contact-details-allowed) behaviour for
  parity; `had_pii_removed` is retained on the entity. Revisit if a compliance
  requirement to strip PII is confirmed.

## D16 — Cross-domain ports (files, meetings, notifications, audit)
**Decision:** Where the cases/calendar/correspondence domains need capabilities
owned by not-yet-migrated domains, they depend on **ports** in this repo:
`FileStoragePort` (documents/S3), `MeetingProviderPort` (Zoom/Google),
`CaseNotificationPort` (notifications/email), `AuditPort` (audit). Each has a
safe default (unavailable/no-op/logging) so the build stays green and behaviour
is honest until the real implementation is wired in. This keeps domain
boundaries clean (guide §9) and avoids coupling business logic to infrastructure.

## D24 — Schema authority: Flyway owns it; JPA `ddl-auto=none` (not `validate`)
**Decision (corrected during a runtime smoke test):** Flyway is the single
source of truth for the schema (it baselines the real production DB). Hibernate
is set to **`ddl-auto=none`** rather than `validate`.
**Why:** A full-app smoke test (Spring Boot jar against a real MySQL) revealed
that Hibernate's schema `validate` raises **false-positive failures** on
functionally-correct legacy column types — MySQL `CHAR(36)` vs the `VARCHAR(36)`
Hibernate infers for `String` ids, and MySQL `ENUM(...)` columns (e.g.
`case_messages.channel`) vs `VARCHAR`. These would have blocked application
startup against the real schema. This is exactly the class of bug that only
surfaces at runtime, which is why the smoke test was run.
**Also fixed:** entity id/FK columns backed by `CHAR(36)` now declare
`columnDefinition = "char(36)"` (and the two genuine `VARCHAR(36)` columns —
`case_events.id`, `case_history.case_event_id` — declare `varchar(36)`), so the
mappings are precise. Drift detection remains available via `JPA_DDL_AUTO=validate`
against a fresh (Flyway-built) schema in development.

## D23 — Notifications engine + cross-domain email delivery
**Decision:** A central `NotificationService` resolves templates by
`(templateKey, channel)`, renders `{var}` placeholders (`TemplateRenderer`),
dispatches via a per-channel `ChannelSender`, and records a send log (no bodies
logged, guide §27). **Email** is real (Spring Mail/SMTP, replacing nodemailer);
SMS/WhatsApp/Push are stub senders behind the same interface (provider seams).
Default email templates are seeded via Flyway **V2** (idempotent `INSERT IGNORE`).
The previously-stubbed cross-domain notification ports (case assignment,
e-signature links, signed-agreement notices, contact form) are now backed by
`@Primary` email adapters, so real email is sent while the logging fallbacks
remain for environments without the notifications module. `@Primary` (not
bean-name `@ConditionalOnMissingBean`) is used for reliable, scan-order-independent
selection. `sendQuietly` swallows delivery failures so a mail hiccup never blocks
a business action.

## D22 — Contact form: validated, sanitized, header-injection-safe
**Decision:** The public contact endpoint (`POST /api/v1/public/contact`)
validates and **sanitizes server-side** (never trusts the client). Single-line
fields (email/name/phone) are CR/LF-stripped to prevent **email header
injection**; the body is stored as plain text (not HTML) and rendered escaped, so
there is no HTML/script injection surface (guide §23). An optional shared secret
(`WEBSITE_CONTACT_API_KEY`, header `X-Website-Contact-Key`) gates the endpoint as
an anti-spam measure; when unset the endpoint is open and rate-limited at the
gateway. Portal support threads (client/mediator) are strictly scoped to the
owning user in the service (BOLA defence). Admin replies email the customer via
`ContactNotificationPort` (no SMTP coupling in the domain). Admin inbox listing +
read-state tracking are deferred with the admin console.

## D21 — Public website & blog: Thymeleaf SSR (DB-backed, no static files)
**Decision:** The public site and blog are server-rendered with **Thymeleaf**
from DB content, replacing the legacy static-`.html` generation (guide §7/§21;
supersedes the filesystem approach flagged in D7). Blog pages emit complete,
indexable HTML with `<title>`, meta description, canonical, Open Graph and
**JSON-LD Article/Organization** structured data - no JS needed for indexing.
`/sitemap.xml` and `/robots.txt` are generated from the DB. Slug changes are
handled with **301 redirects** via `redirect_blogs`, preserving SEO (guide §51).
Blog HTML is sanitised server-side with **jsoup** (`HtmlSanitizer`, replacing
`sanitize-html`) and rendered with `th:utext` (guide §32). Site settings are
cached in-memory (Caffeine) since they change rarely and are non-authoritative
(guide §22/§29).

**Testing note:** SSR runtime behaviour is verified by `WebsiteSsrIntegrationTest`
(full app + MySQL via Testcontainers), tagged `integration` and **excluded from
the default `mvn test`** so the fast suite stays green without Docker. Run it with
`mvn test -Dgroups=integration` (Docker required). Standalone Thymeleaf unit
rendering was not used because `@{...}` link expressions require a web context;
E2E (Playwright) will cover rendered HTML end-to-end.

## D20 — Payments: verify-then-fulfil, idempotent, gateway-signed
**Decision:** Reimplement the factory + adapter design (`PaymentGatewayRegistry`
+ `PaymentGatewayAdapter`). The **PayU** adapter is fully migrated, reproducing
the legacy SHA-512 forward hash (checkout) and **reverse-hash verification** with
a required `success` status - the frontend is never trusted (guide §19).
Cashfree/PhonePe adapters follow the same interface (pending).

`payment_orders` is the gateway ledger/state machine. `verifyAndComplete` is
**idempotent**: an already-SUCCESS order short-circuits without re-verifying or
re-fulfilling, so duplicate webhooks/returns are safe. On verification failure the
order is marked FAILED. Webhook endpoints always return 200 (verification failures
are logged, not surfaced) to avoid retry storms; the order is reconciled later.

Fulfilment is a **port** (`PaymentFulfillmentPort`); the default records the
`transactions` ledger row idempotently (keyed by order id) and delegates PRO
activation to `SubscriptionActivationPort`. The richer legacy case pipeline
(auto-assignment, first-meeting scheduling, participant emails) is layered on via
the cases/mediation/notifications domains. Initiation is **purpose-authorized**:
MEDIATOR_PRO requires a mediator; case purposes require case access and (for
clients) party membership. Config aligns with legacy `PAYMENT_GATEWAY`/`PAYU_*`/
`CASHFREE_*`/`PHONEPE_*` env names.

## D19 — S3 documents + PDF without Node/Chromium
**Decision:** Implement `FileStoragePort` with **AWS SDK v2 for Java**
(`S3FileStoragePort`), active only when a bucket is configured; the
`Unavailable*` stub backs off via bean name. Uploads go through `UploadValidator`
(MIME allow-list + 8MB limit, matching legacy). Downloads use **short-lived
presigned GET URLs** (`DocumentUrlService`) so the app never proxies large files
or exposes raw keys; every URL is authorization-gated (`DocumentAccessService`
checks case access first). Objects are private (guide §11/§20).

Credentials use the legacy `S3_*` env names (mapped in `application.yml`), falling
back to the **default provider chain** (EC2 instance role - preferred, no static
keys). The agreement PDF is generated with **openhtmltopdf** (pure-Java,
Apache-2.0) instead of puppeteer, so **no Node/Chromium is needed at runtime**
(guide §45). `AgreementPdfPort` now has a real implementation
(`OpenHtmlAgreementPdfPort`, active with S3); it stores the PDF via
`FileStoragePort`. New dependency justified: HTML→PDF is required and puppeteer is
not viable in a JRE-only image.

## D18 — E-signature capability-token model (preserved)
**Decision:** Public signing links remain gated by the `signature_tracking` row
id (a single-use, **24h-expiring** capability), with signer identity verified
out-of-band via **OTP** (separate endpoints) before submission. Requests that are
already signed or expired are rejected. Signatures are stored as data-URL blobs
in `case_agreement_tracking` (schema parity). This preserves the legacy flow
while enforcing expiry/idempotency server-side. Endpoints live under
`/api/v1/public/**` (permitted, rate-limited). Agreement PDF generation and
outbound emails are delivered via `AgreementPdfPort` / `MediationNotificationPort`
so no puppeteer/SMTP coupling leaks into the domain (D16).

## D17 — SSE via Spring SseEmitter (per-instance)
**Decision:** Real-time uses `SseManager` holding per-instance `SseEmitter`s.
Events are best-effort hints; MySQL remains source of truth, so this is safe
under horizontal scaling without Redis (guide §28/§29). EventSource token is
accepted via `?token=` (JWT filter fallback), matching the legacy client.


## D25 — Angular feature architecture (facade + thin API client + signals)
**Decision:** Each Angular feature follows Component → Feature facade → API
client → HttpClient (guide §33). State is held in the facade with **Signals**
(guide §35); components never call `HttpClient` directly. Features are
standalone, lazy-loaded (`features/<domain>/<domain>.routes.ts`). Cross-cutting
capabilities live in `core/` seams (`RealtimeService` for SSE, `FileService` for
authorized document access) so a future Capacitor build can swap them without
touching feature code (D14). Delivered so far: cases (list/detail),
correspondence (live SSE), payments (initiate→gateway→verify), documents
(presigned access). Route guards are UX-only; the backend remains authoritative
(guide §13/§32).

## D26 — OpenAPI contract with bearer-JWT scheme
**Decision:** springdoc exposes the API contract at `/v3/api-docs` with Swagger
UI at `/swagger-ui.html` (guide §16). `OpenApiConfig` declares API metadata and a
**bearer-JWT** security scheme (from `/api/v1/auth/login`), applied globally;
public endpoints simply ignore the token. The spec is intended to generate the
Angular TypeScript client so DTO/TS pairs are not hand-maintained. Docs paths are
served by the permissive web filter chain (not the `/api/**` chain), so they are
reachable without a token. Verified at runtime (both endpoints return 200).

## D27 — SPA deep-link fallback for /admin
**Decision:** `WebConfig` forwards unmatched `/admin/**` paths (no file
extension) to the Angular shell `index.html`, so a hard refresh on a client route
(e.g. `/admin/cases/123`) returns the SPA instead of a 404. Real static assets
are served first by the default resource handler; the REST API, Actuator and the
Thymeleaf public site keep their own mappings and are never forwarded. The
Angular `application` builder emits to `dist/kadr/browser/`, which the Dockerfile
copies into `classpath:/static/admin/` at image build time (git-ignored locally).
Verified at runtime: `/admin/`, single/multi-segment deep links, and static
chunks all return 200 and serve the shell.


## D28 — Subscription (PRO) domain + real activation/pricing ports
**Decision:** The `subscription` domain owns mediator PRO lifecycle. Current
tier/expiry live on the `user` row (legacy schema: `subscription_tier`,
`subscription_expires_at`); `mediator_subscriptions` is the append-only history.
`SubscriptionService.activatePro` is **idempotent per payment ref** (safe under
duplicate webhooks) and **renew-extends** from the later of now or the current
(still-active) expiry, so early renewal never loses remaining days.
`currentTier` treats a lapsed expiry as FREE. The payment seams established in
D16 are now backed by real beans (`RealSubscriptionActivationPort` named
`realSubscriptionActivationPort`; `ConfiguredProPricingPort` named
`configuredProPricingPort`), so a verified `MEDIATOR_PRO` payment activates PRO
end-to-end. PRO is never client-declared (guide §19). Pricing/term are
configurable via `SubscriptionProperties` (`subscription.pro.*`). Angular
`features/subscription` renders status + PRO catalog and starts the upgrade via
the payments flow.

## D29 — DB-backed scheduler lock (no Redis)
**Decision:** Scheduled jobs use `SchedulerLockService` over the existing
`scheduler_locks` table for cross-instance leader election (D10, guide §28/§29):
an instance claims a job by atomically extending `locked_until`. First consumer
is `SubscriptionExpiryJob` (hourly cron, 50-min lease) which downgrades lapsed
PRO users. No Redis; safe under horizontal scaling. Additional jobs (daily
reminders, etc.) reuse the same lock.


## D30 — Persistent audit trail (DB-backed, isolated, correlation-linked)
**Decision:** The `audit` domain implements the `AuditPort` (D16) with
`PersistentAuditPort` (bean `persistentAuditPort`, superseding the logging
default). Each event is structured-logged **and** written to `admin_audit_logs`
(added in Flyway **V3** — the legacy table was created ad-hoc via prisma db push
and absent from V1, columns preserved: `admin_id, action, target_type,
target_id, details JSON, request_id, created_at`). The correlation id is pulled
from the MDC (`CorrelationIdFilter`) into `request_id` (guide §25/§26/§48).
Persistence is **isolated and best-effort**: `AuditWriter` runs in a
`REQUIRES_NEW` transaction and failures are swallowed, so an audit write can
never roll back or break the business operation that triggered it. The trail is
**append-only** — `AdminAuditController` (`/api/v1/admin/audit-logs`,
admin-only, paginated, filter by action/target) is read-only; there is no
create/update/delete endpoint. No secrets/PII are recorded (metadata is a small
JSON blob). Angular `features/admin/audit` renders the paginated, filterable
trail for admins.


## D31 — Finance domain: mediator invoices + payout bank account
**Decision:** The `finance` domain owns mediator revenue-share invoices and
payout bank accounts (tables `mediator_invoices`, `mediator_bank_accounts`).
`InvoiceService.ensureInvoiceForCase` is **idempotent per case** and reproduces
the legacy formulae exactly (commission = amount × commissionPct/100; GST/tax
computed **on the commission**; netPayable = commission − gst − tax), using
`RoundingMode.HALF_UP` at scale 2 and invoice number `INV-{YYYY}{MM}-{caseNumber
|idPrefix}`. Commission comes from the case's `mediator_commission` or the
`mediator_commission` admin setting; GST/tax from `invoice_gst_percentage` /
`invoice_tax_percentage` (defaults 0). The mediation amount is sourced from the
case's latest successful `transactions` row. `FinanceCaseInvoicePort` (bean
`financeCaseInvoicePort`) replaces the no-op, completing the payment→invoice
pipeline (agreement completion → `CaseInvoicePort` → invoice). Mediators view
their own invoices and manage a single bank account (account number **masked**
to last 4 on read, guide §20); admins list all invoices and mark them paid,
which writes an `INVOICE_PAID` audit event (D30). Angular `features/finance`
provides the invoices list and bank-account form. Invoice/private-invoice PDF
generation is deferred (reuses the openhtmltopdf approach, D19).


## D32 — Signup + password-reset (OTP) with SecureRandom
**Decision:** Self-signup (`/api/v1/signup/client|mediator`) creates an
**inactive**, self-signed-up account with no password, pending admin approval —
preserving the legacy flow and its edge cases (soft-deleted reactivation;
`REGISTRATION_PENDING_APPROVAL`; `CLIENT/MEDIATOR_ACCOUNT_EXISTS`). Password
reset is a two-step email-OTP flow (`/api/v1/auth/reset-password` →
`/confirm-password-change`) over the shared `otp_resets` table (type
`RESET_PASSWORD`, 6 digits, 10-min expiry, single-use). `OtpService` generates
codes with **`SecureRandom`** rather than the legacy `Math.random()` — a
deliberate security improvement (guide §43) with no change to code format/expiry.
Reset requests are **anti-enumeration**: an unknown email returns a neutral 200
and issues no code; multi-account emails require a `userType`
(`ACCOUNT_TYPE_REQUIRED`), ADMIN excluded. New passwords are BCrypt-hashed (D3).
Auth emails (`passwordResetOtp`, `passwordResetSuccess`, `registrationUnderReview`,
`welcomeCredentials`) are seeded in Flyway **V4** and sent via an
`AuthNotificationPort` with an `@Primary` email-backed adapter (D23). Angular
`features/auth` adds `forgot-password` (request + confirm) and `signup`
(client/mediator) screens. Deferred: S3 certificate/evidence uploads and
case-on-signup for clients (the case-creation path already exists in
`CaseWriteService`), Google login, admin sub-permissions.
