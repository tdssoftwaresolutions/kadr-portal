# DEPLOYMENT.md

Deployment guide for the new Spring Boot + Angular modular monolith
(`Kadr on Java/`). One Docker image → AWS EC2.

> The legacy Node/Vue app remains deployable during migration (guide §46/§56).
> This document covers the target platform.

---

## Build & run

### Local (JDK 21 required)
```bash
# Backend (from "Kadr on Java/backend")
JAVA_HOME=<jdk-21-home> ./mvnw spring-boot:run

# Frontend (from "Kadr on Java/frontend") - dev server proxies /api to :8080
npm install
npm start   # http://localhost:4200
```

### One artifact via Docker (from "Kadr on Java/")
```bash
docker build -t kadr-platform:latest .
docker run -p 8080:8080 --env-file .env kadr-platform:latest
```
The image builds Angular, packages it into the Spring Boot jar (served at
`/admin`), builds the fat jar, and runs on a minimal JRE 21 as a non-root user.
No Node.js at runtime.

Endpoints when running:
- `http://localhost:8080/api/v1/**` — REST API
- `http://localhost:8080/admin/` — Angular app
- `http://localhost:8080/` — public website (Thymeleaf, once migrated)
- `http://localhost:8080/actuator/health` — health
- `http://localhost:8080/swagger-ui.html` — OpenAPI UI

---

## Environment variables

| Variable | Purpose | Required |
|---|---|---|
| `SPRING_PROFILES_ACTIVE` | `dev`/`prod` | prod |
| `DATABASE_JDBC_URL` | MySQL JDBC URL | yes |
| `DATABASE_USERNAME` / `DATABASE_PASSWORD` | DB creds | yes |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | JWT signing secrets (≥32 bytes) | yes |
| `JWT_ACCESS_TTL` / `JWT_REFRESH_TTL` / `JWT_MOBILE_REFRESH_TTL` | token TTLs (s) | no |
| `COOKIE_SECURE` | `true` behind HTTPS | prod |
| `COOKIE_SAME_SITE` | `Lax`/`Strict`/`None` | no |
| `CORS_ALLOWED_ORIGINS` | comma-separated origins | yes |
| `S3_BUCKET_NAME` (or `AWS_S3_BUCKET`) | private document bucket; enables S3 storage + PDF | when docs enabled |
| `S3_REGION` (or `AWS_REGION`) | S3 region | when docs enabled |
| `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` | S3 creds; omit to use EC2 instance role | optional |
| `S3_PRESIGN_EXPIRY` | presigned URL validity in seconds (default 3600) | no |
| `SMTP_HOST`/`SMTP_PORT`/`SMTP_USERNAME`/`SMTP_PASSWORD` | email (Spring Mail) | when email enabled |
| `NOTIFICATION_EMAIL_FROM` | from-address for outbound notifications | when email enabled |
| `JPA_DDL_AUTO` | Hibernate ddl-auto; default `none` (Flyway owns schema). Set `validate` for drift checks | no |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google login/calendar | when enabled |
| `PAYMENT_GATEWAY` | active gateway: `payu`/`cashfree`/`phonepe` | when payments enabled |
| `PORTAL_APP_URL` | portal base URL for payment return redirects | when payments enabled |
| `PAYU_MERCHANT_KEY` / `PAYU_MERCHANT_SALT` / `PAYU_ENV` | PayU credentials | when PayU active |
| `CASHFREE_CLIENT_ID` / `CASHFREE_CLIENT_SECRET` / `CASHFREE_ENV` | Cashfree creds | when Cashfree active |
| `PHONEPE_MERCHANT_ID` / `PHONEPE_SALT_KEY` / `PHONEPE_SALT_INDEX` / `PHONEPE_ENV` | PhonePe creds | when PhonePe active |
| `BASE_URL` | public base URL | prod |
| `WEBSITE_CONTACT_API_KEY` | optional shared secret gating the public contact form (anti-spam) | no |
| `PORT` | listen port (default 8080) | no |

Secrets come from the environment / AWS Secrets Manager — never committed
(guide §44). Payment gateway secrets are added per gateway as payments are migrated.

---

## Database & Flyway

- Schema is managed by **Flyway** (`backend/src/main/resources/db/migration`).
- On first run against an **existing** production DB, Flyway `baseline-on-migrate`
  adopts it at V1 without recreating tables (see DATABASE_MIGRATION.md).
- `spring.jpa.hibernate.ddl-auto=validate` fails fast on entity/schema drift.
- **Always back up MySQL (`mysqldump`) before the first migration.**

---

## Health checks (guide §47)

- Liveness: `GET /actuator/health/liveness`
- Readiness: `GET /actuator/health/readiness` (includes DB)
- Docker `HEALTHCHECK` targets readiness. Sensitive actuator endpoints are not
  exposed publicly (`management.endpoints.web.exposure.include=health,info`).

---

## AWS EC2 deployment (initial single instance)

1. Provision EC2 (Amazon Linux 2023), install Docker.
2. Provide `.env` with production secrets (or use SSM/Secrets Manager).
3. `docker build` (or pull from ECR) and `docker run -d -p 80:8080 ...` behind
   an ALB terminating TLS. Set `COOKIE_SECURE=true`.
4. Point RDS/MySQL via `DATABASE_JDBC_URL`. Ensure the S3 bucket is **private**.
5. Scale out later behind a load balancer — the app is stateless (JWT, S3, DB),
   so no code change is needed (guide §28). No Redis.

---

## Rollback

- Keep the previous image tag; `docker run` the prior tag to roll back the app.
- DB: Flyway migrations are additive; destructive changes ship with a documented
  down/restore step and a pre-migration backup. During transition the legacy app
  stays compatible with the baselined schema, enabling app-level rollback.
