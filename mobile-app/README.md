# Kadr Mobile App

A React Native mobile application for the Kadr mediation platform. This app provides full feature parity with the Vue.js admin panel, allowing Admins, Mediators, and Clients to manage cases, meetings, invoices, and more from their mobile devices.

## Features

### All Roles
- **Dashboard** — Overview of active cases, upcoming meetings, pending actions, and recent activity
- **Calendar** — View and manage mediation meetings
- **Profile** — View and edit personal information
- **Push Notifications** — Real-time notifications for case updates

### Client
- View active and past mediation cases
- Attend scheduled meetings
- Make payments for mediation services
- Create new case requests
- Contact support

### Mediator
- Manage assigned mediation cases
- View past mediations and feedback
- Track invoices and income
- Write and manage blog content
- Manage video reels
- Reward store (redeem points for rewards)
- Court case tracker (Pro feature)
- Legal feeds (Pro feature)
- Private invoicing (Pro feature)
- Bank account management

### Admin
- Full case management and assignment
- User management (activate, deactivate, delete)
- View correspondence inbox
- Settings management
- Invoice management
- Notification management
- Blog taxonomy management
- Website content management
- Reward catalog and order management

## Tech Stack

- **React Native 0.87** — Latest stable version
- **TypeScript** — Full type safety
- **React Navigation 7** — Native stack + bottom tabs + drawer navigation
- **Zustand** — Lightweight state management (replaces Vuex)
- **Axios** — HTTP client with interceptors for auth token management
- **React Native Keychain** — Secure token storage
- **React Native Paper** — Material Design components
- **React Native Calendars** — Calendar views
- **React Native Toast Message** — Toast notifications
- **React Native Vector Icons** — Icon library
- **Moment.js** — Date formatting

## Project Structure

```
mobile-app/
├── src/
│   ├── api/              # API client, endpoints
│   ├── assets/           # Images, fonts
│   ├── components/       # Reusable UI components
│   │   ├── common/       # Button, Input, Card, Avatar, etc.
│   │   ├── cases/        # Case-specific components
│   │   ├── calendar/     # Calendar components
│   │   ├── payments/     # Payment flow components
│   │   ├── mediator/     # Mediator-specific components
│   │   └── admin/        # Admin-specific components
│   ├── config/           # App configuration
│   ├── hooks/            # Custom React hooks
│   ├── navigation/       # Navigation setup (Auth, Main, Root)
│   ├── screens/          # Screen components organized by feature
│   │   ├── auth/         # SignIn, SignUp, ForgotPassword
│   │   ├── dashboard/    # Dashboard
│   │   ├── cases/        # Cases list, detail, correspondence
│   │   ├── calendar/     # Calendar view and event creation
│   │   ├── mediator/     # Rewards, Invoices, Blogs, Video Reels
│   │   ├── client/       # Client-specific screens
│   │   ├── admin/        # Admin cases, users, settings
│   │   ├── profile/      # Profile view/edit
│   │   └── support/      # Support threads
│   ├── store/            # Zustand stores
│   │   ├── authStore.ts  # Authentication state
│   │   ├── appStore.ts   # General app state (dashboard, cases, calendar)
│   │   ├── mediatorStore.ts  # Mediator-specific state
│   │   ├── adminStore.ts # Admin-specific state
│   │   └── paymentStore.ts   # Payment flow state
│   ├── theme/            # Colors, typography, spacing
│   ├── types/            # TypeScript interfaces
│   └── utils/            # Helpers, token storage
├── android/              # Android native project
├── ios/                  # iOS native project
├── App.tsx               # Root app component
└── package.json
```

## API

The app connects to the existing Node.js backend at `https://portal.kadr.live`. All API calls use:
- Bearer token authentication
- `X-Kadr-Client: mobile` header for mobile-specific behavior
- Automatic token refresh on 401 (error code E102)
- Secure token storage via Keychain/Keystore

## Getting Started

### Prerequisites
- Node.js >= 22
- React Native CLI
- Xcode (for iOS)
- Android Studio (for Android)

### Installation

```bash
cd mobile-app
npm install

# iOS
cd ios && pod install && cd ..

# Run
npx react-native run-ios
# or
npx react-native run-android
```

### Environment

The app is pre-configured to connect to `https://portal.kadr.live`. To change the API base URL, edit `src/config/index.ts`.

## Authentication Flow

1. User enters email/password on Sign In screen
2. App sends POST `/login` with `clientType: mobile`
3. Server returns `accessToken` + `refreshToken` in response body
4. Tokens are stored securely via react-native-keychain
5. All subsequent requests include `Authorization: Bearer <token>`
6. On token expiry (E102 error), the interceptor refreshes automatically
7. If refresh fails, user is redirected to Sign In

## Role-Based Navigation

The app dynamically renders different tab navigation based on the logged-in user's role:
- **Admin** — Home, Cases, Calendar, Users, Profile
- **Mediator** — Home, Cases, Calendar, Invoices, Profile
- **Client** — Home, Cases, Calendar, Support, Profile

Additional screens are accessible via stack navigation from these tabs.
