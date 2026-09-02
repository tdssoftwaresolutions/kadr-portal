# Vue 2 → Vue 3 Migration Plan (Kadr Admin Portal)

This is an **ordered, dependency-driven** plan — not a random file-by-file list. The
sequence is chosen so that at every phase the app stays buildable and each step
unblocks the next. It is grounded in this repo's actual code (`src/main.js`,
`src/store`, `src/router`, `src/plugins`, `src/i18n`), not a generic checklist.

## Scope snapshot (measured from this repo)

- **118 `.vue` files** (~35,500 lines): 69 views, 45 components, 3 layouts, App.vue
- **Vuex store** (~2,870 lines) across 16 modules → migrate to Vuex 4 (keep API, lowest risk)
- **vue-router 3** (322-line config) → vue-router 4
- **BootstrapVue** used in **93 of 118 components** (`b-*`) — no Vue 3 build exists → biggest task
- **Custom plugins** that use Vue-2-only global APIs: `i18n` (`Vue.observable`, `Vue.prototype`), `datetime` (`Vue.filter`, `Vue.prototype`, `Vue.mixin` + `beforeDestroy`)
- Global registration in `main.js`: `new Vue()`, `Vue.use`, `Vue.component` (sofbox auto-register), `Vue.filter('reverse')`
- i18n uses `$t` in **0 `.vue` files** today → low migration cost, but keep the plugin working
- Consumers: Capacitor mobile build + Electron desktop both load this same `src/` build

## Guiding principles

1. **Keep it green.** After every phase the app must build and run. No "big bang" branch that's broken for weeks.
2. **Bottom-up dependency order.** Migrate foundation (build tooling, entry point, plugins, store, router) before leaf components, because components depend on them.
3. **UI library is the long pole.** BootstrapVue removal touches 93 files and has no drop-in Vue 3 version. It gets its own phased sub-plan and is done incrementally behind a compatibility shim.
4. **One migration branch, frequent merges to a staging integration branch.** Avoid long-lived divergence from `main`.
5. **AI-assisted, human-verified.** The AI editor does the repetitive transforms; a human reviews each phase's diff against a running app.

---

## Phase 0 — Baseline & safety net (before touching any code)

Goal: be able to detect regressions.

- [ ] Create branch `migration/vue3` off current `main`.
- [ ] Record a working build: `npm run build` succeeds; capture bundle output.
- [ ] Smoke-test and document the critical user flows (auth/sign-in, dashboard, cases, calendar, correspondence inbox, payments, blog, signature capture). These are your manual regression checklist — there are no component tests today.
- [ ] Freeze scope: **no feature work** on the admin frontend during migration.
- [ ] Confirm Capacitor (`build:mobile`) and Electron (`electron:pack`) still build from current `src` so you have a "before" reference for both.

Exit criteria: green build + written smoke-test checklist.

---

## Phase 1 — Build tooling & dependencies (foundation)

Vue 3 needs updated tooling. `@vue/cli-service 5` supports Vue 3, so the CLI can stay, but the Vue-2-only compiler and loaders change.

- [ ] Upgrade core: `vue@^3`, `vue-template-compiler` → **remove** (replaced by `@vue/compiler-sfc`), `vue-loader@^17`.
- [ ] Upgrade companions to Vue 3 lines: `vue-router@^4`, `vuex@^4`.
- [ ] Update `eslint-plugin-vue` config to the Vue 3 preset (`vue3-recommended`).
- [ ] Introduce **`@vue/compat`** (the Vue 3 migration build) as the `vue` alias in `vue.config.js`. This is the linchpin: it runs Vue 3 while emulating Vue 2 behavior with per-feature warnings, so the app keeps running while you fix things incrementally.
- [ ] Adjust the `vue$` alias in `vue.config.js` (currently `vue/dist/vue.common.js`) to the compat build.

Exit criteria: app builds and runs under `@vue/compat` in "Vue 2 behavior" mode, printing compat warnings but functioning.

---

## Phase 2 — Application entry point (`src/main.js`)

This is the root of every Vue-2 global-API usage. Convert it first because plugins and components below assume the new app instance.

- [ ] `new Vue({ render: h => h(App) }).$mount('#app')` → `const app = createApp(App)`.
- [ ] `Vue.use(...)` calls (`VueSignaturePad`, `datetime`, `i18n`, `VueScrollProgressBar`, `VueCookies`) → `app.use(...)`.
- [ ] Global component auto-registration loop (`Vue.component(...)` for `components/sofbox`) → `app.component(...)`.
- [ ] `Vue.filter('reverse', ...)` → filters are **removed in Vue 3**. Replace with a global method/`app.config.globalProperties` helper or a small composable, and update call sites (search for `| reverse`).
- [ ] Keep the async `startApp()` + Capacitor bootstrap flow intact; only the instance-creation lines change.
- [ ] Mount router and store via `app.use(router)` / `app.use(store)`.

Exit criteria: app boots via `createApp`, still under compat mode.

---

## Phase 3 — Custom plugins (they use Vue-2-only globals)

These are shared by every component, so fix them before leaf components.

**`src/plugins/datetime.js`**
- [ ] `Vue.prototype.$formatX = ...` → `app.config.globalProperties.$formatX = ...` (or convert to an importable composable — recommended long-term).
- [ ] `Vue.filter('formatDateTime' | 'formatDate' | 'formatTime')` → filters removed; replace with global properties/composable and update template usages (search `| formatDate`, `| formatDateTime`, `| formatTime`).
- [ ] `Vue.mixin({ created, beforeDestroy })` → `beforeDestroy` is renamed **`beforeUnmount`** in Vue 3. `$forceUpdate` still exists.

**`src/i18n/index.js`**
- [ ] `Vue.observable({ locale })` → `reactive({ locale })` from Vue 3.
- [ ] `Vue.prototype.$t` / `$i18n` → `app.config.globalProperties.$t` / `$i18n`.
- [ ] Keep the plugin's `install(app)` signature (Vue 3 passes `app`, not the global `Vue`).

**`src/plugins/capacitor.js`**
- [ ] Review for any global-Vue usage; adjust if present (mostly session bootstrap, likely fine).

Exit criteria: date formatting, i18n, and signature pad work at runtime; no compat warnings from these plugins.

---

## Phase 4 — Store (Vuex 3 → Vuex 4)

Decision: **stay on Vuex 4**, do not switch to Pinia during the migration. Rationale — your store is ~2,870 lines across 16 modules and Vuex 4 keeps the same `state/getters/mutations/actions` API, so this phase is near-mechanical. A Pinia rewrite is a separate, optional improvement to do *after* the migration is stable.

- [ ] `src/store/index.js`: `Vue.use(Vuex)` + `new Vuex.Store(...)` → `createStore(...)`.
- [ ] Keep the `createStore(router)` factory and the `plugin(router)` that injects `store.$cookies` / `store.$router` — verify `$cookies` still resolves under vue-cookies' Vue 3 build (see Phase 6).
- [ ] Modules (`auth`, `user`, `cases`, `calendar`, `payments`, `mediator`, `finance`, `blogs`, `reference`, `admin`, `correspondence`, etc.) need **no structural change** — verify each imports cleanly.
- [ ] Note: only 1 component uses `mapState/mapGetters/...` helpers, so binding changes are minimal.

Exit criteria: store initializes; dashboard/cases/calendar data loads.

---

## Phase 5 — Router (vue-router 3 → 4)

- [ ] `Vue.use(VueRouter)` + `new VueRouter({...})` → `createRouter({ history: createWebHistory(base), routes })`.
- [ ] Replace `mode: 'history'` with `createWebHistory()` (respect the `/admin/` base from `vue.config.js`).
- [ ] Lazy route imports (`() => import(...)`) are unchanged — good, all ~20 already use this pattern.
- [ ] Migrate navigation guards to the v4 signatures (removal of `next()`-optional patterns where used); check the guards after line 60 of `router/index.js`.
- [ ] Verify `catch-all` route uses the new `/:pathMatch(.*)*` syntax instead of `path: '*'`.

Exit criteria: all routes navigate; deep links and the error/404 route work.

---

## Phase 6 — Third-party Vue plugins (non-UI)

Swap each Vue-2-only library for its Vue 3 counterpart.

- [ ] **vue-cookies** → its Vue 3–compatible release (or replace with a tiny cookie util; it's used in `main.js` and injected into the store).
- [ ] **vue-signature-pad** → Vue 3 build, or `signature_pad` directly (you already depend on `signature_pad`). Used by client Signature/AgreementSignature views.
- [ ] **@guillaumebriday/vue-scroll-progress-bar** → check Vue 3 support; replace or drop if unmaintained.
- [ ] **@fullcalendar/vue** → **@fullcalendar/vue3** (calendar views: Admin/Mediator/Client Calendar).
- [ ] **vue-flatpickr-component** → v9+ (Vue 3 line).
- [ ] **vue2-tinymce-editor** → replace with a Vue 3 TinyMCE wrapper (`@tinymce/tinymce-vue`) — this package is Vue-2 only.
- [ ] **portal-vue** → Vue 3 has built-in `<Teleport>`; replace `<portal>` usages with `<Teleport>`.

Exit criteria: calendar, date pickers, rich-text editor, signatures all render and function.

---

## Phase 7 — BootstrapVue removal (the long pole: 93/118 files)

BootstrapVue has **no Vue 3 release**. This is the largest and riskiest phase, so it is
sub-phased and done incrementally rather than all at once.

**7a. Choose the replacement UI kit.**
- Option A: **BootstrapVueNext** — closest `b-*` API to what you have, minimizes template churn (still maturing).
- Option B: **PrimeVue** — mature and complete, but different component API = more rewrite per file.
- Recommendation: start with **BootstrapVueNext** to minimize the diff across 93 files, since you're on Bootstrap 4 markup already; fall back to PrimeVue only for components BootstrapVueNext lacks.

**7b. Inventory the actual `b-*` components used.**
- [ ] Generate a frequency list of every `b-*` tag across `src` (e.g. `b-modal`, `b-table`, `b-form-*`, `b-dropdown`, `b-tabs`). This defines the exact surface to port and its priority order (most-used first).

**7c. Port incrementally, most-used component first.**
- [ ] Install the new kit alongside; register globally so both can coexist during transition.
- [ ] Migrate one `b-*` component family at a time (e.g. all `b-modal` first), across all files, verifying after each family.
- [ ] Pay special attention to `b-table` (sorting/pagination/slots), `b-modal` (programmatic `$bvModal` API is BootstrapVue-specific and must be rewritten), and `b-form-*` validation.
- [ ] Remove `bootstrap-vue` + its CSS import (`src/plugins/bootstrap-vue.js`) only when the last `b-*` tag is gone.

**7d. Verify styling.** Keep `bootstrap@4` CSS if the new kit needs it; confirm no visual regressions on the documented smoke-test screens.

Exit criteria: zero `b-*` tags remain; `bootstrap-vue` removed from `package.json`; UI visually intact.

---

## Phase 8 — Component-level Vue 3 breaking changes

With foundation + UI migrated, sweep the 118 components for remaining Vue 2 idioms. Compat-mode warnings from Phases 1–7 are your worklist here.

- [ ] `beforeDestroy` → `beforeUnmount`; `destroyed` → `unmounted` (search all `.vue`).
- [ ] `$listeners` removed (merged into `$attrs`); update components that forward listeners.
- [ ] `.native` event modifier removed; update child-component event usage.
- [ ] `v-model` on components: prop/event renamed (`value`/`input` → `modelValue`/`update:modelValue`) for custom components.
- [ ] Multiple root nodes now allowed — but don't change working single-root templates unnecessarily.
- [ ] `functional` components / `v-bind` merge-order changes — check the sofbox library components.
- [ ] Custom directives lifecycle hook renames if any exist.
- [ ] 73 components use the Options API — **leave them as Options API** (still fully supported in Vue 3). Do not rewrite to `<script setup>` during migration; that's optional post-migration polish.

Exit criteria: **no `@vue/compat` warnings remain** anywhere in the app.

---

## Phase 9 — Remove the compat build & finalize

- [ ] Remove `@vue/compat` alias from `vue.config.js`; point `vue` at the real Vue 3 build.
- [ ] Remove `mutationobserver-shim` if no longer needed.
- [ ] Full `npm run build`; confirm bundle builds clean with no compat layer.
- [ ] Update `eslint` to Vue 3 rules fully; fix lint.
- [ ] Update `package.json`: drop `vue-template-compiler`, `bootstrap-vue`, `portal-vue`, `vue2-tinymce-editor`, and any other Vue-2-only deps.

Exit criteria: app runs on pure Vue 3, no compatibility layer, clean build + lint.

---

## Phase 10 — Cross-platform verification (Capacitor + Electron)

Because `src` feeds mobile and desktop too:

- [ ] `npm run build:mobile` + `npm run cap:sync`; smoke-test the Capacitor app.
- [ ] `npm run electron:dev`; smoke-test the Electron desktop shell.
- [ ] Run the Phase 0 smoke-test checklist end to end on web.

Exit criteria: web, Capacitor, and Electron builds all green; smoke tests pass.

---

## Recommended execution order (summary)

```
0  Baseline + smoke-test checklist
1  Tooling + deps + @vue/compat  ← keeps app running throughout
2  main.js entry (createApp)
3  Custom plugins (datetime, i18n, capacitor)
4  Vuex 3 → 4 (keep API, no Pinia yet)
5  vue-router 3 → 4
6  Non-UI third-party plugins (fullcalendar, flatpickr, tinymce, signature, cookies, portal→Teleport)
7  BootstrapVue → BootstrapVueNext  ← the long pole, sub-phased
8  Component breaking-change sweep (drive by compat warnings)
9  Remove @vue/compat, finalize deps
10 Verify web + Capacitor + Electron
```

## What NOT to do during this migration (avoid scope creep)

- Do **not** convert Options API → `<script setup>` (optional, post-migration).
- Do **not** switch Vuex → Pinia (optional, post-migration).
- Do **not** refactor business logic in `services/`/`utils/` — they're framework-agnostic and carry over untouched.
- Do **not** start the mobile-app (React Native) rework — deferred 6–8 months per current priority.

## Notes for driving this with an AI code editor

- Work **one phase per session/branch**; let each phase's compat warnings define the next batch of edits.
- After each phase, run `npm run build` and the smoke-test checklist before moving on.
- For Phase 7, feed the AI the `b-*` frequency inventory and migrate **one component family at a time** — this is where AI-generated code most often looks right but behaves differently (esp. `b-table` slots and `$bvModal`).
- Treat AI output as a draft: diff against the running Vue 2 app screen-by-screen.
