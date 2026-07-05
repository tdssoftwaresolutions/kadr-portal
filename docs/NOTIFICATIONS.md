# Notification system (Email, SMS, WhatsApp, Push)

This document describes how KadrPortal sends notifications from **admin configuration**, **application code**, and **in-code automatic triggers**. Everything flows through a single central service.

---

## Big picture

All channels use **`services/notification/notificationService.js`** (`send()` and `sendBulk()`).

```
┌─────────────────────────────────────────────────────────────────┐
│  Triggers                                                        │
│  • Admin UI (bulk send)                                          │
│  • helper.sendTemplatedEmail / helper.sendNotification           │
│  • In-code table triggers (post-DB hooks)                        │
│  • Schedulers (e.g. dailyDigest)                                 │
└────────────────────────────┬────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  notificationService.send()                                      │
│  1. Channel enabled? (notification_channel_settings)             │
│  2. Resolve recipient (userId or raw email/phone)                │
│  3. Merge variables (name, email, phone + your data)               │
│  4. resolveTemplate() from DB (+ code builders if any)           │
│  5. Channel handler → provider                                    │
│  6. Log to notification_send_logs                                │
└────────────────────────────┬────────────────────────────────────┘
                             ▼
        ┌──────────┬──────────┬──────────┬──────────┐
        │  EMAIL   │   SMS    │ WhatsApp │   PUSH   │
        │  SMTP    │  Twilio  │  Twilio  │   FCM    │
        └──────────┴──────────┴──────────┴──────────┘
```

---

## Database (source of truth)

| Table | Purpose |
|--------|---------|
| `notification_templates` | Per **template key** + **channel**: subject, greeting, body HTML/text, push title, `active`, `variables` JSON |
| `notification_channel_settings` | Per channel: **enabled**, **provider**, **config** (email header/footer, SMS country code, etc.) |
| `notification_trigger_rules` | Legacy table (unused; triggers are code-only in `registerCodeTriggers.js`) |
| `notification_send_logs` | Audit trail: template, channel, recipient, sent/failed, error |

Prisma models: `prisma/schema.prisma` (`notification_channel` enum, models above).

**Email layout defaults** live in `config/emailConfig.js` until admin saves header/footer in the DB (Channels tab).

---

## Admin panel

**UI:** `src/views/AdminControllers/AdminNotificationsView.vue`  
**API:** `/admin/notifications/*` in `routes/apiRoutes.js` → `controller/notificationAdminController.js`  
**Permission:** admin page `notifications`

### Tabs

#### 1. Templates

- Create/edit by **display name**; **template key** is auto-generated (camelCase, e.g. `welcomeCredentials`).
- Use `{variable}` placeholders in subject, greeting, and body.
- **EMAIL:** subject, greeting, body HTML (Edit / Preview tabs).
- **SMS / WhatsApp / Push:** plain `body_text`; push also has **title**.
- **`dailyDigest`:** body is built in code (`services/notification/builders/dailyDigestBuilder.js`). The DB row controls subject, greeting, and active flag—not the full HTML body.

#### 2. Send message

- Select channel, template, and multiple users.
- Auto-fills `{name}`, `{email}`, `{phone_number}` per recipient; you supply any extra variables.
- `POST /admin/notifications/send` → `notificationService.sendBulk()`.

#### 3. Channels & logs

- Enable/disable each channel.
- Edit **email header/footer HTML** (stored in DB).
- View recent **send logs**.

### Admin API routes

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/admin/notifications/templates` | List templates |
| POST | `/admin/notifications/templates` | Create/update template |
| DELETE | `/admin/notifications/templates/:id` | Delete template |
| POST | `/admin/notifications/templates/preview` | Preview rendered template |
| GET/POST | `/admin/notifications/channel-settings` | List/save channel config |
| GET | `/admin/notifications/users` | Search recipients |
| POST | `/admin/notifications/send` | Bulk send |
| GET | `/admin/notifications/send-logs` | Send history |
| POST | `/admin/notifications/preview-email-layout` | Preview header/footer |

---

## Code side (developers)

### Direct send (most common)

```javascript
// Email (legacy helper name — used across controllers)
await helper.sendTemplatedEmail('passwordResetOtp', email, {
  otp: '123456',
  recipientName: 'Alex'
})

// Any channel
await helper.sendNotification({
  templateKey: 'someSmsTemplate',
  channel: 'SMS',
  userId: 42,
  data: { caseId: 'CASE-1001' }
})

// Bulk (same as admin send)
await helper.sendNotificationBulk({
  templateKey: 'announcement',
  channel: 'EMAIL',
  userIds: [1, 2, 3],
  data: { message: 'Hello' }
})
```

Wrappers in `utils/helper.js` delegate to `notificationService`.

`EmailService.sendTemplate()` in `services/email/emailService.js` also calls `notificationService.send()` for EMAIL.

### What `send()` does

1. **Channel enabled?** — `getChannelSettings(channel)` from `services/notification/channelConfig.js`. If disabled → returns `{ sent: false, skipped: true }` (no throw).
2. **Recipient** — `userId` loads user from DB; or use `to` as email/phone string.
3. **Variables** — merges `name`, `email`, `phone_number`, `recipientName` with your `data`.
4. **Template** — `resolveTemplate(templateKey, channel, data)` from `services/notification/templateRepository.js`.
5. **Dispatch** — channel module sends and writes `notification_send_logs`.

---

## Per-channel flow

### EMAIL

```
DB template
  → templateRenderer ({var} replacement)
  → emailChannel.send()
      → subject, greeting, body_html
      → getEmailLayout() — header/footer from DB (fallback: emailConfig)
      → renderEmailLayout() — services/email/emailLayoutRenderer.js
  → SMTP provider — services/email/providers/ (config: emailConfig + env)
```

**Key files**

| File | Role |
|------|------|
| `config/emailConfig.js` | Default provider, from address, header/footer HTML |
| `services/email/emailLayoutRenderer.js` | Wraps greeting + body in layout shell |
| `services/notification/emailLayoutService.js` | Loads header/footer from DB with config fallback |
| `services/notification/channels/emailChannel.js` | Orchestrates render + send |

### SMS

```
DB template.body_text
  → renderTemplate({vars})
  → Twilio Messages API
  → phone normalized with countryCode from channel settings
```

**Env:** `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_SENDER_NUMBER`

**File:** `services/notification/channels/smsChannel.js`

### WhatsApp

Same pattern as SMS via Twilio. Default **disabled** in `channelConfig.js` until you enable it in admin.

**File:** `services/notification/channels/whatsappChannel.js`

### PUSH

```
DB template.title + body_text
  → renderTemplate
  → pushService.sendToUser(userId) — device tokens in user_push_devices
  → inserts in-app row in notifications table
```

**Files:** `services/notification/channels/pushChannel.js`, `services/push/pushService.js`, `controller/pushController.js` (device registration)

**Env:** FCM / platform credentials when configured.

---

## Template resolution

| Type | Example | Body source |
|------|---------|-------------|
| **Static (DB)** | `welcomeCredentials`, `passwordResetOtp` | `notification_templates.body_html` / `body_text` |
| **Builder (code)** | `dailyDigest` | `services/notification/builders/dailyDigestBuilder.js` + DB subject/greeting |

Registry: `services/notification/templateBuilders.js`

Placeholders are replaced by `services/notification/templateRenderer.js` (`{name}`, `{caseId}`, etc.).

---

## Automatic triggers (field changed → send)

**Engine:** `services/notification/triggerRuleEngine.js`  
**Register handlers:** `services/notification/registerCodeTriggers.js` (loaded from `server.js`)

Triggers are **code-only**. There is no admin UI or API for DB trigger rules. Add or change behavior by editing `registerCodeTriggers.js` (or calling `helper.registerNotificationTableTrigger` at startup).

### From application code

```javascript
await helper.evaluateNotificationRules({
  tableName: 'cases',
  previous: oldRow,
  current: newRow,
  data: { caseId: newRow.case_id },
  userId: mediatorId
})
```

### Register custom in-code logic

```javascript
helper.registerNotificationTableTrigger('cases', async ({ previous, current, data, userId }) => {
  if (previous?.status !== current?.status) {
    return {
      templateKey: 'mediatorAssignedMeetingScheduled',
      channel: 'EMAIL',
      userId,
      data: { ...data, caseId: current.case_id }
    }
  }
  return null
})
```

### Built-in example: user approved

In `registerCodeTriggers.js`, when `user.active` goes from `false` → `true` and `data.password` is present (via `runWithNotificationContext`), the app sends `welcomeCredentials` by email.

---

## Config files vs database

| Source | What it controls |
|--------|------------------|
| **`config/emailConfig.js`** | SMTP-related defaults, default header/footer HTML, `EMAIL_*` env |
| **DB `notification_channel_settings`** | Enabled flag, provider name, email header/footer overrides |
| **DB `notification_templates`** | All template content per channel |
| **Code builders** | Dynamic HTML for keys like `dailyDigest` |

Admin-edited email layout in **Channels & logs** overrides `emailConfig` header/footer when saved.

---

## Example end-to-end flows

### Admin bulk email

1. Admin picks template + users in **Send message**.
2. `notificationAdminController.sendBulk` → `sendBulk()` → one `send()` per user.
3. Each send loads template from DB, renders, SMTP, logs.

### Password reset OTP

1. `authController` calls `helper.sendTemplatedEmail('passwordResetOtp', email, { otp })`.
2. Template must exist in DB for `passwordResetOtp` + `EMAIL` and be **active**.
3. Email channel renders and sends via SMTP.

### Daily reminder digest

1. `services/scheduler/dailyReminderScheduler.js` runs on schedule.
2. `helper.sendTemplatedEmail('dailyDigest', email, { recipientName, sections })`.
3. `dailyDigestBuilder` builds HTML from `sections`; DB supplies subject/greeting.

### Case field change (when wired)

1. Prisma middleware runs after `create` / `update` / `upsert` on a tracked table, or you call `evaluateNotificationRules` manually.
2. Matching in-code triggers call `notificationService.send()`.

---

## Post-DB automatic hooks (framework)

After most Prisma **create / update / upsert** operations on tracked tables, the app automatically evaluates trigger rules—no manual `evaluateNotificationRules` call at each controller.

### How it works

1. `lib/prisma.js` registers **Prisma middleware** (`services/notification/prismaNotificationMiddleware.js`).
2. On write, middleware loads **previous** row (for update/upsert) and **current** row (result).
3. It calls `triggerRuleEngine.evaluateTableChange()` with **code triggers only** (`skipDatabaseRules: true`).
4. Matching handlers dispatch via `notificationService.send()`.

Tracked tables are listed in `config/notificationTableMap.js`.

**Skipped models** (no hooks): `notification_templates`, `notification_channel_settings`, `notification_trigger_rules`, `notification_send_logs`.

**Not hooked:** `updateMany`, `createMany` (no per-row previous state).

Disable hooks: `NOTIFICATION_HOOKS=0` in env.

### Extra template data (password, OTP, etc.)

Variables not stored on the row can be passed for the **next** Prisma write:

```javascript
const { runWithNotificationContext } = require('../services/notification/notificationContext')

await runWithNotificationContext(
  {
    userId,
    data: { password: generatedPassword, loginUrl: 'https://...' }
  },
  () => prisma.user.update({ where: { id: userId }, data: { active: true, password_hash } })
)
```

Or `helper.runWithNotificationContext(context, fn)`.

`updateInactiveUser` uses this pattern; welcome email is driven by the **code trigger** in `registerCodeTriggers.js`, not a hardcoded `sendTemplatedEmail` in the controller.

### When to still use direct `sendTemplatedEmail`

- One-off sends with no DB state change (e.g. cron digest).
- Multiple recipients with different templates in one action (use code triggers returning an array of specs).
- Until a code trigger exists in `registerCodeTriggers.js` for that event.

### Migration path

1. Add handlers in `registerCodeTriggers.js` (or `registerNotificationTableTrigger`) for each business event.
2. Remove duplicate `sendTemplatedEmail` from controllers once the trigger is tested.
3. Use `runWithNotificationContext` when the template needs data not stored on the row.

---

## Requirements checklist

| Channel | Admin setup | Infrastructure |
|---------|-------------|----------------|
| **EMAIL** | Template row exists and is **active**; optional layout in Channels | SMTP env (`EMAIL_*`), seed/migrate templates |
| **SMS** | SMS template + channel **enabled** | Twilio credentials |
| **WhatsApp** | Template + channel **enabled** | Twilio WhatsApp |
| **Push** | Push template + channel **enabled** | FCM (or platform) env; app registers tokens |

### Useful commands

```bash
# Seed SMS/push templates and channel defaults (see scripts/seedNotificationTemplates.js)
npm run seed:notifications

# Force-update seeds
npm run seed:notifications:force
```

---

## Main file index

| Path | Role |
|------|------|
| `services/notification/notificationService.js` | Central `send` / `sendBulk` |
| `services/notification/templateRepository.js` | DB templates + builders |
| `services/notification/templateRenderer.js` | `{variable}` substitution |
| `services/notification/notificationAdminService.js` | Admin CRUD + preview |
| `services/notification/channelConfig.js` | Channel settings defaults + DB |
| `services/notification/triggerRuleEngine.js` | Code trigger evaluation |
| `services/notification/registerCodeTriggers.js` | Built-in table triggers |
| `services/notification/prismaNotificationMiddleware.js` | Post-DB automatic hooks |
| `services/notification/notificationContext.js` | Extra vars for hook-driven sends |
| `config/notificationTableMap.js` | Prisma model → table / recipient mapping |
| `services/notification/channels/*.js` | Per-channel send |
| `utils/helper.js` | `sendTemplatedEmail`, `sendNotification`, `evaluateNotificationRules` |
| `config/notificationTriggerCatalog.js` | Table/field metadata (reference for developers) |
| `src/views/AdminControllers/AdminNotificationsView.vue` | Admin UI |

---

## Summary

- **Admin** owns templates, email layout, channel on/off, and manual bulk send.
- **Code** owns automatic triggers (`registerCodeTriggers.js` + post-DB hooks); use `helper.runWithNotificationContext` for extra template vars, or direct `sendTemplatedEmail` for cron/one-offs.
- **One pipeline** (`notificationService`) loads DB content, respects channel settings, dispatches to the right provider, and logs every attempt.
