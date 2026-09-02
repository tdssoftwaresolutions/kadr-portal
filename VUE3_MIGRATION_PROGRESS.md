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
| 3 | Custom plugins (datetime, i18n, capacitor) | ✅ Done |
| 4 | Store (Vuex 3 → 4) | ✅ Done (pulled into Phase 2) |
| 5 | Router (vue-router 3 → 4) | ✅ Done (pulled into Phase 2) |
| 6 | Non-UI third-party plugins | ✅ Done |
| 7 | BootstrapVue → BootstrapVueNext + BS5 (Option A) | 🔄 In progress |
| 7a | Install BVN + BS5, register plugin/components, CSS | ✅ Done |
| 7b | Bootstrap 4→5 CSS/utility class migration | ⬜ Not started |
| 7c | Migrate b-* component APIs to BVN | ⬜ Not started |
| 7d | Rewrite $bvModal/$bvToast call sites | ⬜ Not started |
| 7e | Remove bootstrap-vue deps, verify | ⬜ Not started |
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

---

## Phase 3 — Custom plugins ✅

**`src/plugins/datetime.js`**
- `install (Vue)` → `install (app)`.
- All `Vue.prototype.$formatX` → `app.config.globalProperties.$formatX` (8 helpers: `$formatDateTime`, `$formatDate`, `$formatTime`, `$formatRelativeDay`, `$formatMeetingRange`, `$getTimezone`, `$getLocale`, `$timezoneLabel`).
- Removed the three `Vue.filter('formatDateTime'|'formatDate'|'formatTime')` registrations — verified **unused in all templates** (no `| formatX` usages). The `$formatX` methods cover the same need.
- `Vue.mixin({ ... beforeDestroy })` → `app.mixin({ ... beforeUnmount })`. Clears this file's Phase-1 `beforeDestroy` compat error.

**`src/i18n/index.js`**
- `import Vue from 'vue'` → `import { reactive } from 'vue'`.
- `Vue.observable({ locale })` → `reactive({ locale })`.
- `install (Vue)` → `install (app)`; `Vue.prototype.$t` / `$i18n` → `app.config.globalProperties.$t` / `$i18n`.

**`src/plugins/capacitor.js`**
- Reviewed — **no changes needed**. Contains no `Vue` / `Vue.prototype` / global-Vue usage; pure session/push logic.

**Verification**
- `npm run build` (production): **SUCCESS**, no errors.
- **Runtime check (headless, dev server /admin/auth/sign-in):**
  - `$formatDate(new Date('2026-01-15'))` → `"15 Jan 2026"` (datetime works)
  - `$t('nonexistent.key')` → `"nonexistent.key"` (i18n fallback works)
  - `$i18n.locale` → `"en"` (reactive locale wired)
  - app mounted; **0 page errors, 0 non-network console errors**

**Compat worklist now remaining (Phase 8):** `beforeDestroy`→`beforeUnmount` still in
`HtmlCodeEditor.vue`, `sofbox/alert/Alert.vue`, `sofbox/sidebars/SideBarStyle1.vue`,
`StandardLayout.vue`, `MediatorControllers/DashboardMediator.vue` (datetime.js one is
now fixed); `.native` in `StandardLayout.vue`; `$scopedSlots` in `iq-card.vue`;
`>>>`/`::v-deep` CSS across many files.

---

## Phase 6 — Non-UI third-party plugins ✅

**Inventory first (only migrated what's actually used):**
- `@fullcalendar/vue` → used only in wrapper `src/components/sofbox/calendar/FullCalendar.vue` (views use the wrapper).
- `vue2-tinymce-editor` → used in 3 files: `Blog/MyBlogs.vue`, `MediatorControllers/MyCases.vue`, `admin/SimpleFulfillmentRuleEditor.vue`.
- `vue-flatpickr-component` → used only in `components/kadr/KadrDateTimePicker.vue`.
- `portal-vue` → **not used anywhere** (grep confirmed; "portal" hits are unrelated names). No `<Teleport>` migration needed; just drop the dep in Phase 9.
- `vue-signature-pad` (VueSignaturePad) → used only in `ClientControllers/ClientCases.vue`. Other signature screens use raw `signature_pad` (framework-agnostic, untouched).
- `@guillaumebriday/vue-scroll-progress-bar` → used in `StandardLayout.vue`.

**Dependency changes**
- Added: `@fullcalendar/vue3@6.1.21` (matches installed FullCalendar core 6.1.21), `@tinymce/tinymce-vue@5`, `vue-flatpickr-component@11`, and explicit `tinymce@^5.10.9` (was transitive via the removed editor).
- Removed from package.json: `@fullcalendar/vue`, `vue2-tinymce-editor`.
- Installed with `--legacy-peer-deps` (still needed until Phase 7).

**Code changes**
- `FullCalendar.vue`: `import('@fullcalendar/vue')` → `import('@fullcalendar/vue3')`; replaced Vue-2 `this.$set(this.calendarOptions, 'plugins', …)` with plain assignment (Vue 3 objects are deeply reactive).
- New shared module `src/plugins/tinymce.js`: self-hosts TinyMCE 5 (theme/icons/skin CSS + the plugins referenced by the editor options) once, imported by all 3 editor files (DRY, consistent).
- 3 editor files: `<vue2-tinymce-editor v-model :options>` → `<editor v-model :init license-key="gpl">`; import `Editor` from `@tinymce/tinymce-vue` + the shared tinymce module; registered as `editor`. Added `skin: false` + `content_css: false` to each options object (skin CSS is bundled, avoids runtime asset 404s).
- `KadrDateTimePicker.vue` (flatpickr): **no code change** — v11 default export + `<flat-pickr v-model :config @on-change>` API is identical to v8; the package swap suffices.

**Verification**
- `npm run build` (production): **SUCCESS**, no "Module not found"/resolve errors.
- **Real runtime render check** via a temporary `/_migration-smoke` route + view that mounted all three swapped components (route & view since removed):
  - FullCalendar: `.fc` element rendered ✅
  - TinyMCE: `.tox-tinymce` + edit-area **iframe** rendered ✅ (proves self-hosted skin/plugins loaded)
  - flatpickr: input rendered ✅
  - **0 page errors, 0 non-network console errors**
- Confirmed no lingering `@fullcalendar/vue'` or `vue2-tinymce-editor` imports in `src` (only a doc comment mentions the old name).

**Still on Vue-2 builds under @vue/compat (verify during Phase 10 authenticated smoke test — they live on auth-gated screens unreachable without a backend session):**
- `vue-signature-pad@2` — `ClientCases.vue` digital-signature pad.
- `@guillaumebriday/vue-scroll-progress-bar@0.5` — `StandardLayout.vue` top progress bar.
Both load under compat and the build passes; if either misbehaves in Phase 10, replace `vue-signature-pad` with the raw `signature_pad` pattern already used elsewhere, and drop/replace the scroll bar.

---

## Phase 7 — BootstrapVue → BootstrapVueNext + Bootstrap 5 (Option A, chosen by user)

**Key discovery driving the approach:** BootstrapVueNext is **Bootstrap-5 only**, but this
app is on **Bootstrap 4.6.2**. So Option A = component-library swap **plus** an app-wide
Bootstrap 4→5 CSS/utility migration. Measured BS4 footprint: ~161 `float-right`,
~90 `ml-*`/`mr-*`, `text-left/right`, **239 `form-group`**, `data-toggle` ×4, `badge-*`.
b-* surface: **48 distinct component types across 75 files**; `$bvModal`/`$bvToast` in 4 files
(one in `_unused/`). Split into sub-phases 7a–7e.

### Phase 7a — Install + wire up ✅
- Installed `bootstrap@5.3.8`, `bootstrap-vue-next@1.1.0` (+ its peers `@floating-ui/vue`, `@vueuse/core`, `reka-ui`, etc.), `--legacy-peer-deps` (bootstrap-vue@2 still present until 7e).
- `src/plugins/bootstrap-vue.js`: now imports **Bootstrap 5 CSS** + `bootstrap-vue-next.css` (was BootstrapVue 2 CSS + `Vue.use(BootstrapVue)`).
- `main.js`: added `app.use(createBootstrap())` (provides orchestrators/services).
- **Global component registration:** `createBootstrap()` alone does NOT register global kebab components in this webpack (`@vue/cli-service`) setup — verified `<b-*>` tags rendered as *unresolved custom elements*. Fix: import `* as BootstrapVueNextComponents` and `app.component(name, comp)` for every `B*`-prefixed export (110 components). Chose global registration over the unplugin auto-import resolver for robustness with vue-cli's chained webpack config and to mirror the previous "everything global" behavior. Bundle-size cost acceptable for an admin app.
- **Verified (temp /_migration-smoke route, since removed):** `<b-container/row/col/button/badge/link/alert/form-group/form-input/table>` all render to BS5 markup (`.btn`, `.badge`, `.alert`, `.form-control`, `.table`, `.row`, col classes), table shows 2 rows, **unresolvedBTags = [] (empty)**, 0 errors.
- Production build passes.

**Next:** 7b (BS4→5 CSS/utility classes), 7c (b-* API differences), 7d ($bvModal/$bvToast), 7e (remove bootstrap-vue, final verify).
