# Vue 3 Migration — Progress Log

Living document tracking the phase-by-phase Vue 2 → Vue 3 migration. Updated at the
end of each phase. See `VUE3_MIGRATION_PLAN.md` for the full plan.

Branch: `migration/vue3` (off `stable-release`)

## Status board

| Phase | Description | Status |
|-------|-------------|--------|
| 0 | Baseline & safety net | ✅ Done |
| 1 | Build tooling & deps + @vue/compat | ⬜ Not started |
| 2 | Entry point (main.js → createApp) | ⬜ Not started |
| 3 | Custom plugins (datetime, i18n, capacitor) | ⬜ Not started |
| 4 | Store (Vuex 3 → 4) | ⬜ Not started |
| 5 | Router (vue-router 3 → 4) | ⬜ Not started |
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
