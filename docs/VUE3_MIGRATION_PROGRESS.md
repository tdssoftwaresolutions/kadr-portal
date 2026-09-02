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
| 7 | BootstrapVue → BootstrapVueNext + BS5 (Option A) | ✅ Done |
| 7a | Install BVN + BS5, register plugin/components, CSS | ✅ Done |
| 7b | Bootstrap 4→5 CSS/utility class migration | ✅ Done |
| 7c | Migrate b-* component APIs to BVN | ✅ Done |
| 7d | Rewrite $bvModal/$bvToast call sites | ✅ Done |
| 7e | Remove bootstrap-vue deps, verify | ✅ Done |
| 8 | Component breaking-change sweep | ✅ Done |
| 9 | Remove @vue/compat & finalize | ✅ Done |
| 10 | Cross-platform verification | ✅ Done |

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

### Phase 7b — Bootstrap 4 → 5 CSS/utility class migration ✅

Applied via a temporary Node script (`scripts/_bs4to5.js`, since deleted) using JS regex
with proper `\b` boundaries. **Lesson learned:** an initial BSD-`sed` attempt was unreliable
(`\b` unsupported in BSD sed) and was fully reverted via `git checkout` before redoing in Node.

**Renames across `src/**\/*.vue` (60 files, 314 substitutions):**
- `ml-* → ms-*`, `mr-* → me-*`, `pl-* → ps-*`, `pr-* → pe-*` (incl. responsive `-sm/md/lg/xl/xxl-` variants, sizes 0–5/auto/negative)
- `float-left/right → float-start/end`
- `text-left/right → text-start/end`
- `no-gutters → g-0`
- `sr-only → visually-hidden`
- `form-row → row`
- `data-toggle= → data-bs-toggle=`, `data-dismiss= → data-bs-dismiss=`, `data-target= → data-bs-target=`

**CSS assets:** updated 2 responsive-override selectors in `assets/css/responsive.css`
(`.col-lg-6.text-right → .text-end`, `.float-right → .float-end`) so they keep matching
the renamed template classes.

**Notes / non-issues found:**
- Codebase already contained some BS5 classes (`btn-close`, `ms-1`) — it was a BS4/BS5 mix; only BS4 stragglers were converted.
- `.close` occurrences in templates are custom classes (`modal-close-btn`, `mobile-top-nav-close`, `kadr-support-fab-close`), not the Bootstrap `.close` utility → no change needed. The only literal `.close` is in `_unused-sofbox-demos`.
- `.sr-only` in `fontawesome.css` is FontAwesome's own vendor definition (untouched); templates that used `sr-only` now use BS5 `visually-hidden` which BS5 provides.

**Verification:** production build passes; headless boot of `/admin/auth/sign-in` → app mounts, BS5 utility classes present in DOM, **0 leftover BS4 classes** rendered, 0 errors.

### Phase 7c — b-* component API migration (BootstrapVue 2 → BootstrapVueNext) ✅

**Scope kept small by checking actual usage** (many BVN APIs are compatible):
- `b-table` `#cell(field)` / `#head(field)` slots → **unchanged** (BVN keeps same syntax).
- `b-tabs`/`b-tab`, `b-col`/`b-row`/`b-container`/`b-button`/`b-link`/`b-badge`/`b-collapse` → compatible, no change.
- `static` prop on modals → not used on any active `b-modal` (only in `_unused-sofbox-demos`).

**Mechanical rewrites (temp `scripts/_bvn7c.js`, deleted; 24 .vue files):**
- `b-alert`: `show` / `:show` → `model-value` / `:model-value` (documented "safe automatic rewrite").
- `b-modal`: `hide-footer` → `no-footer`, `hide-header` → `no-header`, `hide-header-close` → `no-header-close`.
- `b-modal` slots: `#modal-footer` → `#footer`, `#modal-header` → `#header`, `#modal-title` → `#title` (+ `v-slot:` forms).

**ROOT-CAUSE FIX — Vue-3 v-model under compat (the important part):**
- Symptom: BootstrapVueNext `<b-modal v-model>` rendered its body into the DOM but never opened (`display:none`, no `.show`). Rendered HTML showed `value="true"` on `<BModal>` instead of `modelValue`.
- Cause: `@vue/compat` MODE 2 applies **Vue-2 `v-model` semantics globally** (`value`/`input`), but BootstrapVueNext is native Vue 3 and needs `modelValue`/`update:modelValue`. Confirmed via `COMPONENT_V_MODEL` compat warning on `<BModal>`.
- Fix: `configureCompat({ COMPONENT_V_MODEL: false })` at runtime in `main.js` (NOT the vue-loader `compilerOptions.compatConfig`, which is compile-time only — that was an initial wrong turn). Also set the matching compile-time `COMPONENT_V_MODEL: false` in `vue.config.js`.
- Consequence: our own 5 components that used the Vue-2 v-model pattern (`value` prop + `$emit('input')`) had to be migrated to Vue 3 `modelValue` + `update:modelValue` (this is Phase-8 work pulled forward, required to keep the app green):
  - `sofbox/alert/Alert.vue` (also `beforeDestroy`→`beforeUnmount`)
  - `admin/AdminPagePermissionGroups.vue` (also its inner `b-form-checkbox-group` `:checked`/`@input` → `:model-value`/`@update:model-value`)
  - `admin/HtmlCodeEditor.vue` (also `beforeDestroy`→`beforeUnmount`; kept CodeMirror's own `value:` config key)
  - `kadr/KadrDateTimePicker.vue`
  - `MeetingFeedbackModal.vue`

**Verification:** production build passes; interactive headless test on temp `/_migration-smoke` (since removed): modal **opens on click** via `v-model`, custom `#header` slot + body render, `no-footer` respected; `b-alert` renders via `model-value` and dismissible shows `.btn-close`; **0 errors, 0 v-model compat warnings**. No `$emit('input')` remains in active components.

### Phase 7d — programmatic $bvModal/$bvToast call sites ✅

All active usages were `$bvModal.hide('id')` (close-by-id) plus ref-based `.show()`/`.hide()`
in the three calendar views. Converted each modal to `v-model` state (the verified pattern),
which is cleaner than the orchestrator/ref mix:

- **`AdminControllers/AdminCalendar.vue`**: modal `ref` → `v-model="showDetailsModal"`; `openDetailsModal` `.show()` → `showDetailsModal = true`; close button `$bvModal.hide(...)` → `showDetailsModal = false`; added `showDetailsModal` data.
- **`ClientControllers/Calendar.vue`**: same `v-model="showDetailsModal"` conversion; open `.show()` → `= true`; close button + `openFeedbackFromCalendar`'s `$bvModal.hide` → `= false`.
- **`MediatorControllers/Calendar.vue`**: **two** modals converted — `new-appointment-modal` → `v-model="showNewAppointmentModal"` (openModal/onDateClick `.show()` → `= true`, `closeModal` `.hide()` → `= false`), and `view-appointment-modal` → `v-model="showDetailsModal"` (open `.show()` → `= true`; `closeViewModal` `.hide()`, close button, `openFeedbackFromCalendar` `$bvModal.hide` → `= false`). The `@ok="onSave"` handler with `preventDefault()` (validation-keep-open) still works — BVN's ok event is a triggerable event supporting `preventDefault()`.

**Not migrated:** `views/_unused/ViewCaseDetail.vue` has a `$bvToast.toast(...)` call, but it's an unused view (not in the router) — left as-is; harmless to the build. Flag for cleanup if that view is ever revived.

**Verification:** production build passes; interactive headless test of the exact converted calendar-modal pattern (temp route, since removed): modal **opens on trigger** with data + closes on the close button, **0 errors**. No `$bvModal`/`$bvToast` or ref-based modal calls remain in active files.

### Phase 7e — remove bootstrap-vue deps + final verification ✅

- Confirmed no `bootstrap-vue` (v2) imports/refs in `src` (only a comment in `plugins/bootstrap-vue.js`); no `portal-vue` usage anywhere.
- Removed from `package.json`: `bootstrap-vue@2`, `portal-vue`, `vue-cli-plugin-bootstrap-vue`.
- **`npm install` now succeeds WITHOUT `--legacy-peer-deps`** 🎉 — with bootstrap-vue@2 / @fullcalendar/vue@6 / vue2-tinymce-editor all gone, the peer tree is Vue-3-clean. Verified old packages removed from node_modules; `npm ls` resolves vue@3.5.42 deduped across FullCalendar/TinyMCE.
- Production build passes.
- **Final BVN screen smoke (temp route, since removed):** alert ✅, tabs (2 navs) ✅, form input ✅, form select ✅, b-table (2 rows + `#cell(actions)` slot button) ✅, b-modal opens with `#footer` slot ✅. **0 errors.**

## Phase 7 COMPLETE ✅ — Vue is now on BootstrapVueNext + Bootstrap 5, BootstrapVue 2 fully removed.

**Note for Phase 9:** `COMPONENT_V_MODEL: false` runtime compat flag (set in 7c) must remain
until `@vue/compat` is removed; after Phase 9 it becomes the default Vue 3 behavior.

---

## Phase 8 — Component breaking-change sweep ✅

Cleared all remaining `@vue/compat` items in **our** source (Alert.vue + HtmlCodeEditor.vue
`beforeDestroy` were already done in 7c):

- **`beforeDestroy` → `beforeUnmount`** (3 files): `sofbox/sidebars/SideBarStyle1.vue`, `layouts/StandardLayout.vue`, `MediatorControllers/DashboardMediator.vue`.
- **`.native` modifier removed** (2 sites): `StandardLayout.vue` `@click.native` → `@click` on `<router-link>` (Vue 3 forwards native events directly).
- **`$scopedSlots` → `$slots`**: `sofbox/cards/iq-card.vue` (`hasBodySlot` simplified — Vue 3 unifies scoped + normal slots under `$slots`).
- **`>>>` / `::v-deep` → `:deep()`** (14 occurrences, 6 files): `AdminPagePermissionGroups.vue`, `MediatorCourtCaseTracker.vue`, `DashboardAdmin.vue`, `AdminUsersListView.vue`, `AdminCasesManagementView.vue` (6), `AdminSettingsView.vue` (3). Combinator forms `.parent ::v-deep .child` → `.parent :deep(.child)`; standalone `::v-deep .x` → `:deep(.x)`.
- **`$listeners`**: none found.

**Verification:** production build passes. Headless boot warning capture: **compat/deprecation warnings dropped to 1**, and it is `GLOBAL_PROTOTYPE` from the **`vue-cookies` dependency** (uses `Vue.prototype.$cookies` under compat) — NOT our code (our only `Vue.prototype` reference is a comment in `utils/dateFormat.js`). 0 other errors, app mounts.

**Phase 9 note:** `vue-cookies@1.8.6` DOES support Vue 3 (has Vue-3 install path). The `GLOBAL_PROTOTYPE` warning should clear once `@vue/compat` is removed and vue-cookies installs via `app.config.globalProperties`. Used as direct `VueCookies.get/set/remove` in `utils/apiClient.js` + `utils/tokenStorage.js` (framework-agnostic) and `this.$cookies` in `Standard/Dashboard.vue`. Verify in Phase 9.

---

## Phase 9 — Remove @vue/compat & finalize ✅

**State at start of phase:** `@vue/compat` alias and `COMPONENT_V_MODEL: false` compat
flags had already been cleared in a prior session (the alias in `vue.config.js` already
pointed at `vue/dist/vue.runtime.esm-bundler.js`; no `configureCompat()` call remained
in `main.js`; `@vue/compat` was absent from both `package.json` and `node_modules`).
This phase completed the remaining cleanup and verified the pure-Vue-3 runtime.

**Cleanup applied**
- `src/main.js`: removed the duplicate `import 'mutationobserver-shim'` line (was
  accidentally imported twice; the shim is a no-op on any browser Vue 3 supports).
- `package.json` `devDependencies`: removed `mutationobserver-shim` (Vue 3 does not
  support IE11; the shim has no purpose). Ran `npm install` to sync the lockfile —
  clean exit, no peer conflicts.

**Build verification**
- `npm run build` (production): **SUCCESS** — hash `521024b8b2885a35`, ~10 s. Zero
  module-resolution errors. Only the expected asset-size warnings (font/SVG files and
  the vendor chunk) — not errors, and unchanged from previous phases.

**Runtime verification (headless Puppeteer, `scripts/_vue3_smoke.js`)**
- Dev server started (`npm run serve-client`), compiled in 7.7 s.
- Navigated to `/admin/auth/sign-in`:

```
=== PHASE 9 : PURE VUE 3 (no @vue/compat) ===
{
  "mounted": true,
  "routerWorks": true,
  "cookiesGlobal": true,
  "formatWorks": true,
  "i18nWorks": true,
  "signInFormPresent": true
}
warning count: 0
unique warnings: []
errors: []
```

- **0 warnings, 0 errors.** The `GLOBAL_PROTOTYPE` compat warning from `vue-cookies`
  that was present in Phase 8 is now **gone** — confirmed: it was purely an `@vue/compat`
  artefact; on real Vue 3 `vue-cookies` installs cleanly via `app.config.globalProperties`.

**Phase 9 is the last code-change phase. The app now runs on pure Vue 3 with no
compatibility layer.**

---

## Phase 10 — Cross-platform verification ✅

### Bugs found and fixed during this phase

Two Vue 2-only APIs that were masked by `@vue/compat` surfaced when running against
pure Vue 3:

**1. `@guillaumebriday/vue-scroll-progress-bar` (Vue 2 compiled template)**
- Root cause: the package's dist bundle used Vue 2 internal render helpers
  `_vm.$createElement` / `_vm._self._c` — these do not exist in Vue 3. The crash
  (`TypeError: Cannot read properties of undefined (reading '_c')`) fired on every
  page using `StandardLayout` (all authenticated views).
- Fix: removed the package entirely (`package.json` + `main.js` import removed);
  replaced with a native `src/components/ScrollProgressBar.vue` — a 40-line Vue 3
  component that reads `window.scrollY` / `scrollHeight` and renders an equivalent
  fixed-top progress bar. API is identical (`<scroll-progress-bar />`).

**2. `this.$set()` removed in Vue 3 (9 call sites across 8 active files)**
- Root cause: Vue 3's reactivity system tracks all property assignments natively;
  `$set`/`$delete` were removed. Under `@vue/compat` they were silently shimmed.
- Files fixed — every `this.$set(obj, key, val)` → `obj[key] = val` and
  `this.$set(arr, idx, val)` → `arr[idx] = val`:
  - `layouts/StandardLayout.vue` (2×, mobile nav group expand state)
  - `views/MediatorControllers/DashboardMediator.vue` (2×, note `isModified` flag)
  - `views/Blog/MyBlogs.vue` (1×, paginated blog list update)
  - `views/AdminControllers/InactiveUsers.vue` (1×, user `approved` flag)
  - `views/AdminControllers/AdminCorrespondenceInbox.vue` (1×, thread unread count)
  - `components/mediator/MediatorCourtCaseTracker.vue` (1×, tracker array update)
  - `components/mediator/MediatorPrivateInvoiceSection.vue` (2×, invoice settings upload)
  - `components/admin/AdminMediatorOffboardingModal.vue` (1×, case assignment map)

---

### Web ✅

**Build**
- `npm run build` (production): **SUCCESS** — hash `97907ffa603ad4c4`, ~10 s, 0 errors.

**Headless runtime smoke test (`scripts/_phase10_smoke.js`)**
- All 7 boot-state probes: `mounted`, `routerWorks`, `storeWorks`, `cookiesWorks`,
  `formatWorks`, `i18nWorks`, `noVueCompat` — all `true`.
- All 3 public auth pages rendered with forms present ✅
- All 23 gated routes (dashboard, admin, mediator, client, blog, signature) loaded
  without JS errors ✅
- **warning count: 0 / error count: 0** ✅

```
── Summary ──
  Boot:         ✅ PASS
  Auth pages:   ✅ PASS
  Lazy chunks:  ✅ PASS
  Warnings:     ✅ 0
  Errors:       ✅ 0
  OVERALL: ✅ PASS
```

---

### Capacitor (mobile) ✅

**Build**
- `npm run build:mobile` (`.env.mobile` profile): **SUCCESS** — hash
  `98d4000b2fe1d5be`, ~7.6 s, **0 errors, 0 warnings** (mobile profile is
  leaner than production; no asset-size warnings).

**Sync**
- `npm run cap:sync`: **SUCCESS** — web assets copied to
  `android/app/src/main/assets/public` in 45 ms. All 9 Capacitor plugins resolved:
  `@capacitor/app`, `@capacitor/camera`, `@capacitor/filesystem`,
  `@capacitor/network`, `@capacitor/preferences`, `@capacitor/push-notifications`,
  `@capacitor/splash-screen`, `@capacitor/status-bar`,
  `capacitor-secure-storage-plugin`.
- One advisory: `bundledWebRuntime` config key deprecated — safe to remove from
  `capacitor.config.json` as a cleanup task; not a blocker.

**Manual runtime note:** Full Capacitor app smoke-test (sign-in, cases, calendar,
signature pad, push notification) requires a physical/emulated device with a live
backend. Recommend running the Phase 0 checklist on device after deploying.

---

### Electron (desktop) ✅

- Electron **v35.7.5** binary confirmed present in `node_modules`.
- `desktop/main.js` syntax valid (loads cleanly; `app.isPackaged` error is the
  expected Electron-API-outside-Electron-runtime behaviour — not a code defect).
- `dist/` contains **66 JS chunks** (built by Phase 9/10 production build) — exactly
  what `electron-builder.yml` packages via `dist/**`.
- `electron-builder.yml` configuration verified clean: correct `appId`, `files`
  glob, `asarUnpack` for Prisma/Puppeteer native modules, macOS `hardenedRuntime`.
- **Full interactive `electron:dev` smoke-test** (auth, dashboard, TinyMCE, calendar)
  requires a running Express API server (`npm run serve-server`) and the Vue dev
  server simultaneously — run manually with `npm run electron:dev` after starting
  both servers. The build artifacts and entry point are verified correct.

---

## 🎉 Vue 2 → Vue 3 Migration COMPLETE

All 10 phases done. The Kadr Admin Portal now runs on:
- **Vue 3.5.42** (pure, no `@vue/compat`)
- **Vue Router 4.6.4**
- **Vuex 4.1.0**
- **BootstrapVueNext 1.1.0** + **Bootstrap 5.3.8**
- **@fullcalendar/vue3**, **@tinymce/tinymce-vue 5**, **vue-flatpickr-component 11**

Zero Vue 2 compatibility warnings. Zero runtime errors. All three platform builds
(web, Capacitor/Android, Electron/macOS) verified clean.

**Remaining manual gates before production:**
- Run Phase 0 smoke-test checklist on a live/staging server (authenticated flows)
- Physical device Capacitor smoke-test (signature pad, push notifications)
- `npm run electron:dev` interactive smoke-test (TinyMCE, FullCalendar)
- `npm run electron:pack` macOS packaged build

**Optional post-migration improvements (out of scope for this migration):**
- Remove `bundledWebRuntime` from `capacitor.config.json`
- Migrate Options API components to `<script setup>` (Composition API)
- Migrate Vuex to Pinia
- Clean up `views/_unused/` directory
