# Kadr Portal — Mobile (Capacitor)

Bundled Vue 2 SPA + remote Express API on your domain.

## Prerequisites

- Node 22.x
- Xcode (iOS) and/or Android Studio
- Apple Developer + Google Play accounts for store release

## One-time setup

```bash
npm install
npx cap add ios
npx cap add android
```

Set your production API in `.env.mobile` or `.env.mobile.local`:

```bash
VUE_APP_API_BASE_URL=https://your-production-domain.com
```

## Database migration (push tokens)

```bash
npx prisma db push
# or your usual migration workflow
```

Creates table `user_push_devices`.

## Build & run

```bash
# Build web assets for Capacitor (loads API from VUE_APP_API_BASE_URL)
npm run build:mobile

# Sync native projects
npm run cap:sync

# Open native IDEs
npm run cap:ios
npm run cap:android
```

Dev loop with live API:

```bash
# Terminal 1 — API
npm run start

# Terminal 2 — point mobile build at local API (use machine IP for device)
echo 'VUE_APP_API_BASE_URL=http://192.168.x.x:3000' >> .env.mobile.local
npm run build:mobile && npm run cap:sync
```

## Features

| Feature | Implementation |
|--------|----------------|
| Stay logged in | Refresh token in **Secure Storage** (30 days); bootstrap on app start |
| Push | `@capacitor/push-notifications` → `POST /api/push/register` |
| Camera / gallery | `src/utils/mobileMedia.js` → `pickImage()` |
| File downloads | `src/utils/mobileDownloads.js` → Documents/KadrPortal |
| Offline pages | `src/utils/offlinePages.js` → save JSON snapshots via Preferences |

### Push notifications (production)

1. Configure Firebase (Android) and APNs (iOS) in native projects.
2. Set `PUSH_FCM_SERVER_KEY` (or integrate `firebase-admin` in `services/push/pushService.js`).
3. Call `pushService.sendToUser()` from your notification workflows.

### Offline saved pages

In any view after loading data:

```javascript
import { saveOfflinePage } from '@/utils/offlinePages'

await saveOfflinePage({
  id: 'dashboard',
  title: 'Dashboard',
  route: this.$route.fullPath,
  payload: responseData
})
```

List saved pages with `listOfflinePages()` and render from `payload` when offline (`@capacitor/network`).

### Camera / uploads

Replace `<input type="file">` on critical flows with:

```javascript
import { pickImage } from '@/utils/mobileMedia'
const { dataUrl } = await pickImage({ source: 'prompt' })
```

## Server configuration

- **CORS**: `middleware/corsMiddleware.js` allows Capacitor origins.
- **Mobile login**: send `clientType: 'mobile'` or header `X-Kadr-Client: mobile` to receive `refreshToken` in the login response.
- **Refresh**: `POST /api/refresh-token` with body `{ refreshToken }`.

## Store checklist

- [ ] App icons & splash (`resources/` — use `@capacitor/assets` or replace in Xcode/Android Studio)
- [ ] Privacy policy URL
- [ ] iOS: Push capability, camera/photo usage strings in `Info.plist`
- [ ] Android: `POST_NOTIFICATIONS`, storage permissions in `AndroidManifest.xml`
- [ ] Test login persistence (kill app, reopen)
- [ ] Test PDF download to Files/Downloads

## CSS

Global native tweaks: `src/assets/scss/_mobile-app.scss` (`.kadr-native-app` on `body`).

Fix per-screen layout issues with responsive rules in the relevant `.vue` files.
