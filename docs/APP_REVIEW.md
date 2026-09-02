# Kadr Portal — Comprehensive Platform Review

**Document version:** 1.0  
**Review date:** July 14, 2026  
**Platform:** Kadr.live — Official mediation platform for clients, mediators, and administrators  
**Scope:** Full-stack review (Vue 2 SPA, Express API, Prisma/MySQL, Electron desktop, Capacitor mobile, static marketing site)

---

## Executive Summary

Kadr Portal is a feature-rich mediation platform with strong domain coverage: case lifecycle management, calendar and Zoom integration, digital signatures, multi-channel notifications, invoicing, rewards, eCourts tracking, and a public marketing website. The product vision is clear and the business logic is substantial.

However, the platform is **not yet architected for Amazon/Salesforce-scale reliability**. The current codebase is a single monolithic application with inconsistent authorization, no rate limiting, no distributed job processing, minimal observability, and significant frontend UX debt carried over from the Sofbox admin template.

**Overall readiness assessment:**

| Dimension | Current state | Target (enterprise scale) |
|-----------|---------------|---------------------------|
| Security | ⚠️ Critical gaps | 🔴 Block production hardening |
| Scalability | ⚠️ Single-process limits | 🔴 Will degrade under load |
| Design consistency | ⚠️ Template remnants | 🟡 Functional but unpolished |
| Feature completeness | ✅ Strong domain coverage | 🟢 Good foundation |
| Observability | 🔴 Console logs only | 🔴 No production monitoring |
| CI/CD & infra | 🔴 None in repo | 🔴 Manual deployment risk |

**Top 5 immediate actions before scaling customers:**

1. Fix authorization gaps (IDOR, missing role checks, public debug endpoints)
2. Replace fake payment flows with verified payment gateway integration
3. Add rate limiting, security headers, and upload validation
4. Introduce pagination and query optimization on high-traffic endpoints
5. Fix critical UX bugs (hidden Sign In button, calendar legend swap)

---

## Table of Contents

1. [Client-Side Issues](#1-client-side-issues)
2. [Backend Issues](#2-backend-issues)
3. [Design Enhancements (Frontend)](#3-design-enhancements-frontend)
4. [Text & Label Improvements](#4-text--label-improvements)
5. [Inconsistent Design & Styling](#5-inconsistent-design--styling)
6. [Security Issues](#6-security-issues)
7. [Performance & Scalability](#7-performance--scalability)
8. [Additional Gaps (What You May Have Missed)](#8-additional-gaps-what-you-may-have-missed)
9. [Prioritized Remediation Roadmap](#9-prioritized-remediation-roadmap)
10. [Target Architecture for Scale](#10-target-architecture-for-scale)

---

## 1. Client-Side Issues

### 1.1 Critical Bugs (P0)

| Issue | Location | Impact |
|-------|----------|--------|
| **Sign In button is hidden** | `src/views/AuthPages/SignIn.vue:17` — `style="display:none;"` on the button container | Users cannot click Sign In; login only works via Enter key on password field. Mobile and accessibility users are severely impacted. |
| **Calendar legend colors swapped** | `src/views/MediatorControllers/Calendar.vue:12-13` | Legend shows KADR = `personalEventColor` and Personal = `kadrEventColor`, but Today's Schedule (lines 26-27) uses the opposite mapping. Users misread event types. |
| **Alert type mismatch** | `src/store/alertStore.js` uses `type: 'error'` but `Alert.vue` validator accepts `'danger'` not `'error'` | Error alerts may render without correct styling. |

### 1.2 Form Validation & Error Handling

- **No field-level validation anywhere in the app.** Zero usage of Bootstrap-Vue `invalid-feedback`, `is-invalid`, or validation libraries (Vuelidate, vee-validate).
- All validation errors appear as floating toast alerts at the top — users cannot tell which field failed.
- **Sign In** labels field "Username" but validates email format — confusing for clients and lawyers.
- **Recover Password** has duplicate HTML IDs (`exampleInputPassword1`, `exampleInputEmail1` reused) — breaks screen reader label associations.
- Password visibility toggles are `<i>` icons, not focusable buttons — not keyboard accessible, no `aria-label`.

### 1.3 State Management Problems

| Issue | Location | Detail |
|-------|----------|--------|
| Monolithic Vuex store | `src/store/index.js` (~2,300 lines) | All API calls in one file; only `alert` and `spinner` are namespaced modules |
| `resetState` after login | `SignIn.vue:90` | Clears user/dashboard cache immediately after successful auth; causes flicker and relies on layout refetch |
| Inconsistent session checks | `StandardLayout.vue` vs `Dashboard.vue` | Some views use `tokenStorage.hasStoredSession()`, others use `$cookies.get('accessToken')` — mobile secure storage path ignored |
| Case notes in localStorage | `MyCases.vue:623-627` | Notes persisted locally, not synced to server — data loss risk across devices |
| `window.vm` exposed | `src/main.js:44` | Full Vue instance on window — debugging shortcut, not for production |

### 1.4 Loading, Empty & Error States

**Loading — inconsistent patterns:**
- Global full-screen spinner (Vuex `spinner` module)
- Page-local `loading` + plain "Loading…" text
- `b-overlay` (rarely used, good pattern in `AdminWebsiteContentView.vue`)
- Animated dots in `Dashboard.vue` with no accessible label; silent failure if API fails
- jQuery-based `#loading` cube with 1-second delay fade

**Empty states — mixed quality:**
- Good: `InactiveUsers.vue`, `CaseCorrespondencePanel.vue`, `PortalSupportView.vue`
- Weak: `ViewCaseDetail.vue` — "No meeting found!" with no action; dashboard shows infinite loading dots on API failure

**Error states:**
- Generic `"Something went wrong"` fallback repeated 50+ times in `store/index.js`
- `ErrorPage.vue` — typo "dose not exist"; "Back to Home" links to `href="#"` (broken)

### 1.5 Accessibility (a11y)

| Severity | Issue | Location |
|----------|-------|----------|
| Critical | Hidden Sign In button | `SignIn.vue:17` |
| Critical | Color-only calendar distinction with wrong legend | `Calendar.vue` |
| High | `v-html` on alert messages | `Alert.vue:3` |
| High | Password toggles not keyboard-focusable | Auth pages, `ProfileEdit.vue` |
| High | Duplicate form IDs | `RecoverPassword.vue`, `ProfileEdit.vue` |
| Medium | Mobile nav profile/logout are `<li @click>` not buttons | `StandardLayout.vue` |
| Medium | Full-screen spinners lack `role="status"` / `aria-live` | `spinner.vue` |
| Medium | Many images use generic `alt="Profile"` or `alt="#"` | Multiple views |

### 1.6 Client-Side Security Surfaces

| Risk | File | Detail |
|------|------|--------|
| **High — XSS** | `Alert.vue` | `v-html="message"` renders alert text as HTML |
| **High — XSS** | `AgreementSignature.vue:40` | `v-html="data.outcomeOfMediation"` |
| **High — XSS** | `AdminCasesManagementView.vue` | `v-html="agreementRecord.agreed_terms"` |
| **High — XSS** | `AdminNotificationsView.vue` | Email preview `v-html` |
| **High — XSS** | `public/website/blog.html`, `js/home-latest-blogs.js` | `innerHTML` with API/blog content |
| Medium | Access token in JS-readable cookie | `tokenStorage.js` — not HttpOnly |
| Medium | `FakePaymentModal.vue` | Collects card number/CVV client-side — PCI anti-pattern even if "fake" |
| Medium | `window.KADR_WEBSITE_CONTACT_KEY` | Public API key in deployed HTML if set |

### 1.7 Component Architecture Debt

- **Monolithic views:** `MyCases.vue` (~1,329 lines), `ClientCases.vue` (~1,100 lines), `AdminCorrespondenceInbox.vue` (~1,074 lines), `Blog/MyBlogs.vue` (~1,000 lines)
- **Dead template pages:** 20 files in `src/views/core/*`, 6 in `src/views/Icons/*` — not wired in router, add bloat
- **Duplicate alert wiring:** Most views import local `Alert` AND use global `$store.dispatch('alert/showAlert')`
- **No shared form primitives:** Raw `<input class="form-control">` repeated across auth/signup/profile views
- **Mixed button components:** Raw `<button class="btn btn-primary">` and `<b-button variant="primary">` used interchangeably

### 1.8 Memory Leaks

| File | Issue |
|------|-------|
| `DashboardMediator.vue:237-250` | `document.addEventListener('keydown', ...)` never removed in `beforeDestroy` |
| `GoogleAccountManagement.vue:51-56` | `setInterval` not cleared on component destroy |
| `AdminNotificationsView.vue` | Debounce timers not cleared on destroy |
| `pluginInit.js` | jQuery delegated handlers on `document` never torn down |

---

## 2. Backend Issues

### 2.1 Authorization Architecture (Critical)

The auth middleware (`middleware/authMiddleware.js`) only verifies JWT validity — **no centralized role or resource ownership checks**. Authorization is scattered across controllers and frequently missing.

**Any authenticated user (CLIENT, MEDIATOR, or ADMIN) can access many privileged endpoints if they know the URL.**

#### Missing Role Checks

| Endpoint | Route | Issue |
|----------|-------|-------|
| `POST /newCase` | `apiRoutes.js:47` | Creates court cases + users; no ADMIN role check |
| `POST /assignMediator` | `apiRoutes.js:94` | Any user can assign mediators and create Google Calendar events |
| `GET /listAllMediatorsWithCases` | `apiRoutes.js:95` | Returns all mediator emails/phones/cases |
| `GET /getAvailableMediators` | `apiRoutes.js:93` | Exposes mediator PII for any caseId |
| `POST /setClientPayment` | `apiRoutes.js:135` | Records payments and advances case workflow; no ownership validation |
| `POST /newCalendarEvent` | `apiRoutes.js:42` | Creates Zoom meetings for any caseId without membership check |

#### IDOR (Insecure Direct Object Reference)

| Endpoint | File | Issue |
|----------|------|-------|
| `GET /getMediationData` | `generalController.js:1000-1055` | Fetches case + events with no party/mediator/admin check |
| `POST /markCaseResolved` | `generalController.js:1060-1124` | No check that caller is assigned mediator |
| `POST /saveNote`, `POST /deleteNote` | `generalController.js:576-603` | Notes can be read/modified/deleted by any user if ID is known |
| Signature endpoints | `apiRoutes.js:97-100` | Public — UUID as sole secret; returns extensive case PII |

#### Admin Permission Gaps

- Legacy admins with `admin_permissions = null` bypass all page-level restrictions (`adminPermissionHelpers.js:26-38`)
- `getMediatorRewardsAdmin` missing `assertAdminPage()` check — any ADMIN can read any mediator's rewards

### 2.2 Public / Under-Protected Endpoints

| Route | Auth | Risk |
|-------|------|------|
| `GET /api/test` | **None** | Debug case assignment exposed publicly |
| `POST /sendOtp` | None | SMS spam / cost abuse |
| `POST /verifyOTP` | None | 6-digit OTP brute force, no lockout |
| `GET/POST /signature*` | None | Case PII + signature submission |
| `POST /newUserSignup`, `/newMediatorSignup` | None | Account creation + S3 upload |
| `GET /getExistingUser` | Broken token check | User PII leak; no Bearer prefix strip |
| `GET /isEmailExist` | None | Email enumeration |
| `POST /public/website-contact-lead` | Optional API key | Spam vector if env var unset |
| `POST /mediator/subscription/purchase` | Auth only | **Free Pro upgrade** via fake payment |
| `GET /getGoogleToken` | Auth only | OAuth token theft |

### 2.3 Input Validation

- **No validation library** (no Joi, Zod, or express-validator)
- Validation is ad hoc; many body fields passed straight to Prisma
- Password change has no length/complexity checks (`authController.js:316-345`)
- OTP lookup not scoped by type — could match wrong OTP record
- Duplicate route registration: `/admin/notifications/preview-email-layout` registered twice

### 2.4 Payment & Subscription (Critical Business Logic)

**Fake payment system is in production code:**

```javascript
// controller/subscriptionController.js
// Any mediator can POST { status: 'success' } to activate Pro without real payment
const result = await recordFakeProPayment({ mediatorId, paymentId, amount, currency })
```

- `FakePaymentModal.vue` on frontend collects card details client-side
- `setClientPayment` trusts client-reported payment status
- No server-side payment gateway verification (Razorpay, Stripe, etc.)

### 2.5 File Upload Handling

All uploads go through `helper.deployToS3Bucket(base64Content, fileName)`:

| Issue | Detail |
|-------|--------|
| No file type allowlist | Client-controlled MIME type from base64 header |
| No magic-byte validation | Extension derived from client-provided MIME |
| No size check on signup/profile uploads | Only correspondence has limits (5 × 8 MB) |
| Hardcoded S3 bucket name | `kadrapp-files-402961398131-us-east-1-an` in source code |
| Public S3 URLs | No presigned GET, no ACL control visible |
| Stored XSS via blog | Raw HTML stored and injected into static blog pages |

### 2.6 Token & Session Management

| Aspect | Finding |
|--------|---------|
| Access token TTL | 1 day |
| Refresh token (web) | 7 days, httpOnly cookie — good |
| Refresh token (mobile) | Returned in JSON body — XSS/theft risk |
| Refresh validation | JWT verify only — **does not re-check** user active/deleted status |
| Token revocation | No refresh token blacklist or rotation |
| Logout | Clears cookie only; mobile refresh tokens not invalidated |
| Sign-up links | JWT in URL query param, 30-day expiry — token in browser history/logs |
| Mobile client detection | Spoofable via `x-kadr-client: mobile` header — attacker gets 30-day refresh token |

### 2.7 Database Query Issues

**N+1 patterns:**
- `listInbox` — per-thread queries in loop (~240 extra queries per inbox load)
- Blog tag creation — sequential upserts in loops
- Daily reminder job — `findFirst` with text `contains` per candidate

**Unbounded queries (no pagination):**
- Admin calendar loads ALL events (`generalController.js:55-58`)
- Finance endpoints return full invoice/transaction tables
- `listAllMediatorsWithCases` — all mediators × all cases
- Case correspondence message history — no cursor/limit
- Client notifications — all notifications for user

**Missing indexes:**
- `events.start_datetime` — no index (only `case_id`, `created_by`)
- Blog search uses `contains` on `LongText content` — full table scan
- OTP lookups on `(email, type)` — verify index exists

### 2.8 Error Handling Inconsistencies

- Global handler masks unhandled errors (good) but logs full stack to console only
- Inconsistent error response shapes (`error` vs `errorCode` keys)
- `AppError.details` passed to client if set — potential info leak
- `getExistingUser` has no try/catch — crashes become unhandled 500s

---

## 3. Design Enhancements (Frontend)

To achieve a professional, scalable, user-loved platform comparable to Salesforce or modern SaaS products:

### 3.1 Establish a Design System

**Current state:** No design tokens. Primary blue hardcoded as `#0084ff`, `#067bfe`, `#0885ff`, `#077bff`, `#474bff` across different files. Admin portal and public website use completely separate styling systems.

**Recommended:**

```
src/theme/
├── tokens.css          # CSS custom properties
├── typography.css      # Type scale
├── components/         # Shared button, input, card, empty-state
└── README.md           # Usage guidelines
```

**Core tokens to define:**

```css
:root {
  --kadr-primary: #0084ff;
  --kadr-primary-hover: #0062cc;
  --kadr-text-primary: #374948;
  --kadr-text-secondary: #777D74;
  --kadr-bg-page: #f3f7fd;
  --kadr-bg-surface: #ffffff;
  --kadr-error: #C03020;
  --kadr-success: #28a745;
  --kadr-spacing-unit: 8px;
  --kadr-radius: 8px;
  --kadr-shadow-sm: 0 1px 3px rgba(0,0,0,0.08);
  --kadr-shadow-md: 0 4px 12px rgba(0,0,0,0.12);
}
```

### 3.2 Component Library Consolidation

Create shared primitives to replace repeated patterns:

| Component | Purpose | Replaces |
|-----------|---------|----------|
| `KadrButton` | Primary/secondary/ghost/danger variants | Mixed `<button>` and `<b-button>` |
| `KadrInput` | Label + input + inline error | Raw form-control inputs |
| `KadrFileUpload` | Drag-drop, preview, size/type validation | Repeated upload handlers |
| `KadrEmptyState` | Icon + heading + description + CTA | 7+ duplicated empty-state blocks |
| `KadrPageHeader` | Title + breadcrumbs + actions | Inline h4/h5 headers |
| `KadrDataTable` | Paginated, sortable, responsive | Raw b-table with inconsistent styling |
| `KadrModal` | Consistent modal wrapper | Mix of b-modal and custom modals |

### 3.3 Navigation & Information Architecture

**Improvements:**
- Replace generic route name `calendar2` with `client-calendar` for clarity
- Add breadcrumbs on all deep pages (case detail, mediator 360, invoice detail)
- Consistent page titles in `<title>` tag per route (currently generic)
- Role-specific onboarding flows for first-time clients and mediators
- Contextual help tooltips on complex forms (case creation, mediator signup)

### 3.4 Dashboard Enhancements

| Role | Current | Recommended |
|------|---------|-------------|
| Client | Case list embedded in dashboard | Add: next meeting countdown, action items (sign agreement, pay fee), progress timeline |
| Mediator | Cases + court tracker + legal feeds | Add: today's schedule widget, pending signatures count, income summary card |
| Admin | Stats + inactive user approvals | Add: platform health metrics, recent activity feed, quick actions panel |

### 3.5 Mobile Experience

- `_mobile-app.scss` provides good foundation (safe areas, sidebar hide)
- Tables rely on horizontal scroll — migrate to card-based responsive layouts on mobile
- Calendar sidebar `max-height: 700px` awkward on mobile — use bottom sheet pattern
- Add pull-to-refresh on case lists and correspondence
- Native-feeling transitions between views (Capacitor)

### 3.6 Remove Template Bloat

- Delete or isolate unused Sofbox demo pages (`src/views/core/*`, `src/views/Icons/*`)
- Replace Owl Carousel + jQuery in auth layout with Vue-native carousel
- Remove global jQuery dependency from `pluginInit.js` where possible
- Consolidate 4 CSS files (`custom.css`, `typography.css`, `style.css`, `developer.css`) into SCSS with proper imports

---

## 4. Text & Label Improvements

### 4.1 Placeholder / Unprofessional Copy (Must Fix)

| Current Text | Location | Recommended |
|-------------|----------|-------------|
| "Manage your orders" + Lorem ipsum | `AuthLayout.vue:18-29` | "Resolve disputes peacefully" + "Kadr connects you with certified mediators to settle cases outside court — faster, cheaper, and confidential." |
| "Copyright 2020" | `StandardLayout.vue:114` | "© 2026 Kadr.live. All rights reserved." |
| "Stay **tunned**" | `ComingSoon.vue:10` | "Stay **tuned**" |
| "The requested page **dose** not exist" | `ErrorPage.vue:8` | "The page you're looking for doesn't exist." |
| `+91 00000 00000` | `kadrSupportContact.js:2` | Actual support phone number |
| `support@example.com` | `kadrSupportContact.js:3-4` | `support@kadr.live` |
| `+91 [Number]` | `public/website/js/site-config.js` | Actual phone number |

### 4.2 Terminology Standardization

The platform uses inconsistent terms for the same concepts. Adopt a glossary:

| Concept | ❌ Avoid (mixed usage) | ✅ Standard term |
|---------|----------------------|-----------------|
| Person initiating case | "Complaint", "First party", "Petitioner" | **Initiating Party** |
| Other side | "Opposite Party", "Second party", "Opponent" | **Responding Party** |
| Professional | "Dispute resolution expert", "DR Expert" | **Mediator** |
| Legal proceeding | "Complaint", "Dispute", "Case" | **Mediation Case** (or **Case** in context) |
| Auth action | "Log In", "Sign in", "Login" | **Sign In** (verb), **Sign-In** (noun/adjective) |
| Registration | "Sign up", "Register", "Create account" | **Create Account** |
| Email field | "Username", "Email address", "Email Address" | **Email Address** |

### 4.3 Error Message Improvements

| Current | Recommended |
|---------|-------------|
| "Something went wrong" | Context-specific: "Unable to load your cases. Please try again or contact support." |
| "No meeting found!" | "No upcoming meetings scheduled for this case." |
| "Invalid credentials" | "The email or password you entered is incorrect." |
| Generic validation alerts | Field-level: "Please enter a valid 10-digit mobile number." |

### 4.4 Professional Tone Guidelines

- Use sentence case for labels ("Email address" not "Email Address")
- Avoid exclamation marks in empty/error states
- Use active voice: "Create a new case" not "New case can be created"
- Include helpful next steps: "No cases yet. Create your first mediation case to get started."
- Legal/mediation context: Use "confidential" and "impartial" language where appropriate

### 4.5 Recommended: Centralized Messages File

```javascript
// src/constants/messages.js
export const AUTH = {
  SIGN_IN_TITLE: 'Sign in to your account',
  EMAIL_LABEL: 'Email address',
  PASSWORD_LABEL: 'Password',
  FORGOT_PASSWORD: 'Forgot password?',
  NO_ACCOUNT: "Don't have an account?",
  CREATE_ACCOUNT: 'Create account',
  INVALID_CREDENTIALS: 'The email or password you entered is incorrect.',
}
export const CASES = {
  EMPTY_TITLE: 'No cases yet',
  EMPTY_DESCRIPTION: 'Create your first mediation case to connect with a certified mediator.',
  CREATE_CTA: 'Create new case',
}
// ... etc.
```

---

## 5. Inconsistent Design & Styling

### 5.1 Color Inconsistencies

| Element | Colors found | Should be |
|---------|-------------|-----------|
| Primary buttons | `#0084ff`, `#067bfe`, `#0885ff`, `#077bff` | Single `--kadr-primary` |
| Dashboard loader | `#474bff` | `--kadr-primary` |
| Calendar close buttons | Inline `background: #0084ff` | Button component variant |
| Pagination active | `#0062cc` | `--kadr-primary-hover` |
| Selection highlight | `#0084ff` | `--kadr-primary` |

### 5.2 Button Style Drift

| Pattern | Where used | Issue |
|---------|-----------|-------|
| `<button class="btn btn-primary">` | Auth pages, older views | Bootstrap 4 raw |
| `<b-button variant="primary">` | Admin views, newer components | Bootstrap-Vue |
| Inline `style="background: #0084ff;"` | Calendar modals, close buttons | Hardcoded |
| Custom modal buttons | `FakePaymentModal.vue` | Completely custom CSS |
| `style="background: white;border: 1px solid black;"` | `MyCases.vue` | Unstyled controls |

### 5.3 Typography Inconsistencies

- Body: Poppins 14px (global)
- Headings: Questrial (global)
- But many inline overrides: `font-weight: bold`, `font-size: 18px`, `font-size: 2rem`
- Mobile inputs forced to 18px (good for iOS) but no consistent type scale elsewhere
- No shared heading hierarchy (h1-h6 used inconsistently)

### 5.4 Spacing & Layout

- Bootstrap grid used but many one-off margins/padding via inline styles (50+ occurrences)
- Empty-state blocks redefined in 7+ files with slightly different padding/icon sizes
- Card headers vary between `iq-card` template slots and raw `<h4 class="card-title">`
- Fixed heights (`height: 100vh`, `max-height: 700px`) cause clipping on various viewports

### 5.5 Scoped vs Global CSS Leakage

| Pattern | Files | Risk |
|---------|-------|------|
| Unscoped `<style>` | `SignIn.vue`, `RecoverPassword.vue`, `StandardLayout.vue` | Global pollution |
| Scoped + unscoped mix | `AdminRewardFulfillmentRulesPanel.vue` | Unpredictable cascade |
| `<style lang="scss">` scoped | Some newer components | Correct pattern |
| Inline styles | 50+ views | Unmaintainable |

### 5.6 Admin Portal vs Marketing Site

| Aspect | Admin Portal | Marketing Site |
|--------|-------------|----------------|
| CSS approach | Bootstrap 4 + Sofbox SCSS | Custom CSS variables |
| Primary color | `#0084ff` | Similar but separate tokens |
| Typography | Poppins + Questrial | Different font stack |
| Error color | Not defined | `--error: #C03020` |
| Responsive | Sofbox breakpoints + mobile SCSS | `site-responsive.css` |

**These should share a common token foundation even if layouts differ.**

---

## 6. Security Issues

### 6.1 Critical (Fix Before Next Customer)

| # | Issue | CVSS-like severity | Remediation |
|---|-------|-------------------|-------------|
| 1 | IDOR on cases, notes, payments | **Critical** | Add `requireCaseAccess()` middleware checking party/mediator/admin relationship |
| 2 | Fake payment → free Pro subscription | **Critical** | Integrate Razorpay/Stripe with server-side webhook verification |
| 3 | Public `/api/test` debug endpoint | **Critical** | Remove or gate behind admin auth + env flag |
| 4 | Signature endpoints expose case PII | **Critical** | Add OTP verification before signature submission; rate limit |
| 5 | Stored XSS via blog HTML | **Critical** | Sanitize with DOMPurify server-side before storage and static generation |
| 6 | No rate limiting on auth/OTP/signup | **Critical** | Add `express-rate-limit` on all public endpoints |

### 6.2 High

| # | Issue | Remediation |
|---|-------|-------------|
| 7 | No security headers (helmet) | Add `helmet` middleware with CSP, X-Frame-Options, etc. |
| 8 | File uploads accept any MIME type | Allowlist + magic-byte validation + size limits |
| 9 | S3 bucket publicly accessible | Private bucket + presigned URLs |
| 10 | Google OAuth callback — no state validation | Verify `state` param matches initiating user |
| 11 | Refresh tokens don't re-check user status | Re-validate user active/not-deleted on refresh |
| 12 | Mobile client header spoofable | Use device attestation or signed client credentials |
| 13 | `getGoogleToken` exposed to any authenticated user | Restrict to admin role |
| 14 | Email enumeration via `isEmailExist` | Return generic responses; rate limit |
| 15 | Hardcoded S3 bucket name in source | Move to environment variable |

### 6.3 Medium

| # | Issue | Remediation |
|---|-------|-------------|
| 16 | No refresh token rotation | Implement rotation on each refresh |
| 17 | JWT in signup URL query params | Use short-lived tokens + POST redirect |
| 18 | `.env.mobile` not in `.gitignore` | Add to gitignore |
| 19 | No startup validation for required secrets | Fail fast if `SECRET_KEY`, `DATABASE_URL` missing |
| 20 | Website contact endpoint open without API key | Require API key in production |
| 21 | Legacy admin bypass (`admin_permissions = null`) | Migrate all admins to explicit permissions |
| 22 | Password change — no complexity rules | Enforce min 8 chars, mixed case, number |
| 23 | OTP not scoped by type | Filter by `type: 'RESET_PASSWORD'` |
| 24 | Access token in JS-readable cookie | Consider HttpOnly for access token too (with BFF pattern) |

### 6.4 Security Architecture Recommendations

```
Recommended middleware stack (in order):
1. helmet()                    — Security headers
2. corsMiddleware              — Existing, tighten origins in production
3. rateLimit({ windowMs: 15*60*1000, max: 100 })  — Global
4. rateLimit({ windowMs: 15*60*1000, max: 5 })   — Auth routes
5. express.json({ limit: '2mb' })  — Reduce from 10mb
6. authMiddleware              — JWT verification
7. requireRole('ADMIN')        — NEW: Role-based access
8. requireCaseAccess()         — NEW: Resource ownership
9. validate(schema)            — NEW: Input validation (Zod/Joi)
10. controller handler
11. errorHandler               — Existing
```

---

## 7. Performance & Scalability

### 7.1 Critical Performance Issues

| Issue | Location | Impact at scale |
|-------|----------|---------------|
| **No route-level code splitting** | `src/router/index.js` — all 25+ views statically imported | Initial bundle loads entire app (~MB+); slow first paint |
| **Admin calendar loads ALL events** | `generalController.js:55-58` | Memory/response time grows linearly with event count |
| **Finance endpoints unbounded** | `financeController.js` | Invoice/transaction tables returned in full |
| **Puppeteer per PDF request** | `utils/pdfFromHtml.js` | New Chromium process per PDF; CPU/memory bound |
| **In-process cron jobs** | `lib/serverApp.js` | N replicas = N duplicate emails and subscription downgrades |

### 7.2 High — Database & API

| Issue | Location | Detail |
|-------|----------|--------|
| Deep eager loading on case queries | `utils/helper.js` — `getClientCases`, `getMediatorCases` | 10 cases/page loads events, history, transactions, agreements per case |
| Inbox N+1 queries | `caseCorrespondenceController.js:357-444` | ~240 extra queries per inbox load |
| Blog list returns full HTML content | `blogController.js:287-305` | List endpoint should return excerpts only |
| `listAllMediatorsWithCases` unbounded | `mediatorController.js:244-260` | All mediators × all cases |
| Auth DB round-trip per request | `helper.js:1397-1407` | JWT verify + user lookup on every API call |
| Daily reminder unbounded reads | `dailyReminderScheduler.js:71-166` | Parallel findMany with no limits |
| Missing index on `events.start_datetime` | `prisma/schema.prisma` | Date-range queries degrade to scans |

### 7.3 High — Frontend

| Issue | Location | Detail |
|-------|----------|--------|
| Full lodash import | `src/main.js:8` | Import specific functions only |
| All sofbox components globally registered | `src/main.js:15-20` | `require.context` loads everything upfront |
| Full Bootstrap SCSS + Font Awesome | `style.scss` | ~70KB+ icon CSS alone |
| FullCalendar + 4 plugins bundled | `FullCalendar.vue` | Heavy; should lazy-load with calendar route |
| CodeMirror in admin views | `HtmlCodeEditor.vue` | Should lazy-load |
| jQuery + owl.carousel globally | `pluginInit.js` | Legacy dependency |
| No list virtualization | All table/list views | DOM grows linearly with data |

### 7.4 Medium — Infrastructure

| Issue | Detail |
|-------|--------|
| No HTTP caching | No Cache-Control, ETag, or compression middleware |
| No Redis/caching layer | All API responses are fresh DB reads |
| In-memory caches not shared | Notification rules, legal feeds, eCourts sessions — per-process only |
| Shallow health check | `/health` returns "OK" without DB/dependency checks |
| No structured logging | Console.log only — no request IDs, no log aggregation |
| No error tracking | No Sentry/Rollbar — errors lost in production |
| No rate limiting | Abuse amplifies with traffic |
| 10MB JSON body limit | Memory pressure × concurrent requests |
| `lodash: "latest"` in package.json | Non-reproducible builds |

### 7.5 Scalability Blockers for Horizontal Scale

| Blocker | Why |
|---------|-----|
| In-process cron | Duplicate job execution across replicas |
| In-memory caches | Inconsistent state across instances |
| Puppeteer per request | CPU/memory bound; doesn't scale linearly |
| No job queue | Long work (emails, PDF, digest) tied to API process |
| eCourts session Map | Per-process; won't work across nodes |
| No connection pool tuning | Prisma pool size undocumented |

---

## 8. Additional Gaps (What You May Have Missed)

### 8.1 DevOps & Infrastructure

| Gap | Current | Needed for scale |
|-----|---------|-----------------|
| **No CI/CD pipeline** | Manual deploy | GitHub Actions: lint → test → build → deploy |
| **No Docker/containerization** | Direct Node.js | Dockerfile + docker-compose for reproducible deploys |
| **No infrastructure as code** | Manual hosting | Terraform/Pulumi for AWS/GCP resources |
| **No staging environment** | Appears single-env | Staging + production with feature flags |
| **No database migration strategy** | Prisma push/pull | Versioned migrations with rollback plan |
| **No backup/disaster recovery** | Not documented | Automated DB backups, S3 versioning, recovery runbook |
| **Built artifacts in repo** | `dist/`, `release/` present | Add to `.gitignore`; build in CI |

### 8.2 Testing

| Gap | Detail |
|-----|--------|
| **No test suite visible** | No `test/`, `__tests__/`, or test scripts in `package.json` |
| **No API integration tests** | Critical auth/business flows untested |
| **No E2E tests** | Sign-up, case creation, payment flows untested |
| **No load testing** | Unknown breaking point for concurrent users |

**Recommendation:** Minimum viable test coverage:
- Auth flow (login, refresh, logout, password reset)
- Case CRUD with authorization checks
- Payment webhook processing
- Notification delivery
- Load test: 100 concurrent users on dashboard + case list

### 8.3 Data & Compliance

| Gap | Detail | Recommendation |
|-----|--------|----------------|
| **No audit logging** | Admin actions not tracked | Audit log table for sensitive operations |
| **No data retention policy** | Cases/users stored indefinitely | Define retention + anonymization for closed cases |
| **No GDPR/data export** | Users can't export their data | "Download my data" endpoint |
| **No consent management** | Privacy policy acceptance not tracked | Consent timestamp on user record |
| **PII in logs** | Error handler logs full errors | Scrub PII from logs |
| **Mediation confidentiality** | Case data access not fully restricted | Document access control matrix |

### 8.4 Business Continuity

| Gap | Detail |
|-----|--------|
| **Single database** | No read replicas for scaling reads |
| **Single API server** | No load balancer / auto-scaling |
| **External service dependencies** | Zoom, Google, Twilio, S3, eCourts — no fallback if down |
| **No circuit breakers** | External API failures cascade to user errors |
| **No graceful degradation** | If notifications fail, case operations should still work |

### 8.5 Missing Features for Enterprise Customers

| Feature | Why it matters at scale |
|---------|------------------------|
| Multi-tenant / organization support | Law firms with multiple mediators |
| SSO / SAML | Enterprise client requirement |
| API versioning (`/api/v1/`) | Backward compatibility as you iterate |
| Webhook system | Let clients integrate their systems |
| Bulk operations | Admin importing cases, bulk notifications |
| Advanced search | Full-text search across cases, messages |
| Real-time updates | WebSocket/SSE for case messages, notifications |
| SLA monitoring | Uptime guarantees for enterprise contracts |

### 8.6 Code Quality & Maintainability

| Issue | Detail |
|-------|--------|
| `generalController.js` ~1,400 lines | Split into case, calendar, dashboard, user controllers |
| `store/index.js` ~2,300 lines | Split into domain modules (auth, cases, admin, mediator) |
| `apiRoutes.js` ~200 endpoints in one file | Split by domain with route modules |
| Missing seed script | `scripts/seedNotificationTemplates.js` referenced but missing |
| Dead dependency | `mysql` npm package unused |
| Schema/code drift | `working_day_of_week` used in code but not in Prisma schema |
| No API documentation | No OpenAPI/Swagger spec |

### 8.7 User Role Clarification

The platform has three roles: **Admin**, **Mediator**, **Client**. There is no dedicated "Lawyer" role — lawyers appear only in marketing copy. If lawyers need platform access (separate from mediators), a fourth role with appropriate permissions would be needed.

---

## 9. Prioritized Remediation Roadmap

### Phase 0 — Critical Fixes (Week 1-2)

**Security & bugs that block production trust:**

- [ ] Remove or protect `GET /api/test`
- [ ] Fix hidden Sign In button (`SignIn.vue:17`)
- [ ] Fix calendar legend color swap (`Calendar.vue:12-13`)
- [ ] Add authorization checks to: `getMediationData`, `markCaseResolved`, `newCase`, `assignMediator`, `setClientPayment`, `saveNote`, `deleteNote`
- [ ] Disable or gate fake payment (`recordFakeProPayment`) behind env flag
- [ ] Add rate limiting on: `/login`, `/sendOtp`, `/verifyOTP`, `/newUserSignup`, signature endpoints
- [ ] Add `helmet` middleware
- [ ] Sanitize blog HTML before storage (DOMPurify)

### Phase 1 — Security Hardening (Week 3-4)

- [ ] Implement `requireRole()` and `requireCaseAccess()` middleware
- [ ] Add input validation library (Zod) on all POST/PUT endpoints
- [ ] File upload: allowlist, magic bytes, size limits, private S3 bucket
- [ ] Refresh token rotation + user status re-check
- [ ] OTP attempt limits + scope by type
- [ ] Migrate legacy admins to explicit permissions
- [ ] Add startup env validation
- [ ] Integrate real payment gateway (Razorpay recommended for India)

### Phase 2 — Performance Foundation (Week 5-8)

- [ ] Add pagination to: calendar, finance lists, mediator list, notifications
- [ ] Fix inbox N+1 queries
- [ ] Add `start_datetime` index on events table
- [ ] Route-level code splitting in Vue router
- [ ] Lazy-load: FullCalendar, CodeMirror, admin views
- [ ] Puppeteer browser pool (or switch to lighter PDF lib)
- [ ] Move cron to distributed queue (BullMQ + Redis)
- [ ] Add `/health/ready` with DB check
- [ ] Add `compression` middleware

### Phase 3 — Design System & UX (Week 9-12)

- [ ] Create design tokens (`src/theme/tokens.css`)
- [ ] Build shared components: KadrButton, KadrInput, KadrEmptyState, KadrDataTable
- [ ] Replace all placeholder copy (AuthLayout, support contact, ErrorPage)
- [ ] Standardize terminology (glossary enforcement)
- [ ] Centralize messages (`src/constants/messages.js`)
- [ ] Field-level form validation
- [ ] Fix all a11y issues (IDs, aria labels, keyboard navigation)
- [ ] Remove dead template pages
- [ ] Align admin portal colors with marketing site tokens

### Phase 4 — Observability & DevOps (Week 13-16)

- [ ] Structured logging (Pino) with request IDs
- [ ] Error tracking (Sentry)
- [ ] CI/CD pipeline (GitHub Actions)
- [ ] Docker containerization
- [ ] Database migration strategy
- [ ] Staging environment
- [ ] Basic test suite (auth, case CRUD, payments)
- [ ] Load testing baseline

### Phase 5 — Scale Architecture (Month 5+)

- [ ] Redis caching layer
- [ ] Read replica for MySQL
- [ ] Job queue for emails, PDFs, notifications
- [ ] WebSocket for real-time case messages
- [ ] API versioning
- [ ] CDN for static assets and S3 files
- [ ] Auto-scaling infrastructure
- [ ] Audit logging
- [ ] Multi-tenant foundation (if needed)

---

## 10. Target Architecture for Scale

### Current Architecture

```
┌─────────────┐     ┌──────────────────────────────────┐
│  Vue 2 SPA  │────▶│  Express (single process)        │
│  (dist/)    │     │  ├── API routes (~200 endpoints) │
│             │     │  ├── In-process cron              │
│  Electron   │     │  ├── Puppeteer (PDF)              │
│  Capacitor  │     │  ├── In-memory caches             │
└─────────────┘     │  └── Prisma → MySQL              │
                    └──────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    │  AWS S3 │ Twilio  │
                    │  Zoom   │ Google  │
                    └───────────────────┘
```

### Target Architecture (Salesforce/Amazon scale)

```
                        ┌──────── CDN (CloudFront) ────────┐
                        │  Static assets, S3 presigned URLs │
                        └──────────────┬───────────────────┘
                                       │
┌──────────┐  ┌──────────┐     ┌───────▼────────┐
│ Vue 3/   │  │ Mobile   │     │ Load Balancer  │
│ React    │  │ Capacitor│────▶│ (ALB/nginx)    │
│ (lazy    │  │          │     └───┬────────────┘
│  chunks) │  └──────────┘         │
└──────────┘                 ┌─────┼─────┐
                             ▼     ▼     ▼
                        ┌─ API ─┐┌─ API ─┐┌─ API ─┐
                        │Node 1 ││Node 2 ││Node N │  (stateless)
                        └───┬───┘└───┬───┘└───┬───┘
                            │        │        │
              ┌─────────────┼────────┼────────┼──────────┐
              ▼             ▼        ▼        ▼          ▼
        ┌─────────┐  ┌─────────┐ ┌──────┐ ┌───────┐ ┌────────┐
        │  Redis  │  │  MySQL  │ │ Bull │ │ Sentry│ │  S3    │
        │  Cache  │  │ Primary │ │ Queue│ │ + Logs│ │ Private│
        │  + Rate │  │ + Read  │ │ +Jobs│ │       │ │ Bucket │
        │  Limit  │  │ Replica │ │      │ │       │ │        │
        └─────────┘  └─────────┘ └──────┘ └───────┘ └────────┘
                           │
                    ┌──────▼──────┐
                    │  Worker     │  (separate process)
                    │  ├── Emails │
                    │  ├── PDFs   │
                    │  ├── Cron   │
                    │  └── Push   │
                    └─────────────┘
```

### Key Principles for Scale

1. **Stateless API servers** — No in-memory state; everything in Redis/DB
2. **Separate workers** — Long-running tasks (email, PDF, cron) off the request path
3. **Cache aggressively** — Redis for session, API responses, notification rules
4. **Paginate everything** — No unbounded queries, ever
5. **Monitor everything** — Sentry for errors, structured logs, APM, uptime checks
6. **Deploy safely** — CI/CD, staging, blue-green deploys, database migrations
7. **Design consistently** — Token-based design system, shared components, centralized copy
8. **Secure by default** — Authorization middleware, rate limiting, input validation on every endpoint

---

## Appendix A: File Reference Index

| Area | Key Files |
|------|-----------|
| **Server entry** | `server.js`, `lib/serverApp.js` |
| **API routes** | `routes/apiRoutes.js` |
| **Auth** | `middleware/authMiddleware.js`, `controller/authController.js`, `utils/helper.js` |
| **Controllers** | `controller/generalController.js`, `controller/mediatorController.js`, `controller/financeController.js` |
| **Frontend entry** | `src/main.js`, `src/App.vue` |
| **Router** | `src/router/index.js` |
| **State** | `src/store/index.js` |
| **API client** | `src/utils/apiClient.js`, `src/utils/tokenStorage.js` |
| **Layouts** | `src/layouts/StandardLayout.vue`, `src/layouts/AuthLayout.vue` |
| **Auth views** | `src/views/AuthPages/SignIn.vue`, `RecoverPassword.vue` |
| **Styling** | `src/assets/scss/style.scss`, `src/assets/css/style.css` |
| **Database** | `prisma/schema.prisma`, `lib/prisma.js` |
| **Schedulers** | `services/scheduler/dailyReminderScheduler.js`, `subscriptionExpiryScheduler.js` |
| **Notifications** | `services/notification/notificationService.js` |
| **Config** | `vue.config.js`, `capacitor.config.json`, `.env.desktop.example` |
| **Docs** | `docs/DATABASE.md`, `docs/MOBILE.md`, `docs/NOTIFICATIONS.md` |

## Appendix B: Severity Legend

| Level | Meaning | Action |
|-------|---------|--------|
| 🔴 **Critical** | Exploitable now; data breach or financial loss possible | Fix immediately |
| 🟠 **High** | Significant risk under load or attack | Fix within 2 weeks |
| 🟡 **Medium** | Degrades experience or security posture | Fix within 1 month |
| 🟢 **Low** | Technical debt, minor UX issues | Schedule in backlog |

---

*This review was conducted through static code analysis of the full codebase. Dynamic testing (penetration testing, load testing) is recommended as a follow-up before scaling to enterprise customer volumes.*
