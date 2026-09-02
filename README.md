# Kadr Portal

Online mediation platform — Vue admin SPA, Express API, and MySQL.

## Quick start (Docker — recommended)

Run the full stack (API, built admin UI, marketing site, and MySQL) with Docker:

```bash
cp .env.docker.example .env   # required — compose loads env from this file
npm run docker:up
```

Full step-by-step guide: **[docs/GET_STARTED.md](docs/GET_STARTED.md)** (local Docker, ngrok, AWS EC2, database, first admin).

When the containers are healthy:

| URL | Description |
|-----|-------------|
| http://localhost:3000/admin/ | Admin / client / mediator portal |
| http://localhost:3000/ | Marketing website |
| http://localhost:3000/health/ready | Readiness check (includes DB) |

Other Docker commands:

```bash
npm run docker:up:detached   # run in background
npm run docker:logs          # follow API logs
npm run docker:down          # stop containers
npm run docker:shell         # shell into API container
```

The API container runs `prisma db push` on startup to apply the schema. Payment gateway credentials and S3 settings can be added to `.env` — see `.env.docker.example` and `.env.payment.example`.

## Local development (without Docker)

Use this only when you need hot-reload on the Vue dev server:

```bash
npm install
cp .env.docker.example .env   # adjust DATABASE_URL for your local MySQL
npx prisma db push
npm run serve                 # API on :3000 + Vue dev server on :8080/admin
```

Legacy split commands:

```bash
npm run start    # API only (nodemon)
npm run watch    # rebuild admin SPA on change
```

## macOS desktop (Electron)

The desktop app runs the Express API locally and loads the Vue admin UI in an Electron window.

### Development
```bash
npm install
# Configure .env (same as web: DATABASE_URL, JWT secrets, etc.)
npm run electron:dev
```

This starts the API (port 3000), Vue dev server (port 8080), and opens the Electron shell.

### Production build (.app / .dmg)
```bash
npm run electron:pack
```

Output is in `release/`. After install, copy `.env.desktop.example` to `.env` beside **Kadr Portal.app** (or use the bundled `.env.example` in the app Resources folder as a template) and set `DATABASE_URL` and your secrets.

## Mobile (Android / iOS — Capacitor)

Bundled Vue admin + remote API on your domain. See **[docs/MOBILE.md](docs/MOBILE.md)** for setup, push, camera, downloads, and offline pages.

```bash
# Configure API URL in .env.mobile or .env.mobile.local
npm install
npx cap add ios && npx cap add android
npm run mobile:pack
npm run cap:ios   # or cap:android
```

### Packaged app without installer (faster local test)
```bash
npm run electron:pack:dir
open "release/mac-arm64/Kadr Portal.app"
```

## Documentation

- **[Get started](docs/GET_STARTED.md)** — local Docker, ngrok, AWS EC2, database, first admin
- [Implementation status](docs/IMPLEMENTATION_STATUS.md)
- [App review / roadmap](docs/APP_REVIEW.md)
- [Payment gateways](docs/PAYMENTS.md)
