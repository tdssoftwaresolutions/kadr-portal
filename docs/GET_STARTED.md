# Get Started — Kadr Portal

Step-by-step guide to run Kadr Portal locally with Docker, expose it with ngrok, and deploy on AWS EC2.

---

## What you need

| Requirement | Local Docker | AWS EC2 |
|-------------|--------------|---------|
| Docker Desktop or Docker Engine | Yes | Yes |
| Docker Compose v2 | Yes | Yes |
| Git | Yes | Yes |
| 4 GB+ RAM | Recommended | t3.small or larger |
| Domain (optional) | No | Recommended for production |
| ngrok account (optional) | For payment webhooks / public URL | — |

---

## 1. Local setup with Docker

### Step 1 — Clone and configure

```bash
git clone <your-repo-url> kadr-portal
cd kadr-portal

cp .env.docker.example .env
```

Edit `.env` and at minimum confirm these values:

```bash
BASE_URL=http://localhost:3000
PORTAL_APP_URL=http://localhost:3000/admin
COOKIE_SECURE=0          # required for HTTP localhost login
DATABASE_URL=mysql://kadr:kadr@db:3306/kadr_portal
```

Generate strong secrets for production-like testing (optional locally, required on EC2):

```bash
# macOS / Linux — example
openssl rand -hex 32   # use output for SECRET_KEY
openssl rand -hex 32   # REFRESH_SECRET_KEY
openssl rand -hex 32   # SIGN_SECRET_KEY
```

### Step 2 — Start the stack

```bash
npm run docker:up
```

This builds the API image (Vue admin SPA + marketing site), starts MySQL, applies the database schema via `prisma db push`, and starts the server.

Wait until you see logs like:

```
api  | [docker] Starting Kadr Portal...
api  | API running on http://localhost:3000
```

### Step 3 — Verify health

```bash
curl http://localhost:3000/health/ready
```

Expected response:

```json
{"status":"ready","database":"ok"}
```

Open in browser:

| URL | Purpose |
|-----|---------|
| http://localhost:3000/admin/ | Admin / client / mediator portal |
| http://localhost:3000/ | Marketing website |
| http://localhost:3000/admin/auth/sign-in | Sign in |

### Step 4 — Create the first admin user

There is no default login. Create a **master admin** once:

```bash
npm run docker:create-admin -- admin@example.com 'YourPassword123' 'Admin Name'
```

Or set in `.env` and run:

```bash
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=YourPassword123
ADMIN_NAME=Master Admin
npm run docker:create-admin
```

Sign in at http://localhost:3000/admin/auth/sign-in with that email and password.

### Step 5 — Stop / restart

```bash
npm run docker:down          # stop containers
npm run docker:up:detached   # run in background
npm run docker:logs          # follow API logs
```

---

## 2. Database setup

### How it works in Docker

- **MySQL 8** runs as the `db` service in `docker-compose.yml`.
- Credentials (default dev): user `kadr`, password `kadr`, database `kadr_portal`.
- Data persists in the Docker volume `kadr_mysql_data`.
- On every API start, `docker/docker-entrypoint.sh` runs `prisma db push` to sync the schema.

You do **not** need to install MySQL locally or run Prisma commands manually for the default Docker workflow.

### Reset the database (local dev)

```bash
docker compose down -v    # removes volumes — deletes all data
docker compose up --build
npm run docker:create-admin -- admin@example.com 'YourPassword123'
```

### Connect to MySQL directly (optional)

```bash
docker compose exec db mysql -ukadr -pkadr kadr_portal
```

Port `3306` is exposed on localhost in the default compose file (not in production overlay).

### External database (RDS on AWS)

Point `DATABASE_URL` in `.env` to your RDS instance and remove or disable the `db` service:

```bash
DATABASE_URL=mysql://user:password@your-rds-endpoint.ap-south-1.rds.amazonaws.com:3306/kadr_portal
```

Run only the API container, or use a custom compose override without the `db` service.

---

## 3. ngrok — expose localhost publicly

Use ngrok when you need a public HTTPS URL for:

- Payment gateway return URLs and webhooks (PayU, Cashfree, PhonePe)
- Sharing the app with someone outside your network
- Testing OAuth callbacks

### Step 1 — Start Docker

```bash
npm run docker:up:detached
```

### Step 2 — Install and authenticate ngrok

```bash
# macOS
brew install ngrok

# Or download from https://ngrok.com/download
ngrok config add-authtoken <your-ngrok-authtoken>
```

### Step 3 — Start the tunnel

```bash
ngrok http 3000
```

Copy the **HTTPS** forwarding URL, e.g. `https://abc123.ngrok-free.app`.

### Step 4 — Update `.env` and rebuild

The Vue app embeds `BASE_URL` at **build time**, so you must rebuild after changing the public URL:

```bash
# .env
BASE_URL=https://abc123.ngrok-free.app
PORTAL_APP_URL=https://abc123.ngrok-free.app/admin
PUBLIC_WEBSITE_URL=https://abc123.ngrok-free.app
COOKIE_SECURE=1
```

```bash
docker compose up --build -d
```

### Step 5 — Configure payment webhooks (if testing payments)

Add to `.env` from `.env.payment.example`, then set provider dashboards:

| Gateway | Callback URL |
|---------|----------------|
| PayU return | `https://abc123.ngrok-free.app/api/payment/return/payu` |
| Cashfree webhook | `https://abc123.ngrok-free.app/api/payment/webhook/cashfree` |
| PhonePe webhook | `https://abc123.ngrok-free.app/api/payment/webhook/phonepe` |

See [PAYMENTS.md](./PAYMENTS.md) for credential setup.

### ngrok notes

- Free ngrok URLs change each restart — update `.env` and rebuild when the URL changes.
- Always use the **HTTPS** URL for `BASE_URL`, not the HTTP one.
- Keep ngrok running while testing external callbacks.

---

## 4. AWS EC2 deployment with Docker

### Step 1 — Launch EC2 instance

1. **AMI:** Ubuntu 22.04 LTS (or Amazon Linux 2023)
2. **Instance type:** `t3.small` minimum (2 GB RAM; `t3.medium` recommended if PDF generation is heavy)
3. **Storage:** 20 GB+ gp3
4. **Security group inbound rules:**

| Port | Source | Purpose |
|------|--------|---------|
| 22 | Your IP | SSH |
| 80 | 0.0.0.0/0 | HTTP (nginx) |
| 443 | 0.0.0.0/0 | HTTPS (nginx) |
| 3000 | Your IP only (optional) | Direct API access during setup |

Do **not** expose MySQL (3306) to the internet.

### Step 2 — Install Docker on EC2

SSH into the instance:

```bash
ssh -i your-key.pem ubuntu@<ec2-public-ip>
```

**Ubuntu:**

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl git
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
newgrp docker
docker compose version
```

### Step 3 — Deploy the application

```bash
git clone <your-repo-url> kadr-portal
cd kadr-portal

cp .env.docker.example .env
nano .env
```

Set production values:

```bash
BASE_URL=https://yourdomain.com
PORTAL_APP_URL=https://yourdomain.com/admin
PUBLIC_WEBSITE_URL=https://yourdomain.com
COOKIE_SECURE=1

SECRET_KEY=<openssl rand -hex 32>
REFRESH_SECRET_KEY=<openssl rand -hex 32>
SIGN_SECRET_KEY=<openssl rand -hex 32>

# S3 for uploads (recommended)
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
S3_BUCKET_NAME=
S3_REGION=ap-south-1

# Email (recommended)
EMAIL_USER=
EMAIL_PASSWORD=
EMAIL_FROM=noreply@yourdomain.com

# Payment + contact form — see .env.payment.example
WEBSITE_CONTACT_API_KEY=<random-string>
```

Start with production overlay (MySQL not exposed on host):

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up --build -d
```

### Step 4 — Create master admin on EC2

```bash
docker compose exec api node scripts/createMasterAdmin.js admin@yourdomain.com 'StrongPassword123!' 'Master Admin'
```

### Step 5 — Reverse proxy with nginx + TLS

Install nginx and Certbot on the EC2 host (not inside the API container):

```bash
sudo apt-get install -y nginx certbot python3-certbot-nginx
```

Create `/etc/nginx/sites-available/kadr`:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        client_max_body_size 10m;
    }
}
```

Enable and obtain TLS certificate:

```bash
sudo ln -s /etc/nginx/sites-available/kadr /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

Rebuild after setting `BASE_URL` to your domain:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up --build -d
```

### Step 6 — Verify production

```bash
curl https://yourdomain.com/health/ready
```

Open:

- https://yourdomain.com/admin/
- https://yourdomain.com/

### EC2 maintenance commands

```bash
# View logs
docker compose logs -f api

# Restart after .env changes (rebuild if BASE_URL changed)
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

# Update code
git pull
docker compose -f docker-compose.yml -f docker-compose.prod.yml up --build -d
```

---

## 5. Optional services checklist

Configure these in `.env` when you need the related features.

| Feature | Environment variables | Required for |
|---------|----------------------|--------------|
| File uploads | `S3_*` | Profile pictures, certificates, documents |
| Email | `EMAIL_*` | Password reset, welcome emails, notifications |
| Contact form | `WEBSITE_CONTACT_API_KEY` | Marketing site lead capture |
| Payments | `PAYMENT_GATEWAY`, provider keys | Client fees, Mediator Pro |
| Google Calendar | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Calendar sync |
| Zoom | `ZOOM_*` | Video meetings |
| WhatsApp | `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_API_VERSION` | OTP and notifications (Meta Cloud API) |

Copy payment keys from `.env.payment.example` into `.env`.

---

## 6. Environment variable reference

### Required (app will not start without these)

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | MySQL connection string |
| `SECRET_KEY` | JWT access token signing |
| `REFRESH_SECRET_KEY` | JWT refresh token signing |
| `SIGN_SECRET_KEY` | Agreement signature HMAC |

### Required for correct URLs

| Variable | Description |
|----------|-------------|
| `BASE_URL` | Public API/site root (used in emails, webhooks, builds) |
| `PORTAL_APP_URL` | Vue admin base URL, e.g. `https://domain.com/admin` |

### Docker-specific

| Variable | Default | Description |
|----------|---------|-------------|
| `SERVE_ADMIN_STATIC` | `1` | Serve built Vue app at `/admin` |
| `SERVE_WEBSITE_STATIC` | `1` | Serve marketing site at `/` |
| `COOKIE_SECURE` | `0` local / `1` HTTPS | Secure cookie flag for auth |

---

## 7. Troubleshooting

### `env_file .env not found`

```bash
cp .env.docker.example .env
```

### Login works once then session drops (local HTTP)

Set `COOKIE_SECURE=0` in `.env` and restart:

```bash
docker compose up -d
```

For ngrok/HTTPS, set `COOKIE_SECURE=1` and use an `https://` `BASE_URL`.

### Blank admin page or broken assets after URL change

Rebuild — `BASE_URL` is baked into the Vue build:

```bash
docker compose up --build -d
```

### Database connection failed

```bash
docker compose ps
docker compose logs db
docker compose logs api
```

Ensure `db` is healthy before `api` starts. Wait 30–60 seconds on first boot.

### Payment webhooks not received

1. Confirm ngrok or public domain is HTTPS
2. Confirm `BASE_URL` matches the tunnel/domain
3. Rebuild containers after changing `BASE_URL`
4. Check `docker compose logs api` for webhook requests

### PDF generation fails in Docker

The production image includes Chromium for Puppeteer. If PDFs fail, check API logs for Puppeteer errors and ensure the container has enough memory.

---

## 8. Quick command reference

```bash
# Local
cp .env.docker.example .env
npm run docker:up
npm run docker:create-admin -- admin@example.com 'Password123'
curl http://localhost:3000/health/ready

# ngrok
ngrok http 3000
# update BASE_URL in .env, then:
docker compose up --build -d

# EC2 production
docker compose -f docker-compose.yml -f docker-compose.prod.yml up --build -d
docker compose exec api node scripts/createMasterAdmin.js admin@domain.com 'Password123'
```

---

## Related docs

- [README.md](../README.md) — project overview
- [PAYMENTS.md](./PAYMENTS.md) — PayU, Cashfree, PhonePe setup
- [IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md) — feature status and deploy checklist
- [MOBILE.md](./MOBILE.md) — Capacitor mobile apps
