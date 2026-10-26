# EC2 deployment runbook (kadr.live)

How kadr.live is actually deployed today, how to ship new code, and how to
rebuild the whole server from scratch on a new EC2 instance.

> This describes the **bare-metal EC2 + pm2 + nginx** setup that runs kadr.live.
> The Docker instructions in [GET_STARTED.md](GET_STARTED.md) are an alternative
> that is **not** what production uses. [DEPLOYMENT.md](DEPLOYMENT.md) is about
> the planned Java rewrite and does not apply to this app.

**Contents**

1. [Architecture at a glance](#1-architecture-at-a-glance)
2. [Routine deploy (shipping new code)](#2-routine-deploy-shipping-new-code)
3. [Building a new server from scratch](#3-building-a-new-server-from-scratch)
4. [Environment variables (.env)](#4-environment-variables-env)
5. [Database](#5-database)
6. [nginx configuration](#6-nginx-configuration)
7. [External services to update when the server changes](#7-external-services-to-update-when-the-server-changes)
8. [Moving to a new EC2 instance — checklist](#8-moving-to-a-new-ec2-instance--checklist)
9. [Verifying a deployment](#9-verifying-a-deployment)
10. [Rollback](#10-rollback)
11. [Troubleshooting](#11-troubleshooting)

---

## 1. Architecture at a glance

```
                    Internet (HTTPS :443, HTTP :80 → redirect)
                                   │
                              ┌────▼────┐
                              │  nginx  │  TLS (Let's Encrypt), gzip, HTTP/2
                              └────┬────┘
        ┌───────────────┬──────────┼──────────────────────┬──────────────┐
        │ /admin/*      │ /        │ /blog/*              │ /api/*       │
        ▼               ▼          ▼                      ▼              │
  dist/ (built     public/website  public/website,   Node/Express :3000  │
  Vue admin SPA,   (marketing      falls back to     (pm2: kadr-api)     │
  served from      site, static)   backend           backend/server.js   │
  disk by nginx)                                           │             │
                                                           ▼             │
                         MySQL 8 (DATABASE_URL) · S3 (uploads) · SMTP · Zoom ·
                         Google OAuth/Calendar · Cashfree/PhonePe · WhatsApp · PostHog
```

| Piece | Where | Notes |
|---|---|---|
| App code | `/var/www/kadr-portal` (git clone) | Repo `github.com/tdssoftwaresolutions/kadr-portal` |
| Backend | `node backend/server.js` under **pm2**, name `kadr-api`, port 3000 | Reads `.env` from the app folder |
| Admin SPA | `/var/www/kadr-portal/dist/` | Built on the server with `npm run build`; served by nginx at `/admin/` |
| Marketing site | `/var/www/kadr-portal/public/website/` | Static HTML served by nginx at `/` |
| Database | MySQL 8 | Schema managed by Prisma (`db/prisma/schema.prisma`) — no migration files, uses `prisma db push` |
| Schedulers | Inside the backend process | Reminders/notices (node-cron). Guarded by a DB lock, so a second instance won't double-send |
| OS | Amazon Linux 2023 (`ec2-user`) | Commands below use `dnf` |

---

## 2. Routine deploy (shipping new code)

### 2.1 On your machine — push the code

```bash
git status                       # review what's changing
git add <files>
git commit -m "Describe the change"
git push origin <branch>         # the branch the server deploys from (currently migration/vue3)
```

`dist/`, `node_modules/` and `package-lock.json` are gitignored — the server
builds them itself. Never commit `.env`.

### 2.2 On the server — pull, build, restart

```bash
ssh -i <key>.pem ec2-user@kadr.live
cd /var/www/kadr-portal

git pull origin <branch>
npm install                       # also runs `prisma generate` (postinstall)
npm run build                     # production admin build → dist/
pm2 restart kadr-api --update-env
```

That's all for a normal code change. Extra steps only when the change needs them:

| The change includes… | Also run (before `pm2 restart`) |
|---|---|
| New/changed **email** templates in `backend/scripts/seedNotificationTemplates.js` | `npm run seed:notifications` — adds missing templates only. **Don't** add `--force` unless you intend to overwrite templates admins have edited in the panel. |
| New/changed **push** templates | `npm run seed:push-templates` (same `--force` rule) |
| **Database schema** change (`db/prisma/schema.prisma`) | Back up first (§5.4), then `npx prisma db push`. If it warns about data loss, **stop** and review — never pass `--accept-data-loss` on production without a backup and a reason. |
| A new **env var** | Add it to `/var/www/kadr-portal/.env` — `--update-env` picks it up on restart. If it's a `VUE_APP_*` or `BASE_URL` value, re-run `npm run build` too (they're baked into the frontend at build time). |
| nginx config change | `sudo nginx -t && sudo systemctl reload nginx` |

> ⚠️ **Never run `npm run seed:reference-data` against production.** It
> deletes and re-inserts case statuses/events, which **cascade-deletes real
> cases and their history**, and wipes admin-edited notification templates.
> It is only for an empty, brand-new database (§5.2).

No nginx reload is needed for frontend changes — nginx serves `dist/` straight
from disk, and asset filenames are content-hashed, so browsers fetch new files
automatically on next load.

---

## 3. Building a new server from scratch

### 3.1 Launch the instance

- **AMI:** Amazon Linux 2023 (x86_64)
- **Type:** `t3.small` minimum (2 GB RAM). Use `t3.medium` if builds get killed
  or PDF generation (Puppeteer/Chrome) is heavy. Add swap regardless (§3.2).
- **Storage:** 20 GB+ gp3
- **Elastic IP:** allocate one and associate it — DNS and any database IP
  allow-lists point at this address, so it must survive reboots.
- **Security group inbound:**

| Port | Source | Purpose |
|---|---|---|
| 22 | Your IP only | SSH |
| 80 | 0.0.0.0/0, ::/0 | HTTP → HTTPS redirect, Let's Encrypt |
| 443 | 0.0.0.0/0, ::/0 | HTTPS |

Do **not** open 3000 (Node) or 3306 (MySQL) to the internet.

### 3.2 Base packages and swap

```bash
sudo dnf update -y
sudo dnf install -y git nginx tar gzip

# 2 GB swap so `npm run build` doesn't get OOM-killed on small instances
sudo dd if=/dev/zero of=/swapfile bs=1M count=2048
sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile swap swap defaults 0 0' | sudo tee -a /etc/fstab

# Server clock in IST isn't required (the app uses APP_TIMEZONE), but keeps logs readable
sudo timedatectl set-timezone Asia/Kolkata
```

### 3.3 Node.js 22 and pm2

`package.json` requires Node **22.x**.

```bash
sudo dnf install -y nodejs22 nodejs22-npm
node -v        # must print v22.x
```

If `nodejs22` isn't available in your AMI's repos, install via nvm instead
(`https://github.com/nvm-sh/nvm`), then `nvm install 22 && nvm alias default 22`.

```bash
sudo npm install -g pm2
pm2 install pm2-logrotate           # keeps ~/.pm2/logs from filling the disk
```

### 3.4 Google Chrome (for PDF generation)

The mediation agreement PDF is rendered with Puppeteer, which needs a real
Chrome and its shared libraries (see [TROUBLESHOOTING.md](TROUBLESHOOTING.md)).

```bash
sudo tee /etc/yum.repos.d/google-chrome.repo <<'EOF'
[google-chrome]
name=google-chrome
baseurl=https://dl.google.com/linux/chrome/rpm/stable/x86_64
enabled=1
gpgcheck=1
gpgkey=https://dl.google.com/linux/linux_signing_key.pub
EOF
sudo dnf install -y google-chrome-stable
```

and set `PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable` in `.env`.

### 3.5 Certbot (Let's Encrypt)

Amazon Linux 2023 has no certbot package; install it in a virtualenv (the
method certbot documents for pip installs):

```bash
sudo dnf install -y python3 augeas-libs
sudo python3 -m venv /opt/certbot
sudo /opt/certbot/bin/pip install --upgrade pip
sudo /opt/certbot/bin/pip install certbot certbot-nginx
sudo ln -sf /opt/certbot/bin/certbot /usr/bin/certbot

# Auto-renew twice a day
echo "0 0,12 * * * root /opt/certbot/bin/python -c 'import random, time; time.sleep(random.random() * 3600)' && certbot renew -q && systemctl reload nginx" \
  | sudo tee /etc/cron.d/certbot-renew
sudo dnf install -y cronie && sudo systemctl enable --now crond
```

### 3.6 Get the code

```bash
sudo mkdir -p /var/www && sudo chown ec2-user:ec2-user /var/www
cd /var/www
git clone https://github.com/tdssoftwaresolutions/kadr-portal.git
cd kadr-portal
git checkout <branch>     # currently migration/vue3
```

The repo is private: authenticate with a GitHub **deploy key** (read-only SSH
key added under the repo's Settings → Deploy keys) or a fine-grained personal
access token. A deploy key is preferable — it's scoped to this one repo.

### 3.7 Create `.env`

Copy `.env` from the old server (safest — see §4 for what must match), or
create it from §4. Then:

```bash
chmod 600 /var/www/kadr-portal/.env
```

### 3.8 Install, prepare the database, build

```bash
cd /var/www/kadr-portal
npm install                 # installs deps + runs `prisma generate`
```

Then **either** connect to the existing database (moving servers — just make
sure the new Elastic IP is allowed to reach it, §5.3) **or** set up a new one
(§5.2). After the database is reachable:

```bash
npm run build               # admin SPA → dist/
```

### 3.9 Start the backend with pm2

```bash
cd /var/www/kadr-portal
pm2 start backend/server.js --name kadr-api --cwd /var/www/kadr-portal
pm2 save                    # remember the process list
pm2 startup systemd         # prints a `sudo env PATH=... pm2 startup ...` command — run it
curl -s http://127.0.0.1:3000/health/ready    # → {"status":"ready","database":"ok"}
```

`--cwd` matters: the backend loads `.env` from its working directory.

### 3.10 nginx + TLS

Set up nginx as in §6, then:

```bash
sudo systemctl enable --now nginx
sudo certbot --nginx -d kadr.live -d www.kadr.live
sudo nginx -t && sudo systemctl reload nginx
```

Certbot only succeeds once DNS points at this instance (§8). For a dry run
before cutover, test against the Elastic IP with `curl -k --resolve`.

---

## 4. Environment variables (.env)

Lives at `/var/www/kadr-portal/.env` (never committed). The backend validates
it on startup (`backend/config/envValidation.js`) and refuses to start if a
**required** value is missing.

> 🔑 **When moving servers, copy `.env` byte-for-byte from the old server.**
> In particular `DATA_ENCRYPTION_KEY` **must be identical** — it encrypts
> personal data at rest in the database; a different key makes that data
> unreadable. Changing `SECRET_KEY`/`REFRESH_SECRET_KEY` logs everyone out;
> changing `SIGN_SECRET_KEY` invalidates outstanding signing links.

### Required

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | `mysql://USER:PASSWORD@HOST:3306/DBNAME` |
| `SECRET_KEY` | JWT access-token secret (≥32 random chars) |
| `REFRESH_SECRET_KEY` | JWT refresh-token secret |
| `SIGN_SECRET_KEY` | Signing-link secret |
| `DATA_ENCRYPTION_KEY` | AES-256 key, 64 hex chars. **Never regenerate on an existing DB.** |

Generate new secrets (new installs only):
`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

### Core runtime

| Variable | Production value |
|---|---|
| `NODE_ENV` | `production` |
| `PORT` | `3000` |
| `HOST` | `127.0.0.1` (only nginx needs to reach it) |
| `BASE_URL` | `https://kadr.live` — no trailing slash. **Also used at build time** for asset URLs and the Google OAuth callback. |
| `COOKIE_SECURE` | `1` |
| `TRUST_PROXY` | `1` (one nginx hop) |
| `APP_TIMEZONE` | `Asia/Kolkata` |
| `SERVE_ADMIN_STATIC` / `SERVE_WEBSITE_STATIC` | `1` — harmless fallback; nginx serves these first |
| `KADR_STRICT_ADMIN_PERMISSIONS` | `1` |
| `ALLOW_FAKE_PAYMENTS` | `0` in production |
| `PUPPETEER_EXECUTABLE_PATH` | `/usr/bin/google-chrome-stable` |
| `ALERT_TECH_TEAM_EMAILS` | Comma-separated emails for crash / failure alerts |

### Frontend build-time

| Variable | Purpose |
|---|---|
| `VUE_APP_GOOGLE_CLIENT_ID` | Google Sign-In client id baked into the admin bundle. Change → rebuild. |

### Integrations

| Area | Variables |
|---|---|
| File storage (S3) | `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_BUCKET_NAME`, `S3_REGION` |
| Email (SMTP) | `EMAIL_PROVIDER=smtp`, `EMAIL_SMTP_HOST`, `EMAIL_SMTP_PORT`, `EMAIL_SMTP_SECURE`, `EMAIL_USER`, `EMAIL_PASSWORD`, `EMAIL_FROM` |
| Google OAuth / Calendar | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` |
| Zoom | `ZOOM_ACCOUNT_ID`, `ZOOM_CLIENT_ID`, `ZOOM_CLIENT_SECRET` |
| Payments | `PAYMENT_GATEWAY`, `CASHFREE_CLIENT_ID`, `CASHFREE_CLIENT_SECRET`, `CASHFREE_ENV`, `CASHFREE_WEBHOOK_SECRET`, `PAYMENT_MEDIATION_FEE_INR`, `PAYMENT_NOTICE_FEE_INR` (PhonePe/PayU vars if used — see [PAYMENTS.md](PAYMENTS.md)) |
| WhatsApp | `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_API_VERSION`, `WHATSAPP_PHONE_NUMBER_ID` |
| eCourts | `ECOURTS_INDIA_API_KEY` |
| Analytics | `POSTHOG_ENABLED`, `POSTHOG_API_KEY`, `POSTHOG_HOST`, `POSTHOG_DISABLE_GEOIP` |
| Website contact form | `WEBSITE_CONTACT_API_KEY` |

Web Push VAPID keys are **not** in `.env` — they're stored in the database
(PUSH channel settings), so they move with the database.

After editing `.env`: `pm2 restart kadr-api --update-env`.

---

## 5. Database

**Engine:** MySQL 8 (Prisma `provider = "mysql"`). The schema lives in
`db/prisma/schema.prisma`; there are **no migration files** — the schema is
applied with `npx prisma db push`, which diffs the live DB against the schema.

### 5.1 Where it is

Check the host in `DATABASE_URL` in the server's `.env`. If it's an external
managed MySQL (e.g. Hostinger `*.hstgr.io` or AWS RDS), **moving EC2 does not
move the database** — you only need to allow the new server's IP (§5.3).

### 5.2 Brand-new database (empty)

```bash
# 1. Create database + user (run in the MySQL server's admin console)
CREATE DATABASE kadr_portal CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'kadr'@'%' IDENTIFIED BY '<strong-password>';
GRANT ALL PRIVILEGES ON kadr_portal.* TO 'kadr'@'%';

# 2. On the app server, with DATABASE_URL set in .env, plus the first admin's
#    login (seed:reference-data refuses to run without ADMIN_PASSWORD):
#      ADMIN_EMAIL=admin@kadr.live
#      ADMIN_PASSWORD=<at least 8 chars>
cd /var/www/kadr-portal
npx prisma db push                    # create all tables
npm run seed:reference-data           # ⚠️ EMPTY DB ONLY — statuses, events, languages, templates, master admin
npm run seed:notifications            # email templates
npm run seed:push-templates           # push templates
npm run seed:case-split               # one-time case-event data fix (idempotent)
npm run vapid:generate                # Web Push keys (stored in DB). Never use --force on a live DB.
# Then remove ADMIN_PASSWORD from .env — it's only needed for seeding.
# To add another admin later: npm run create-admin -- other@kadr.live 'StrongPassword!' 'Name'
```

### 5.3 Existing database, new server

- **External MySQL with an IP allow-list** (Hostinger "Remote MySQL", RDS
  security group, etc.): add the new server's **Elastic IP**, and remove the
  old one after cutover.
- Test from the new server before going live:
  ```bash
  cd /var/www/kadr-portal && npx prisma db pull --print | head -5
  ```
  (read-only; prints the introspected schema if the connection works).
- Don't run any seed scripts — the data is already there.

### 5.4 Backups

Before any schema change or server move:

```bash
mysqldump --single-transaction --routines --triggers \
  -h <host> -u <user> -p <dbname> | gzip > kadr-$(date +%F-%H%M).sql.gz
```

Restore into an empty database: `gunzip -c file.sql.gz | mysql -h <host> -u <user> -p <dbname>`.

To move the database itself (e.g. to RDS), dump from the old host, restore
into the new one, update `DATABASE_URL`, then `pm2 restart kadr-api --update-env`.

---

## 6. nginx configuration

Two files:

1. **`deploy/nginx/kadr-admin-static.conf`** (in the repo) — gzip settings and
   a `map` that picks the `Cache-Control` header per URL. Included **outside**
   the `server` block (a `map` must be declared before it's used).
2. **The site config** — on kadr.live this is `kadr-portal.conf` in
   `/etc/nginx/conf.d/`.

`/etc/nginx/conf.d/kadr-portal.conf`:

```nginx
# gzip + $kadr_admin_cache_control (must come before the server blocks)
include /var/www/kadr-portal/deploy/nginx/kadr-admin-static.conf;

server {
    server_name kadr.live www.kadr.live;

    # Uploads mostly go browser → S3 directly, but some API calls carry base64
    # files; the backend accepts up to 4 MB (REQUEST_BODY_LIMIT), nginx's
    # default is 1 MB.
    client_max_body_size 5m;

    # ---------- ADMIN SPA ----------
    location = /admin {
        return 301 /admin/;
    }

    # Never serve source maps publicly (they expose the original source).
    location ~ ^/admin/.*\.map$ {
        return 404;
    }

    location /admin/ {
        alias /var/www/kadr-portal/dist/;
        try_files $uri $uri/ /admin/index.html;
        # Hashed js/css/fonts: cache 1 year. index.html & the rest: no-cache.
        add_header Cache-Control $kadr_admin_cache_control;
    }

    # ---------- PUBLIC WEBSITE BLOGS ----------
    location /blog/ {
        root /var/www/kadr-portal/public/website;
        try_files $uri $uri.html @backend;
    }

    # ---------- BACKEND FALLBACK ----------
    location @backend {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # ---------- PUBLIC WEBSITE ----------
    location / {
        root /var/www/kadr-portal/public/website;
        index index.html;
        try_files $uri $uri.html $uri/ =404;
    }

    # ---------- API ----------
    # Server-sent events (/api/...) send a keepalive every 30s and set
    # X-Accel-Buffering: no, so the defaults below are enough.
    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    listen 443 ssl;   # managed by Certbot
    http2 on;
    # ssl_certificate / ssl_certificate_key / include options-ssl-nginx.conf /
    # ssl_dhparam lines are added by `certbot --nginx`.
}

server {
    listen 80;
    server_name kadr.live www.kadr.live;
    # certbot --nginx turns this into a redirect to https
    return 404;
}
```

**Before certbot has run** (new server), temporarily use `listen 80;` in the
first block and drop the `listen 443`/`http2` lines — certbot rewrites the
file to add TLS and the redirect.

**Gotchas**

- `"gzip" directive is duplicate` → the main `/etc/nginx/nginx.conf` already
  has `gzip on;`. Comment out `gzip on;` in the snippet (the other gzip
  settings can stay).
- `unknown "kadr_admin_cache_control" variable` → the `include` line is
  missing or sits below the `server` block that uses it.
- nginx needs read access to `/var/www/kadr-portal/dist` and `public/website`
  (default permissions from `git clone` + `npm run build` as `ec2-user` are fine).
- Only use the one-year `immutable` cache with the production build
  (`npm run build`), which content-hashes filenames.

Apply changes: `sudo nginx -t && sudo systemctl reload nginx`.

---

## 7. External services to update when the server changes

If the **domain stays kadr.live**, most of these don't change — but check each.

| Service | What to check/update |
|---|---|
| **DNS** (registrar) | `A` records for `kadr.live` and `www` → new Elastic IP. Lower TTL to 300 a day before cutover. |
| **Database allow-list** | New Elastic IP allowed (Hostinger Remote MySQL / RDS security group). |
| **Google Cloud Console** (OAuth client) | Authorized redirect URI `https://kadr.live/api/googleCallback`; authorized JS origin `https://kadr.live`. Only changes if the domain changes. |
| **Cashfree / PhonePe dashboards** | Webhook URLs `https://kadr.live/api/payment/webhook/cashfree` and `/api/payment/webhook/phonepe`. Only changes if the domain changes. |
| **S3 bucket CORS** | Browsers upload directly to S3 via presigned URLs, so the bucket's CORS must allow `PUT` from `https://kadr.live`. |
| **IAM** | If S3 access uses an instance role instead of keys, attach the same role to the new instance. |
| **SMTP provider** | Some providers restrict sending by IP — allow the new one if so. |
| **Zoom / WhatsApp / eCourts / PostHog** | API-key based; nothing to change unless they IP-restrict. |
| **GitHub** | Add a deploy key for the new server; remove the old server's key after decommissioning. |

---

## 8. Moving to a new EC2 instance — checklist

**Prepare (old server still live)**
- [ ] Copy `/var/www/kadr-portal/.env` from the old server to a safe place.
- [ ] Note the deployed branch/commit: `git -C /var/www/kadr-portal log -1 --oneline`.
- [ ] Copy the old nginx site file (`/etc/nginx/conf.d/kadr-portal.conf`) for reference.
- [ ] Take a database backup (§5.4).
- [ ] Lower DNS TTL to 300s.

**Build the new server**
- [ ] Launch instance + Elastic IP + security group (§3.1).
- [ ] Packages, swap, Node 22, pm2, Chrome, certbot (§3.2–3.5).
- [ ] Clone the repo, checkout the same branch/commit (§3.6).
- [ ] Put the old `.env` in place, `chmod 600` (§3.7).
- [ ] Allow the new Elastic IP on the database (§5.3) and test the connection.
- [ ] `npm install && npm run build` (§3.8).
- [ ] Start with pm2, `pm2 save`, `pm2 startup` (§3.9). `curl 127.0.0.1:3000/health/ready` says ready.
- [ ] nginx site config with **`listen 80` only** for now (§6); `sudo nginx -t`.

**Cut over**
- [ ] **Stop the old server's app** (`pm2 stop kadr-api`) — two servers running
      the schedulers against the same DB is mostly safe thanks to the DB lock,
      but stopping avoids any double emails/webhooks during the switch.
- [ ] Point DNS `A` records at the new Elastic IP; wait for propagation
      (`dig +short kadr.live`).
- [ ] `sudo certbot --nginx -d kadr.live -d www.kadr.live`, then add `http2 on;`
      under `listen 443 ssl;` and reload nginx.
- [ ] Run the checks in §9.

**After a few days of stable running**
- [ ] Remove the old IP from the database allow-list, revoke its GitHub deploy key.
- [ ] Terminate the old instance (and release its Elastic IP).

---

## 9. Verifying a deployment

```bash
# Backend + DB
curl -s https://kadr.live/health/ready        # {"status":"ready","database":"ok"}
pm2 status                                    # kadr-api: online, low restart count
pm2 logs kadr-api --lines 50                  # no startup errors

# Admin is the production build (hashed filename, not plain index.js)
curl -s https://kadr.live/admin/ | grep -oE 'js/index\.[0-9a-f]+\.js'

# gzip + long cache on assets
curl -sI -H 'Accept-Encoding: gzip' \
  "https://kadr.live/admin/$(curl -s https://kadr.live/admin/ | grep -oE 'js/index\.[0-9a-f]+\.js' | head -1)" \
  | grep -iE 'content-encoding|cache-control'
# → Content-Encoding: gzip / Cache-Control: public, max-age=31536000, immutable

# HTTP/2
echo | openssl s_client -connect kadr.live:443 -servername kadr.live -alpn h2,http/1.1 2>/dev/null | grep ALPN
# → ALPN protocol: h2

# TLS renewal works
sudo certbot renew --dry-run
```

Then in a private browser window: log in as admin, click through the nav,
open a case, open the rich-text editor (blog post / case resolution), and load
the marketing site and a blog post.

---

## 10. Rollback

**Bad code deploy** (same server):

```bash
cd /var/www/kadr-portal
git log --oneline -5                 # find the last good commit
git checkout <good-commit>
npm install && npm run build
pm2 restart kadr-api --update-env
# later, return to the branch: git checkout <branch> && git pull
```

If the bad deploy included a schema change applied with `prisma db push`,
restore the pre-deploy database backup (§5.4) — `db push` can't be undone
automatically.

**Bad server move:** point DNS back at the old Elastic IP and
`pm2 start kadr-api` on the old server (that's why it isn't terminated
until the new one has been stable for a few days).

---

## 11. Troubleshooting

| Symptom | Likely cause / fix |
|---|---|
| `npm run build` killed / "JavaScript heap out of memory" | Not enough RAM — add swap (§3.2) or use a bigger instance. |
| Admin pages slow, `index.js` not hashed, files ~MB in size | A **development** build is deployed. `npm run build` forces production; never use `vue-cli-service build` directly. |
| Backend exits on start with "missing required env" | A required var in §4 is missing from `.env`. |
| `Can't reach database server` | DB allow-list doesn't include this server's IP, or wrong `DATABASE_URL`. |
| Agreement signing fails / PDF errors in `pm2 logs` | Chrome missing — §3.4 and [TROUBLESHOOTING.md](TROUBLESHOOTING.md). |
| 413 Request Entity Too Large | `client_max_body_size` missing/too small in the nginx `server` block. |
| Google login: `redirect_uri_mismatch` | `BASE_URL` wrong, or the redirect URI isn't registered in Google Cloud Console (§7). |
| File uploads fail with a CORS error in the browser | S3 bucket CORS doesn't allow `https://kadr.live` (§7). |
| Real-time updates stop after ~60s | Something else between the browser and nginx (e.g. a load balancer) is buffering or timing out the `/api` event stream. |
| App doesn't come back after a reboot | `pm2 save` + `pm2 startup` weren't run (§3.9). |
