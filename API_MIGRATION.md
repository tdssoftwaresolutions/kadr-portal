# API_MIGRATION.md

Mapping of every legacy Express endpoint to its target Spring Boot `/api/v1`
endpoint. Legacy paths are mounted under `/api` (payment under `/api/payment`).
All target paths are under `/api/v1`. Auth column: 🔓 public · 🔒 authenticated ·
👑 ADMIN · ⚖️ MEDIATOR · 👤 CLIENT.

> Guide §42: map every endpoint; improve where safe; document changes.
> Where the legacy Vue client may run against the new backend during transition,
> a temporary alias controller can expose the old path — noted as "alias".

---

## Auth (`authRoutes`)
| Legacy | Method | Target `/api/v1` | Auth | Notes |
|---|---|---|---|---|
| `/login` | POST | `/auth/login` | 🔓 | multi user-type disambiguation preserved |
| `/google-login` | POST | `/auth/google/login` | 🔓 | Google ID-token verify |
| `/refresh-token` | POST | `/auth/refresh` | 🔓(cookie) | web cookie / mobile body |
| `/logout` | GET | `/auth/logout` | 🔒 | clears refresh cookie |
| `/resetPassword` | POST | `/auth/password/reset-request` | 🔓 | email OTP |
| `/confirmPasswordChange` | POST | `/auth/password/reset-confirm` | 🔓 | verify OTP + set password |
| `/sendOtp` | POST | `/auth/otp/send` | 🔓 | signature OTP via SMS |
| `/verifyOTP` | POST | `/auth/otp/verify` | 🔓 | |
| `/isEmailExist` | GET | `/auth/email-exists` | 🔓 | |
| `/authenticateWithGoogle` | GET | `/integrations/google/authorize` | 👑 | Calendar connect |
| `/googleCallback` | GET | `/integrations/google/callback` | 🔓 | OAuth code exchange |
| `/getGoogleToken` | GET | `/integrations/google/status` | 👑 | |

## Public (`publicRoutes`)
| Legacy | Method | Target | Auth |
|---|---|---|---|
| `/newUserSignup` | POST | `/signup/client` | 🔓 |
| `/newMediatorSignup` | POST | `/signup/mediator` | 🔓 |
| `/public/website-contact-lead` | POST | `/public/contact` | 🔓 |
| `/getSignatureRequestDetails` | GET | `/public/signatures/{id}` | 🔓 |
| `/submitSignature` | POST | `/public/signatures/{id}/submit` | 🔓 |
| `/getAgreementDetailsForSignature` | GET | `/public/agreements/{id}/signature` | 🔓 |
| `/submitAgreementSignature` | POST | `/public/agreements/{id}/signature` | 🔓 |
| `/getBlogs` | GET | `/public/blogs` | 🔓 | also SSR at `/blog` |
| `/getBlog` | GET | `/public/blogs/{idOrSlug}` | 🔓 |
| `/getBlogComments` | GET | `/public/blogs/{id}/comments` | 🔓 |
| `/getBlogAssets`,`/getPublicBlogAssets` | GET | `/public/blogs/assets` | 🔓 |
| `/getPublicMediatorProfile` | GET | `/public/mediators/{id}` | 🔓 |
| `/getPublicVideoReels` | GET | `/public/video-reels` | 🔓 |
| `/getAvailableLanguages` | GET | `/public/languages` | 🔓 |
| `/getExistingUser` | GET | `/public/users/existing` | 🔓 |
| `/public/website-faq` | GET | `/public/faq` | 🔓 |

## Users (`userRoutes`, authenticated)
| Legacy | Method | Target | Auth |
|---|---|---|---|
| `/getUserData` | GET | `/me` | 🔒 |
| `/getDashboardContent` | GET | `/me/dashboard` | 🔒 |
| `/updateUserProfile` | POST | `/me/profile` (PUT) | 🔒 |
| `/deleteMyAccount` | POST | `/me` (DELETE) | 🔒 |
| `/verify-signature` | POST | `/me/verify-signature` | 🔒 |
| `/push/register` | POST | `/me/push-devices` (POST) | 🔒 |
| `/push/unregister` | POST | `/me/push-devices` (DELETE) | 🔒 |
| `/portal/support/threads` | GET | `/me/support/threads` | 🔒 |
| `/portal/support/thread/:id` | GET | `/me/support/threads/{id}` | 🔒 |
| `/portal/support/thread` | POST | `/me/support/threads` | 🔒 |
| `/portal/support/thread/:id/messages` | POST | `/me/support/threads/{id}/messages` | 🔒 |

## Cases (`caseRoutes`, authenticated)
| Legacy | Method | Target | Auth |
|---|---|---|---|
| `/getMediationData` | GET | `/cases` (role-scoped) | 🔒 |
| `/markCaseResolved` | POST | `/cases/{id}/resolve` | 🔒 |
| `/newCase` | POST | `/cases` | 👑 |
| `/initiateNewCase` | POST | `/cases/initiate` | 👤 |
| `/cases/approve-type` | POST | `/cases/{id}/approve-type` | 👑 |
| `/acceptMediationRequest` | POST | `/cases/{id}/accept` | 🔒 |
| `/setClientPayment` | POST | `/cases/{id}/client-payment` | 🔒 |
| `/assignMediator` | POST | `/cases/{id}/assign-mediator` | 👑 |
| `/assignCaseMediator` | POST | `/cases/{id}/assign-mediator` (admin) | 👑 |
| `/getAvailableMediators` | GET | `/mediators/available` | 👑 |
| `/listAllMediatorsWithCases` | GET | `/mediators/with-cases` | 👑 |
| `/activeCases` | GET | `/admin/cases/active` | 👑 |
| `/caseManagementMeta` | GET | `/admin/cases/meta` | 👑 |
| `/case-correspondence` | GET/POST | `/cases/{id}/messages` | 🔒 |
| `/newCalendarEvent` | POST | `/calendar/events` | 🔒 |
| `/getCalendarInit` | GET | `/calendar/init` | 🔒 |
| `/getPastMediations` | GET | `/cases/past` | 🔒 |
| `/submitEventFeedback` | POST | `/calendar/events/{id}/feedback` | 🔒 |
| `/saveNote`,`/deleteNote` | POST | `/notes` (POST/DELETE) | 🔒 |

## Mediator (`mediatorRoutes`, ⚖️)
| Legacy | Target |
|---|---|
| `/mediator/rewards` | `/mediator/rewards` |
| `/mediator/redeem-reward` | `/mediator/rewards/redeem` |
| `/mediator/legal-feeds*` | `/mediator/legal-feeds*` |
| `/mediator/court-cases*` | `/mediator/court-cases*` |
| `/mediator/subscription*` | `/mediator/subscription*` |
| `/mediator/private-invoice-settings*` | `/mediator/invoice-settings*` |
| `/mediator/income` | `/mediator/income` |
| `/mediator/private-invoices*` | `/mediator/private-invoices*` |
| `/mediator-bank-account` | `/mediator/bank-account` |
| `/getMyBlogs`,`/saveBlog`,`/deleteBlog/:id`,`/postBlogComment` | `/mediator/blogs*` |
| `/getMyVideoReels`,`/saveVideoReel`,`/deleteVideoReel/:id` | `/mediator/video-reels*` |

## Finance (`financeRoutes`)
| Legacy | Target | Auth |
|---|---|---|
| `/invoices` | `/finance/invoices` | 🔒 |
| `/invoices/:id/pdf` | `/finance/invoices/{id}/pdf` | 🔒 |

## Payments (`paymentRoutes`, `/api/payment`)
| Legacy | Target | Auth |
|---|---|---|
| `/config` | `/payments/config` | 🔓 |
| `/amounts` | `/payments/amounts` | 🔓 |
| `/initiate` | `/payments/initiate` | 🔒 |
| `/verify` | `/payments/verify` | 🔒 |
| `/return/payu` | `/payments/return/payu` | 🔓 (signed) |
| `/webhook/cashfree` | `/payments/webhooks/cashfree` | 🔓 (signed) |
| `/webhook/phonepe` | `/payments/webhooks/phonepe` | 🔓 (signed) |

## Admin (`adminRoutes`, 👑)
Grouped mapping (see legacy `adminRoutes.js` for the full list; all move under
`/api/v1/admin/**` preserving audit hooks):
- Users: `/admin/users*`, `/admin/users/active`, `getInactiveUsers`→`/admin/users?active=false`, `setUserDeleted`→`DELETE /admin/users/{id}`
- Settings/finance: `/admin/settings`, `/admin/cases/{id}/commission`, `/admin/transactions`, `/admin/invoices/sync`, `/admin/invoices/mark-paid`
- Rewards: `/admin/rewards*`, `/admin/reward-catalog*`, `/admin/reward-orders*`, `/admin/reward-fulfillment-*`
- Mediators: `/admin/mediators/{id}/offboarding-preview|complete-offboarding|360`, `/admin/premium-features`
- Correspondence/inbox: `/admin/correspondence/*`, `/admin/website-contact/*`
- Notifications: `/admin/notifications/*`
- Website content: `/admin/website-content/*`
- Blog taxonomy: `/admin/blog-taxonomy`, `/admin/blog-categories*`, `/admin/blog-tags*`

## SSE
| Legacy | Target |
|---|---|
| `/api/sse/events?token=` | `/api/v1/sse/events?token=` (Spring `SseEmitter`) |

---

### Naming cleanups (guide §15)
Legacy action-style names (`/getUserData`, `/getMediationData`,
`/getDashboardContent`, `/newCase`) become resource-oriented REST. During
transition, alias endpoints may be provided so the unmodified Vue client keeps
working against the new backend; aliases are marked deprecated and removed once
the Angular client is the only consumer.
