# Kadr Portal


## Project setup
```
npm install
```

### Backend
```
npm run start
```

### Frontend
```
npm run watch
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