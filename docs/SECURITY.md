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

## Data security at rest (P0 data — implemented in the Node/Prisma backend)

Sensitive ("P0") data is protected at rest using two primitives, both in
`utils/crypto.js`:

- **One-way hashing** for secrets that must never be reversible. Verification
  hashes the incoming value and compares in constant time.
- **Reversible encryption (AES-256-GCM)** for data the application must read
  back. Output is versioned (`enc:v1:<iv>:<tag>:<ciphertext>`, all base64) with
  a random 96-bit IV per value and an authentication tag (tamper detection).

The symmetric key comes from `DATA_ENCRYPTION_KEY` (32 bytes; 64 hex chars or
32-byte base64). It is validated at startup in `config/envValidation.js` and is
**required**.

### What is protected and how

| Data | Model / field | Method | Touch points |
|---|---|---|---|
| Password | `user.password_hash` | bcrypt (pre-existing) | `utils/helper.js` |
| OTP / verification code | `otp_resets.otp` | scrypt hash + secure RNG (`crypto.randomInt`) + attempt limit | `controller/authController.js` |
| Bank account holder / number / IFSC / UPI | `mediator_bank_accounts.*` | AES-256-GCM | `controller/financeController.js` |
| Google OAuth token | `google_connect.google_auth_token` | AES-256-GCM | `utils/helper.js` |
| Payment gateway raw payload | `payment_orders.gateway_response` | AES-256-GCM (JSON) | `services/payment/paymentOrderService.js` |

Deliberately **not** app-encrypted (queried/indexed operational data; protect via
transport TLS + storage/volume encryption + access control instead): `user.email`,
`phone_number`, name, address fields, case content, and payment `metadata`
(`{ productInfo }`, non-sensitive).

### OTP hardening
OTPs are now generated with a CSPRNG (`crypto.randomInt`), stored only as a
scrypt hash, verified in constant time, capped at 5 incorrect attempts
(`OTP_TOO_MANY_ATTEMPTS`), and expire after 10 minutes. The code is invalidated
on expiry or attempt-limit breach.

### Display masking
Bank account numbers are masked (last 4 shown) in the admin/mediator invoice
**list** view. The full value is decrypted only for the owner's / payout invoice
PDF, which legitimately needs it.

### Schema change
`otp_resets.otp` changed from `Int?` to `VarChar(255)` (to hold the hash), and a
new `attempts Int @default(0)` column was added. Apply with `npm run prisma:push`
(this is a db-push project; there is no migrations directory).

### Backfill / rotation plan
- **OTP:** no backfill needed — existing rows are short-lived; expire or delete
  them (`DELETE FROM otp_resets;`) after deploy. New OTPs are hashed automatically.
- **Bank accounts / Google token / gateway responses:** `decrypt()` passes
  legacy plaintext through unchanged, so reads keep working during a gradual
  backfill. Run a one-time script that reads each row, re-writes it through the
  encrypting write path, and confirms `isEncrypted()` before removing plaintext.
- **Key rotation:** rotating `DATA_ENCRYPTION_KEY` makes existing ciphertext
  unreadable. Rotation requires decrypting with the old key and re-encrypting
  with the new key; the `enc:v1:` version marker exists to support a future
  multi-key scheme.

## Compliance note
Full WCAG accessibility conformance and penetration testing require manual
testing with assistive technologies / security review and are tracked separately.
