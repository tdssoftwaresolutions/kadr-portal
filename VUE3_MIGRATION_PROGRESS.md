# Vue 3 Migration — Progress Log

Living document tracking the phase-by-phase Vue 2 → Vue 3 migration. Updated at the
end of each phase. See `VUE3_MIGRATION_PLAN.md` for the full plan.

Branch: `migration/vue3` (off `stable-release`)

## Status board

| Phase | Description | Status |
|-------|-------------|--------|
| 0 | Baseline & safety net | ✅ Done |
| 1 | Build tooling & deps + @vue/compat | ✅ Done |
| 2 | Entry point (main.js → createApp) | ✅ Done |
| 3 | Custom plugins (datetime, i18n, capacitor) | ⬜ Not started |
| 4 | Store (Vuex 3 → 4) | ✅ Done (pulled into Phase 2) |
| 5 | Router (vue-router 3 → 4) | ✅ Done (pulled into Phase 2) |
| 6 | Non-UI third-party plugins | ⬜ Not started |
| 7 | BootstrapVue removal (93/118 files) | ⬜ Not started |
| 8 | Component breaking-change sweep | ⬜ Not started |
| 9 | Remove @vue/compat & finalize | ⬜ Not started |
| 10 | Cross-platform verification | ⬜ Not started |

---

## Phase 0 — Baseline & safety net ✅

**Environment recorded**
- Node installed: v26.4.0 (note: `package.json` engines pins `22.x` — mismatch, watch for tooling warnings; did not block baseline build)
- npm: 11.17.0
- Vue installed: **2.7.16** (package.json range `^2.6.10` resolved to 2.7). Good — 2.7 is the ideal launchpad for Vue 3.
- Baseline `npm run build`: **SUCCESS** (~8.5s, hash 3d2a7a93c34eb2c3). This is the known-good reference.

**Git**
- Working tree clean at start (on `stable-release`).
- Created migration branch: `migration/vue3`.

**Router facts discovered (de-risks Phase 5)**
- No `path: '*'` catch-all route present → no catch-all syntax change needed.
- No navigation guards in `router/index.js` → guard-migration work is minimal/none.
- Router uses `mode: 'history'` + `base` (`/admin/` or `./` for Capacitor) → main conversion is `createWebHistory(base)`.

### Manual smoke-test checklist (regression net — no automated component tests exist)

Run after each phase against a running app. Confirm each screen renders and its
primary interaction works.

**Auth (`/auth/...`)**
- [ ] Sign in
- [ ] Sign up
- [ ] Password reset / recover

**Standard / dashboard (StandardLayout)**
- [ ] Dashboard loads (home route)
- [ ] Past mediations list
- [ ] Portal support view
- [ ] Payment return screen
- [ ] Profile edit (`/user/profile-edit`)

**Admin controllers**
- [ ] Admin users list
- [ ] Cases management
- [ ] Correspondence inbox (messages)
- [ ] Admin calendar (FullCalendar)
- [ ] Google account management
- [ ] Blog taxonomy
- [ ] Admin management (admins)
- [ ] Settings
- [ ] Notifications
- [ ] Website content (rich-text editor / TinyMCE)
- [ ] Reward orders
- [ ] Mediator 360 (`/app/mediators/:id/360`)

**Mediator controllers**
- [ ] Invoices / payments
- [ ] Rewards store
- [ ] Mediator calendar
- [ ] My video reels

**Client controllers**
- [ ] Signature (`/signature`)
- [ ] Agreement signature (`/agreement-signature`)
- [ ] Client calendar

**Blog**
- [ ] My blogs list

**Cross-cutting interactions to verify**
- [ ] Modals open/close (BootstrapVue `b-modal` / `$bvModal`)
- [ ] Tables render, sort, paginate (`b-table`)
- [ ] Forms submit + validation (`b-form-*`)
- [ ] Date/time formatting shows correctly (`$formatDateTime` etc.)
- [ ] Date pickers (flatpickr)
- [ ] Signature pad captures strokes
- [ ] Language switch en/hi (`$i18n.locale`) — even though `$t` is unused in templates today
- [ ] Global spinner/loader + alert toasts
- [ ] Scroll progress bar

**Platform builds (Phase 10 gate)**
- [ ] Web: `npm run build`
- [ ] Mobile: `npm run build:mobile` + `npm run cap:sync`
- [ ] Desktop: `npm run electron:dev`

---

## Phase 1 — Build tooling & dependencies + @vue/compat ✅

**Dependency changes (`package.json`)**
- `vue` `^2.6.10` → `^3.5.42`
- Added `@vue/compat` `^3.5.42` (migration build)
- `vue-router` `^3.1.3` → `^4.6.4`
- `vuex` `^3.0.1` → `^4.1.0`
- `vue-loader` `^16.0.0` → `^17.4.2`
- Removed `vue-template-compiler`; added `@vue/compiler-sfc` `^3.5.42`
- Installed versions verified: vue/compat/compiler-sfc 3.5.42, vue-router 4.6.4, vuex 4.1.0, vue-loader 17.4.2

**Install note**
- `npm install` hit an expected ERESOLVE peer conflict: `@fullcalendar/vue@6` and other Vue-2-only plugins still peer-require Vue 2. Installed with `--legacy-peer-deps` (standard for compat-mode migration). These peers are replaced in Phases 6/7. **Reminder: keep using `--legacy-peer-deps` for installs until Phase 7 is done.**

**`vue.config.js`**
- `vue$` alias `vue/dist/vue.common.js` → `@vue/compat` (reverted in Phase 9).
- Added vue-loader `compilerOptions.compatConfig.MODE = 2` (full Vue 2 behavior).
- Added a production-only CSS minimizer tweak (`mergeRules: false`) to work around a false-positive "Unclosed comment" thrown by the newer cssnano/postcss selector parser. Verified no source CSS has mismatched `/* */` counts, so this is a tooling regression, not a code defect. CSS output size unchanged (~492 KiB app.css).

**`.eslintrc.js`**
- `plugin:vue/essential` → `plugin:vue/vue3-essential`.

**Verification**
- `npm run build` (production): **SUCCESS** (~8.5s, hash 2d7028cbedd063f1). App now builds as Vue 3 under compat.
- Dev build also compiles all 118 `.vue` files via `@vue/compiler-sfc`.

**Compat worklist surfaced (deferred to later phases — NOT blockers now):**
- `beforeDestroy` → `beforeUnmount`: `HtmlCodeEditor.vue`, `sofbox/alert/Alert.vue`, `sofbox/sidebars/SideBarStyle1.vue`, `StandardLayout.vue`, `plugins/datetime.js`, `MediatorControllers/DashboardMediator.vue` → **Phase 3/8**
- `.native` modifier: `StandardLayout.vue` (lines 48, 81) → **Phase 8**
- `$scopedSlots`: `sofbox/cards/iq-card.vue` (line 42) → **Phase 8**
- `>>>` / `/deep/` / `::v-deep` CSS combinators (many files) → **Phase 8**
- `VueRouter default export not found` in `router/index.js` → **Phase 5** (expected; router not converted yet)

---

## Phase 2 — Entry point + (pulled forward) Phases 4 & 5 ✅

**Why 4 & 5 were pulled forward:** `main.js`, `store/index.js`, and `router/index.js`
are tightly coupled at the app entry point. Because Phase 1 already installed
**vuex 4** and **vue-router 4** (which have NO default export), the old
`import Vuex from 'vuex'` / `import VueRouter from 'vue-router'` + `new X()` calls
were structurally broken (verified: `vuex` default = undefined, `vue-router`
default = undefined). Converting `main.js` alone would leave a knowingly-broken
runtime for two more phases. Doing all three together keeps a real working
checkpoint, per the "keep it green at runtime" principle.

**`src/main.js`**
- `import Vue from 'vue'` → `import { createApp } from 'vue'`.
- `new Vue({ router, store, render: h => h(App) }).$mount('#app')` → `createApp(App)` + `app.use(router)` + `app.use(store)` + `app.mount('#app')`.
- All `Vue.use(...)` → `app.use(...)` (VueSignaturePad, datetime, i18n, VueScrollProgressBar, VueCookies).
- sofbox `require.context` auto-registration loop: `Vue.component(...)` → `app.component(...)`.
- Removed `Vue.filter('reverse', ...)` — verified it is used in **0 templates**, so safely dropped (no call-site changes).
- Removed `Vue.config.productionTip` (no-op / removed in Vue 3).
- `createApp`/`app.use`/`app.component` moved inside `startApp()` so the app instance exists before plugins register; Capacitor bootstrap + `window.vm` preserved.

**`src/router/index.js` (Phase 5)**
- `import VueRouter from 'vue-router'` → `import { createRouter, createWebHistory } from 'vue-router'`.
- Removed `Vue.use(VueRouter)`.
- `new VueRouter({ mode: 'history', base: routerBase, routes })` → `createRouter({ history: createWebHistory(routerBase), routes })`.
- No navigation guards and no `path: '*'` catch-all existed, so nothing else to migrate.

**`src/store/index.js` (Phase 4)**
- `import Vue from 'vue'; import Vuex from 'vuex'` → `import { createStore } from 'vuex'`.
- Removed `Vue.use(Vuex)`.
- `new Vuex.Store({...})` → `createStore({...})`.
- The `plugin(router)` that injects `store.$cookies` / `store.$router` is unchanged (Vuex 4 plugins work identically). All 16 modules unchanged; verified no store module uses `Vue.set`/`Vue.delete`/`import Vue`.

**Verification**
- `npm run build` (production): **SUCCESS** (hash 90cc586b8ffe990e). The Phase-1 `VueRouter default export not found` warning is now **gone**.
- **Runtime check (headless, real dev server at /admin/):** navigated to `/admin/auth/sign-in`:
  - `#app` rendered 6,659 chars of HTML (app mounted + sign-in view rendered)
  - `window.vm` present (createApp/mount works)
  - `window.vm.$router` present and route resolved (vue-router 4 works at runtime)
  - **0 page errors, 0 non-network console errors**
- Temp smoke script created under `scripts/` for the check, then deleted.

**Remaining deferred compat items unchanged** (still owned by Phase 3/8): `beforeDestroy`, `.native`, `$scopedSlots`, `>>>`/`::v-deep` CSS.
