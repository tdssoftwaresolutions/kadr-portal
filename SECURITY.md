# SECURITY.md

Security posture of the target platform and how the migration addresses the
findings from the legacy audit (guide §43). OWASP API Security is the baseline.

---

## Authentication (guide §12)
- **Spring Security** with stateless JWT for the API. Short-lived access token
  (Bearer) + refresh token. Refresh token is an **HttpOnly, Secure, SameSite**
  cookie on web; returned in the body only for mobile clients.
- **BCrypt** password hashing via `BCryptPasswordEncoder` — verifies existing
  legacy hashes so no user is forced to reset (DECISIONS D3). Argon2id upgrade is
  a documented future option (U2).
- Deleted/inactive accounts cannot authenticate; refresh re-validates the user.
- Google login verifies the Google ID token server-side (migrated with the
  signup/OAuth flow). OTP (SMS/email) preserved with short expiry.
- Secrets (`JWT_ACCESS_SECRET`, etc.) are environment-provided; dev defaults must
  be overridden in every non-dev environment.

## Authorization (guide §13)
- Role authorities (`ROLE_ADMIN/MEDIATOR/CLIENT`) from the token; method security
  (`@PreAuthorize`) enabled.
- **Resource/object-level checks** (BOLA/IDOR defence) are enforced in services
  for cases, documents, payments, invoices and profiles — "knowing an ID" never
  implies access. This closes gaps where legacy endpoints relied on role only.

## API security (guide §14)
- Input validation via Jakarta Bean Validation on request DTOs.
- **Output DTOs only** — JPA entities are never serialized (prevents excessive
  data exposure and mass assignment).
- Parameterized access via JPA (no string-built SQL) — SQL injection defence.
- Central error handling never leaks stack traces, SQL, class names or secrets;
  every response carries a correlation `traceId`.
- CORS restricted to configured origins; credentials allowed for the cookie flow.
- Request body and multipart size limits configured.
- Rate limiting is applied to auth/OTP/signup endpoints as those flows are
  migrated (legacy used `express-rate-limit`; target uses a filter/bucket).

## Documents (guide §11/§20)
- Files stored in a **private S3** bucket; MySQL stores metadata only.
- Authorization enforced before view/download/delete; short-lived **presigned
  URLs** for large transfers; no public object access.
- Upload type allow-list, size limits, filename sanitisation; client MIME type is
  not trusted alone.

## Payments (guide §19)
- Never trusts client-declared success. Verifies via gateway **webhook/return +
  signature**; idempotent fulfilment; `payment_orders` status state machine;
  duplicate-webhook safe. No card data stored (gateway-hosted/tokenized).

## Content & XSS (guide §32)
- Blog/correspondence HTML sanitised server-side (jsoup allow-list, replacing
  `sanitize-html`). Angular never uses `innerHTML` with untrusted content and
  does not bypass sanitisation.

## Logging & audit (guide §25/§27)
- Structured logs with `traceId`; never logs passwords, tokens, payment
  credentials or unnecessary PII.
- Audit trail records userId/action/entity/timestamp/IP/traceId for sensitive
  actions (case/document/payment/user/role changes). Audit records are not
  casually editable by ordinary users.

## Configuration & secrets (guide §44)
- No secrets in Git; env / AWS Secrets Manager. Separate dev/test/staging/prod
  config. The junk `fs` npm dependency and static-file blog generation are **not**
  reproduced.

## Legacy findings addressed
| Finding | Resolution |
|---|---|
| Role-only checks on some resources | Add object-level authz in services |
| Static blog files on disk | DB-backed Thymeleaf SSR (container-safe) |
| `.env` in repo tree | Externalised config; documented env vars |
| Direct entity exposure | DTO boundary everywhere |
| Mixed god-helper | Decomposed into domain services |

## Compliance note
Full WCAG accessibility conformance and penetration testing require manual
testing with assistive technologies / security review and are tracked separately.
