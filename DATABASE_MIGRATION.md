# DATABASE_MIGRATION.md

Strategy and table inventory for migrating the existing MySQL database (managed
today by Prisma `db push`) to **Flyway-versioned** schema management, with **zero
data loss** and preserved IDs/relationships.

---

## Strategy (guide §10, §41)

1. **Baseline, don't recreate.** `V1__baseline.sql` reproduces the *existing*
   schema exactly (names, column types, PKs, FKs, indexes, enums-as-varchar).
2. **Adopt existing DBs** with Flyway `baseline-on-migrate=true` and
   `baseline-version=1`, so a production database that already has these tables is
   marked as being at V1 without re-running DDL.
3. **Additive-only afterwards.** New changes ship as `V2__...`, `V3__...`. No
   silent drops of production tables/columns. Destructive changes require an
   explicit, reviewed migration + backup step.
4. **Preserve `CHAR(36)` UUID string IDs**, assigned by the application (JPA
   `@PrePersist`). Do not convert to auto-increment.
5. **Enums** are represented as MySQL `ENUM`/`VARCHAR` matching current storage;
   JPA maps them with `@Enumerated(EnumType.STRING)`.
6. **Validation:** after baseline, `spring.jpa.hibernate.ddl-auto=validate` in
   non-test profiles ensures entities match the Flyway schema (fail-fast on drift).

---

## Table inventory (≈50 tables)

### Identity & access
| Table | Notes for JPA/Flyway |
|---|---|
| `user` | single table; `user_type` enum(ADMIN,MEDIATOR,CLIENT); unique `(email,user_type)`; `admin_permissions` JSON; referral self-FK; subscription tier/expiry; many relations |
| `otp_resets` | unique `(email,type)`; type enum(MEDIATION,RESET_PASSWORD); dbgenerated uuid id |
| `google_connect` | single-row google auth token (LongText) |
| `user_push_devices` | unique `(user_id,token)` |

### Cases & mediation
| Table | Notes |
|---|---|
| `cases` | central; FKs to user (first_party/second_party/mediator), status, sub_status, agreement; `caseId` human id |
| `case_statuses` / `case_sub_statuses` | lookup; string ids |
| `case_events` | ordered by unique `sequence`; links status+sub_status |
| `case_history` | case ↔ case_event timeline |
| `caseIdTracker` | int autoincrement counter for human case numbers |
| `case_assignment_state` | round-robin last-assigned pointer |
| `events` | calendar events; type enum(PERSONAL,KADR); feedback/ratings |
| `case_agreement_tracking` | signatures (LongText data URLs), agreement link |
| `signature_tracking` | per-user signature requests + expiry |
| `case_messages` | channel enum; threaded (parent_id); PII-removed flag |
| `case_message_attachments` | S3 url + mime |

### Payments & finance
| Table | Notes |
|---|---|
| `payment_orders` | gateway ledger; unique `order_id`; status machine; gateway_response/metadata JSON |
| `transactions` | case payment records (currency default USD in legacy) |
| `mediator_invoices` | monthly commission invoices; status enum(PENDING,PAID); unique invoice_number |
| `mediator_invoice_settings` | per-mediator (unique) invoicing profile |
| `mediator_private_invoices` (+ `_lines`) | private invoicing; status enum; GST fields |
| `mediator_bank_accounts` | one per mediator (unique) |
| `admin_settings` | key/value config (unique key) |

### Subscriptions & rewards
| Table | Notes |
|---|---|
| `mediator_subscriptions` | tier + source enums; amount/refs |
| `premium_feature_catalog` | unique feature_key |
| `reward_catalog_items` | fulfillment_type enum; optional rule FK |
| `reward_fulfillment_rules` | steps JSON |
| `reward_redemption_orders` | status enum(PENDING,FULFILLED) |
| `mediator_reward_transactions` | dedup unique `(mediator,reason,reference)` |

### Notifications
| Table | Notes |
|---|---|
| `notification_templates` | unique `(template_key,channel)`; channel enum |
| `notification_channel_settings` | channel PK; config JSON |
| `notification_trigger_rules` | operator enum; table/field driven |
| `notification_send_logs` | delivery log |
| `notifications` | in-app notifications per user |

### Website, blog & contact (bilingual en/hi)
| Table | Notes |
|---|---|
| `website_settings` | single row `default`; email/phone/whatsapp/address_en/hi/pricing notes |
| `website_banner` | single row `default`; en/hi |
| `website_testimonials` | en/hi + stars + sort |
| `website_pricing_plans` (+ `_features`) | en/hi + popular flag |
| `website_faq_categories` (+ `_items`) | en/hi |
| `blogs` | unique `url` slug; status enum(Draft,Published) |
| `categories` / `tags` | unique name |
| `blog_categories` / `blog_tags` | join tables (composite PK) |
| `blog_comments` | rating + optional user |
| `redirect_blogs` | unique `old_url` → new_url (301s) |
| `website_contact_threads` | origin/status/author enums; portal_user FK |
| `website_contact_messages` | author_type enum |
| `admin_inbox_read_states` | thread read pointers; unique composite |
| `available_languages` | id/language |
| `mediator_video_reels` (`MediatorVideoReel`, `@@map`) | youtube url |

### Mediator tools & ops
| Table | Notes |
|---|---|
| `mediator_court_case_trackers` | unique `(mediator,cnr)`; snapshot JSON |
| `mediator_offboarding_events` | trigger enum(SELF,ADMIN) |
| `scheduler_locks` | job_name PK; distributed lock without Redis |

---

## Flyway layout
```
Kadr on Java/backend/src/main/resources/db/migration/
  V1__baseline.sql          # exact existing schema (this session)
  V2__...                   # future additive changes
```

## Data-preservation checklist (per cutover)
- [ ] Back up MySQL (mysqldump) before first Flyway run.
- [ ] Run Flyway with `baseline-on-migrate` against the existing DB.
- [ ] `ddl-auto=validate` passes (entities ↔ schema).
- [ ] Spot-check row counts for `user`, `cases`, `payment_orders`, `blogs`.
- [ ] Verify existing BCrypt logins succeed against Spring Security.
- [ ] Verify blog slug URLs + `redirect_blogs` still resolve.
