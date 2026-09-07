# Product Analytics (PostHog)

This document explains how KadrPortal tracks product usage with **PostHog**, what
each event means, how to enable it, and — from a product-owner perspective — what
belongs in PostHog vs. what stays in the database. It closes with the exact
dashboards leadership should build to answer the business questions we care about.

---

## 1. Why PostHog, and which libraries

Server-side analytics live entirely in the backend, so tracking works identically
for the web admin, the public website, and the mobile app without shipping a
client SDK or leaking keys to the browser.

| Concern | Library | Why |
| --- | --- | --- |
| Event capture | [`posthog-node`](https://posthog.com/docs/libraries/node) | Official server SDK. Batches and flushes in the background, never blocks a request. |
| Device / browser / OS | [`ua-parser-js`](https://www.npmjs.com/package/ua-parser-js) | Turns the `User-Agent` into `$browser`, `$os`, `$device_type` so we can break usage down by device. |
| IP → location | [`geoip-lite`](https://www.npmjs.com/package/geoip-lite) | **Offline** lookup (country / region / city / timezone / lat-long). No third-party call, no user data leaves our server. Powers the world map and "usage by location". |

We deliberately reuse PostHog's canonical property names (`$geoip_country_code`,
`$browser`, `$os`, `$device_type`, `$ip`) so events light up PostHog's built-in
world map, web-analytics, and device-breakdown views with zero extra config.

> Content in this section was rephrased from the official library docs for
> licensing compliance.

---

## 2. Enabling it

Analytics are **optional and off by default**. With no key set, the whole layer
is a safe no-op — the app runs exactly as before.

Add to `.env`:

```
POSTHOG_API_KEY=phc_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
POSTHOG_HOST=https://us.i.posthog.com   # or https://eu.i.posthog.com, or self-hosted
POSTHOG_ENABLED=1                        # set 0 to force-disable (e.g. staging)
POSTHOG_DISABLE_GEOIP=0                  # set 1 to skip location enrichment
```

Optional tuning: `POSTHOG_FLUSH_AT` (default 20 events), `POSTHOG_FLUSH_INTERVAL`
(default 10000 ms), `POSTHOG_DEBUG=1`.

On boot the server logs either `Analytics enabled …` or `product analytics
disabled (no-op mode)`. Queued events are flushed during graceful shutdown so
nothing is lost on deploy/restart.

The **same `POSTHOG_API_KEY`** drives both the server-side SDK and the public
website's browser SDK (see §2b). Setting it once enables everything.

---

## 2b. Public website — PostHog Web Analytics (browser SDK)

PostHog ships a dedicated **Web Analytics** product (visitors, page views,
sessions, bounce rate, top pages, traffic sources/referrers, geography, device,
and Core Web Vitals). That dashboard is powered by the **browser SDK**
(`posthog-js`) and its automatic `$pageview` / `$pageleave` / session signals —
things a server can't fully reconstruct. So for the public marketing site
(`public/website`, static HTML) we load the browser SDK; for the app/business
flows we use the server-side events above. This hybrid is PostHog's recommended
setup.

What PostHog does **not** do: SEO (keyword rankings, backlinks, crawl/index
health, SERP position). Use Google Search Console / Ahrefs / Semrush for that.
PostHog can show that traffic *arrived* from organic search (via referrer), but
not your rankings.

**How the key reaches the browser (it's not a secret):** the PostHog project API
key is a write-only ingest key designed to be embedded in browser code. The
server writes a browser-safe config block into `public/website/js/site-config.js`
(`window.KADR_SITE_CONFIG.posthog = { enabled, key, apiHost, assetsHost }`) via
`websiteStaticGenerator.buildSiteConfigJs`. This file is regenerated:
- on website content/settings save, and
- on every server boot via `refreshSiteConfig()` (so the env key propagates even
  on already-seeded systems).

**Where it initializes:** `public/website/js/site-chrome.js` (the shared
header/footer script every page already loads) calls `initPosthog()`, which
loads `posthog-js` from the assets host and inits it with `capture_pageview`,
`capture_pageleave`, and `autocapture`. It's fully inert when `enabled` is false
or no key is set — no bundle, no cookies, no requests.

**CSP:** the site runs under a strict helmet Content-Security-Policy. When a key
is configured, `securityMiddleware` adds the PostHog hosts (derived from
`POSTHOG_HOST`) to `script-src` (SDK bundle) and `connect-src` (ingestion). With
no key, the policy stays tight. Hosts: US Cloud uses `us.i.posthog.com` +
`us-assets.i.posthog.com`; EU uses the `eu` equivalents; self-hosted uses your
host origin.

**Do-Not-Track:** the browser SDK is initialised with `respect_dnt: true`.

To disable website analytics only, unset the key or set `POSTHOG_ENABLED=0`
(this disables both server and browser). There is no separate website toggle.

---

## 3. Architecture

```
controller / service
        │  analytics.trackXxx({ req, user, ... })
        ▼
backend/utils/analytics/index.js      ← typed helpers, never throws / never blocks
        │  buildRequestContext(req)    ← IP, geo, device, platform
        ▼
backend/lib/posthog.js                ← singleton client (no-op when disabled)
        ▼
        PostHog Cloud
```

Key files:

- `backend/config/posthogConfig.js` — reads env, decides enabled/no-op.
- `backend/lib/posthog.js` — one cached client for the process (mirrors `lib/prisma.js`).
- `backend/utils/analytics/requestContext.js` — derives location + device from `req`.
- `backend/utils/analytics/events.js` — the canonical event-name catalog.
- `backend/utils/analytics/index.js` — the helpers the app calls.

**Guarantees:** every helper is wrapped so an analytics failure can never break a
user request, and capture is non-blocking (batched by the SDK).

---

## 4. Event catalog

Every event automatically carries request context when a `req` is passed:
`$ip`, `$geoip_country_code`, `$geoip_subdivision_1_name` (region), `$geoip_city_name`,
`$geoip_time_zone`, `$browser`, `$os`, `$device_type`, `client_platform`
(`web` | `mobile_app`), `request_id`, and `environment`. PostHog also stamps every
event with its server timestamp, which is what powers "time of day / peak hour".

| Event | Fired when | Key properties | `distinct_id` |
| --- | --- | --- | --- |
| `user_registered` | Client or mediator self-signup completes | `user_type`, `auth_method`, `self_signup` | new user id |
| `user_logged_in` | Successful password or Google login | `user_type`, `auth_method` | user id |
| `user_login_failed` | Login attempt rejected | `failure_reason`, `email_attempted`, `auth_method` | anonymous |
| `user_logged_out` | Logout endpoint hit | — | user id |
| `case_created` | New dispute case created (signup / additional / admin) | `case_ref` (KDR-…), `category`, `case_type`, `status`, `origin` | creator id |
| `case_status_changed` | A case moves between statuses/sub-statuses | `from_status`, `to_status`, `to_sub_status`, `case_ref`, `transition` | actor id |
| `case_closed` | A case reaches a terminal state | `close_status`, `resolved_successfully`, `case_created_at`, `case_closed_at`, `days_open` | actor id |
| `meeting_scheduled` | A mediation meeting/event is persisted | `case_id`, `meeting_type`, `scheduled_start`, `duration_minutes`, `scheduled_via` | scheduler id |
| `meeting_feedback_submitted` | Party/mediator submits feedback | `rating`, `party`, `case_id`, `meeting_id` | actor id |
| `payment_initiated` | A payment order is created (before result) | `order_id`, `amount`, `currency`, `gateway`, `purpose`, `case_id` | payer id |
| `payment_succeeded` | A payment is recorded as successful | `amount`, `currency`, `gateway`, `purpose`, `case_id`, `transaction_id` | payer id |
| `payment_failed` | A payment fails at the gateway | `order_id`, `amount`, `gateway`, `purpose`, `failure_reason` | payer id |
| `subscription_activated` | Mediator PRO activated via payment | `amount`, `currency`, `duration_days`, `source` | user id |
| `reward_redeemed` | Mediator spends points on a catalog item | `reward_item_title`, `reward_item_id`, `points_spent`, `order_status` | mediator id |
| `blog_viewed` | A published blog post is read | `blog_id`, `blog_title`, `blog_url`, `author_name` | anonymous |
| `video_reels_viewed` | The public video-reels feed is viewed | `page`, `reels_count`, `reel_ids` | anonymous |
| `website_page_viewed` | A page on the public marketing site is viewed | `page_path`, `referrer` | anonymous |
| `error_occurred` | 5xx app error, DB error, or unhandled exception | `error_source`, `error_code`, `status_code`, `route`, `http_method` | user id or anonymous |

**Person profiles:** on registration and login we call `identify` with `email`,
`name`, `user_type`, `city`, `state`, `subscription_tier`, and a one-time
`signed_up_at`. This is what lets the team search a **person by email/username**
and see their full activity timeline (question #7 below).

---

## 5. Product-owner view — what goes in PostHog vs. the database

The database remains the **system of record**. PostHog is the **behavioral /
analytical layer**. The rule of thumb:

> If losing the value would be a correctness/compliance/financial problem → DB.
> If the value answers "how is the product being used / how healthy is it" → PostHog.

| Data | System of record | In PostHog? | Rationale |
| --- | --- | --- | --- |
| Payment amount, gateway, transaction id | **DB** (`transactions`, `payment_orders`) | Yes, as `payment_succeeded` event props | DB is the financial source of truth; PostHog gives volume/value trends and gateway split. We do **not** duplicate money as the record of truth. |
| User account (email, name, type, location) | **DB** (`user`) | Yes, as a person profile | DB is authoritative; the profile enables per-user activity timelines and cohort analysis. |
| Case details (parties, evidence, status pipeline) | **DB** (`cases`) | Only lightweight props (`case_ref`, `category`, `type`, `status`) | Sensitive case content stays in the DB; PostHog only needs enough to count/segment. |
| Meeting content (summary, next steps) | **DB** (`events`) | No | Confidential mediation content must not go to a third party. Only timing/metadata is tracked. |
| **When/where/what device** a login, signup, case, meeting or payment happened | derivable-but-not-stored | **PostHog** | The DB doesn't record IP/geo/device/time-of-day per action. This is precisely the gap PostHog fills, and why it "makes sense to store there for better analytics". |
| Login/registration **rate over time**, peak hours, funnels | not stored | **PostHog** | Behavioral aggregates are what analytics tools are built for. |
| Case lifecycle (status, sub_status, history) | **DB** (`cases`, `case_history`) | Yes, as `case_status_changed` / `case_closed` events | DB is the source of truth for a case's current state; PostHog gives created-vs-closed trends, cohorts, `days_open`, and resolution rate without SQL. |
| Reward balance & transactions | **DB** (`user.reward_points_balance`, `mediator_reward_transactions`) | Only the `reward_redeemed` action | DB owns the ledger; PostHog answers "how many redemptions and what items" over time. |
| Blog / video-reel content | **DB** (`blogs`, `mediator_video_reels`) | Only view events | Content lives in the DB; PostHog measures readership/engagement, which the DB doesn't record. |
| Public website visitors | not stored | **PostHog** | The marketing site is static files with no DB; server-side page-view events are the only way to count visitors, their location and device. |
| Payment attempts & failures | **DB** (`payment_orders` status) | Yes, as `payment_initiated` / `payment_failed` | DB records the order state; PostHog turns it into a conversion funnel and failure-rate trend. |
| Reliability: error rate by route/source over time | partially (alerts) | **PostHog** | `error_occurred` turns one-off alerts into a trend leadership can watch. |

### Recommendations (things to take care of in PostHog)

1. **PII & privacy.** This is an internal B2B admin tool, so we intentionally
   attach `email`/`name` to profiles for investigation. If that policy changes,
   drop those from `personProperties` in `backend/utils/analytics/index.js` and
   rely on the user-id only. Consider PostHog's data-retention and person-deletion
   for GDPR/DPDP "right to be forgotten" — wire account deletion to a PostHog
   person delete if required.
2. **GeoIP freshness.** `geoip-lite` ships a bundled DB; run its updater on a
   schedule (`node_modules/geoip-lite/scripts/updatedb.js`) so location stays
   accurate. Set `POSTHOG_DISABLE_GEOIP=1` to turn it off.
   - **Login location requires the real client IP.** Behind a proxy/load
     balancer, set `TRUST_PROXY` (defaults to `1` in production) so `req.ip` and
     `X-Forwarded-For` resolve to the actual client. Location is intentionally
     blank for private/local IPs (`127.0.0.1`, `10.x`, `192.168.x`) — expected in
     dev/LAN — and when the proxy doesn't forward `X-Forwarded-For`.
3. **Environment separation.** Send staging to a separate PostHog project (or set
   `POSTHOG_ENABLED=0` in staging) so test traffic doesn't pollute leadership
   dashboards. Events already carry `environment` for a fallback filter.
4. **Cost/volume.** Only meaningful business events are tracked (no per-request
   pageview firehose), keeping event volume — and cost — predictable.
5. **No secrets in properties.** Helpers whitelist properties explicitly; never
   pass raw request bodies or tokens into `capture`.

---

## 6. Dashboards to build for leadership

These map 1:1 to the questions leadership asked. Build them once in PostHog:

1. **Platform attention & top features** — Bar of event counts by name
   (`case_created`, `meeting_scheduled`, `payment_succeeded`, `user_logged_in`)
   over the last 30/90 days. Shows what people actually do.
2. **Peak login time** — Trend of `user_logged_in` broken down by hour of day
   (PostHog "time of day" view). Add `$geoip_time_zone` breakdown for regional peaks.
3. **Daily / monthly volumes + peak hour** — Trends of `user_logged_in`,
   `user_registered`, `case_created`, `meeting_scheduled` with daily and monthly
   intervals; overlay hour-of-day for peak.
4. **Device breakdown** — Pie of any core event by `$device_type` and `$os`,
   plus `client_platform` (web vs mobile app).
5. **Usage by location** — World map / table of events by `$geoip_country_code`
   and `$geoip_subdivision_1_name` (region) and `$geoip_city_name`.
6. **Daily transactions** — Trend of `payment_succeeded` count (volume) and
   `sum(amount)` (value), broken down by `gateway` and `purpose`.
7. **Per-user activity** — Persons view: search by `email`, open the profile to
   see the full timeline (logins, cases, meetings, feedback, payments). Also
   usable as a cohort for retention analysis.

**Bonus reliability board:** Trend of `error_occurred` broken down by
`error_source` (`api` / `database` / `payment` / `unhandled`) and `route` — a
health signal that pairs with the existing critical-alert emails.

### Additional dashboards (extended tracking)

8. **Case pipeline & created-vs-closed** — the core operational board.
   - **Created vs closed over time**: two trend series — `case_created` count and
     `case_closed` count — at weekly / monthly / fiscal-year intervals. The gap
     between the lines is your open backlog.
   - **Open cases (created but not yet closed)**: because `case_closed` carries
     `case_created_at` and `days_open`, you can build a "cases created this month
     still open" view, and spot cases that stay open a long time (high `days_open`).
   - **Cross-period closes** (created one month, closed a later month/FY): compare
     the event timestamp of `case_closed` against its `case_created_at` property —
     any row where they fall in different months/FYs is a carried-over case.
     Segment by `days_open` buckets (0–7, 8–30, 31–90, 90+).
   - **Resolution rate**: share of `case_closed` where `resolved_successfully` is
     true (`close_status = closed_success`) vs unsuccessful/cancelled/failed.
   - **Pipeline flow**: funnel or breakdown of `case_status_changed` by
     `to_status` / `transition` to see where cases stall.
   > Note: for exact point-in-time backlog you can also query the DB directly;
   > PostHog gives the trend and cohort view without writing SQL.

9. **Payment funnel & failures** — trend of `payment_initiated` →
   `payment_succeeded`, with conversion rate, broken down by `gateway` and
   `purpose`. Overlay `payment_failed` and its `failure_reason` to catch a broken
   gateway early. `sum(amount)` on succeeded gives realized revenue; on failed
   gives revenue at risk.

10. **Content engagement** — trends of `blog_viewed` (top posts by
    `blog_title` / `author_name`) and `video_reels_viewed`. Break down by
    `$geoip_country_code` and `$device_type` to see who consumes content.

11. **Website visitors** — trend of `website_page_viewed` (unique visitors and
    total views), broken down by `page_path` (top pages), `referrer` (where
    traffic comes from), `$geoip_*` (location) and `$device_type`. This is your
    top-of-funnel: how many people discover Kadr before signing up.

12. **Reward redemptions** — count of `reward_redeemed` over time and a breakdown
    by `reward_item_title` to see exactly which rewards mediators buy, plus
    `sum(points_spent)`. Pair with `order_status` to see auto- vs manual
    fulfillment split.

---

## 7. Extending

To track a new behavior, add a name to `backend/utils/analytics/events.js`, add a
typed helper in `backend/utils/analytics/index.js`, then call it from the relevant
controller/service passing `req` (for location/device) and the acting user. Keep
properties low-cardinality and free of sensitive content.
