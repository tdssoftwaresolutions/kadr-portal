/**
 * Analytics helpers — the single interface the application uses to send product
 * events to PostHog.
 *
 * Usage (from any controller/service):
 *
 *   const analytics = require('../utils/analytics')
 *   analytics.trackLogin({ req, user, method: 'password' })
 *   analytics.trackCaseCreated({ req, actorUserId, caseRecord })
 *
 * Principles:
 *  - NEVER throw. Every function is wrapped so analytics can't break a request.
 *  - NEVER block. posthog-node batches and flushes in the background.
 *  - distinctId = user.id (a stable UUID). Anonymous events use a synthetic id.
 *  - Request context (IP, geo, device) is auto-attached when a `req` is passed,
 *    so every event can be filtered by location and device in PostHog.
 *  - We identify users (person profiles) so leadership can view the full
 *    activity timeline for a given email/username in PostHog's Persons view.
 */
const posthog = require('../../lib/posthog')
const { buildRequestContext } = require('./requestContext')
const { EVENTS, AUTH_METHODS, USER_TYPES, ERROR_SOURCES, CLOSED_CASE_STATUSES } = require('./events')
const { getPosthogConfig } = require('../../config/posthogConfig')

const config = getPosthogConfig()

const ANONYMOUS_PREFIX = 'anon:'

function safe (fn) {
  try {
    fn()
  } catch (err) {
    // Analytics failures must be invisible to the user path.
    console.error('[analytics] capture failed:', err?.message || err)
  }
}

function baseProps (extra) {
  return {
    environment: config.environment,
    ...extra
  }
}

/**
 * Build a person-properties object from a user record. `$set` updates the
 * profile every time; `$set_once` only sets on first sight (e.g. signup date).
 * Note: we intentionally include email/name so the team can search a person by
 * email/username in PostHog and see all their activity — this is a deliberate
 * product decision for an internal B2B admin tool, not consumer PII at scale.
 */
function personProperties (user) {
  if (!user) return {}
  const set = {}
  if (user.email) set.email = user.email
  if (user.name) set.name = user.name
  const type = user.user_type || user.type
  if (type) set.user_type = type
  if (user.city) set.city = user.city
  if (user.state) set.state = user.state
  if (user.subscription_tier) set.subscription_tier = user.subscription_tier
  return set
}

/**
 * Identify / update a person profile in PostHog. Call on login and registration
 * so the person timeline is always attributable to a real email.
 */
function identifyUser ({ user, req } = {}) {
  safe(() => {
    if (!user || !user.id) return
    posthog.identify({
      distinctId: user.id,
      properties: {
        ...personProperties(user),
        ...buildRequestContext(req)
      }
    })
  })
}

/**
 * Low-level capture. Prefer the typed helpers below; use this only for events
 * not yet covered by a dedicated function.
 */
function capture ({ event, distinctId, req, properties = {}, user } = {}) {
  safe(() => {
    if (!event) return
    const id = distinctId || user?.id || `${ANONYMOUS_PREFIX}${req?.requestId || 'unknown'}`
    posthog.capture({
      distinctId: id,
      event,
      properties: baseProps({
        ...buildRequestContext(req),
        ...properties,
        // When we only have an anonymous id, tell PostHog not to create a
        // lingering person profile for a one-off failed action.
        ...(!user?.id && !distinctId ? { $process_person_profile: false } : {})
      })
    })
  })
}

/* ------------------------------------------------------------------ *
 * Typed event helpers
 * ------------------------------------------------------------------ */

/**
 * A new account was created (client or mediator self-signup).
 * @param {object} p
 * @param {import('express').Request} [p.req]
 * @param {object} p.user            created user record ({ id, email, name, user_type, ... })
 * @param {string} [p.userType]      explicit user type if user record lacks it
 * @param {boolean} [p.selfSignup]   whether this was a self-service signup
 * @param {string} [p.method]        AUTH_METHODS value
 * @param {object} [p.extra]         additional properties
 */
function trackRegistration ({ req, user, userType, selfSignup, method = AUTH_METHODS.PASSWORD, extra = {} } = {}) {
  safe(() => {
    const type = user?.user_type || user?.type || userType
    // Person profile first, so the registration is attributable.
    if (user?.id) {
      posthog.identify({
        distinctId: user.id,
        properties: {
          ...personProperties({ ...user, user_type: type }),
          ...buildRequestContext(req),
          $set_once: { signed_up_at: new Date().toISOString() }
        }
      })
    }
    capture({
      event: EVENTS.USER_REGISTERED,
      user,
      req,
      properties: {
        user_type: type,
        auth_method: method,
        self_signup: selfSignup === true,
        ...extra
      }
    })
  })
}

/**
 * A successful login. Attaches time, location and device automatically.
 */
function trackLogin ({ req, user, method = AUTH_METHODS.PASSWORD, extra = {} } = {}) {
  safe(() => {
    identifyUser({ user, req })
    capture({
      event: EVENTS.USER_LOGGED_IN,
      user,
      req,
      properties: {
        user_type: user?.user_type || user?.type,
        auth_method: method,
        ...extra
      }
    })
  })
}

/**
 * A failed login attempt (bad credentials, inactive account, etc.). Useful for
 * spotting brute-force patterns and friction. Kept anonymous (no person profile).
 */
function trackLoginFailed ({ req, emailAttempted, reason, method = AUTH_METHODS.PASSWORD } = {}) {
  capture({
    event: EVENTS.USER_LOGIN_FAILED,
    req,
    properties: {
      auth_method: method,
      failure_reason: reason,
      // Hash-free but low-cardinality-friendly: keep the attempted email so the
      // team can investigate account-specific issues in an internal tool.
      email_attempted: emailAttempted
    }
  })
}

function trackLogout ({ req, user } = {}) {
  capture({ event: EVENTS.USER_LOGGED_OUT, user, req })
}

/**
 * A dispute case was created.
 * @param {object} p
 * @param {string} p.actorUserId  who created it (first party / admin)
 * @param {object} p.caseRecord   { id, caseId, category, case_type, status, ... }
 */
function trackCaseCreated ({ req, actorUserId, caseRecord = {}, extra = {} } = {}) {
  capture({
    event: EVENTS.CASE_CREATED,
    distinctId: actorUserId,
    req,
    properties: {
      case_id: caseRecord.id,
      case_ref: caseRecord.caseId,
      category: caseRecord.category,
      case_type: caseRecord.case_type,
      status: caseRecord.status,
      ...extra
    }
  })
}

/**
 * Compute whole days between two dates (>= 0), or undefined if inputs are bad.
 */
function daysBetween (from, to) {
  const a = from ? new Date(from) : null
  const b = to ? new Date(to) : null
  if (!a || !b || Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return undefined
  return Math.max(0, Math.round((b - a) / 86400000))
}

/**
 * A case moved from one status/sub_status to another. Powers the pipeline view
 * (how cases flow through the lifecycle, where they stall).
 * @param {object} p
 * @param {object} p.caseRecord  { id, caseId, category, case_type }
 * @param {string} [p.fromStatus] previous status
 * @param {string} p.toStatus     new status
 */
function trackCaseStatusChanged ({ req, actorUserId, caseRecord = {}, fromStatus, toStatus, fromSubStatus, toSubStatus, extra = {} } = {}) {
  capture({
    event: EVENTS.CASE_STATUS_CHANGED,
    distinctId: actorUserId,
    req,
    properties: {
      case_id: caseRecord.id,
      case_ref: caseRecord.caseId,
      category: caseRecord.category,
      case_type: caseRecord.case_type,
      from_status: fromStatus,
      to_status: toStatus,
      from_sub_status: fromSubStatus,
      to_sub_status: toSubStatus,
      ...(!actorUserId && !req?.user?.id ? { $process_person_profile: false } : {}),
      ...extra
    }
  })
}

/**
 * A case reached a terminal/closed state. Carries the case's creation time and a
 * computed `days_open` so PostHog cohorts can answer: created this month but not
 * closed yet, created one month and closed a later month/FY, resolution rate, etc.
 * @param {object} p
 * @param {object} p.caseRecord  { id, caseId, category, case_type, created_at }
 * @param {string} p.status      terminal status (closed_success / closed_no_success / cancelled / failed)
 */
function trackCaseClosed ({ req, actorUserId, caseRecord = {}, status, extra = {} } = {}) {
  const createdAt = caseRecord.created_at
  const closedAt = new Date()
  const resolvedSuccessfully = status === 'closed_success'
  capture({
    event: EVENTS.CASE_CLOSED,
    distinctId: actorUserId,
    req,
    properties: {
      case_id: caseRecord.id,
      case_ref: caseRecord.caseId,
      category: caseRecord.category,
      case_type: caseRecord.case_type,
      close_status: status,
      resolved_successfully: resolvedSuccessfully,
      case_created_at: createdAt ? new Date(createdAt).toISOString() : undefined,
      case_closed_at: closedAt.toISOString(),
      days_open: daysBetween(createdAt, closedAt),
      ...(!actorUserId && !req?.user?.id ? { $process_person_profile: false } : {}),
      ...extra
    }
  })
}

/**
 * A payment was started (order created, before the gateway result). Combined
 * with payment_succeeded / payment_failed this gives payment conversion.
 */
function trackPaymentInitiated ({ req, payerUserId, orderId, amount, currency = 'INR', gateway, purpose, caseId, extra = {} } = {}) {
  capture({
    event: EVENTS.PAYMENT_INITIATED,
    distinctId: payerUserId,
    req,
    properties: {
      order_id: orderId,
      amount: amount != null ? Number(amount) : undefined,
      currency,
      gateway,
      purpose,
      case_id: caseId,
      ...extra
    }
  })
}

/**
 * A payment failed at the gateway. Fired centrally where the order is marked
 * FAILED, so it covers web, mobile and webhook paths. No `req` in that path, so
 * the payer id comes from the order.
 */
function trackPaymentFailed ({ req, payerUserId, orderId, amount, currency = 'INR', gateway, purpose, caseId, reason, extra = {} } = {}) {
  capture({
    event: EVENTS.PAYMENT_FAILED,
    distinctId: payerUserId,
    req,
    properties: {
      order_id: orderId,
      amount: amount != null ? Number(amount) : undefined,
      currency,
      gateway,
      purpose,
      case_id: caseId,
      failure_reason: reason,
      ...(!payerUserId && !req?.user?.id ? { $process_person_profile: false } : {}),
      ...extra
    }
  })
}

/**
 * A mediator redeemed reward points for a catalog item. Tells us how many
 * redemptions happen and exactly what items mediators buy with points.
 */
function trackRewardRedeemed ({ req, mediatorId, itemId, itemTitle, pointsSpent, status, orderId, extra = {} } = {}) {
  capture({
    event: EVENTS.REWARD_REDEEMED,
    distinctId: mediatorId,
    req,
    properties: {
      reward_item_id: itemId,
      reward_item_title: itemTitle,
      points_spent: pointsSpent != null ? Number(pointsSpent) : undefined,
      order_status: status,
      order_id: orderId,
      ...extra
    }
  })
}

/**
 * A public blog post was viewed by a reader.
 */
function trackBlogViewed ({ req, blog = {}, extra = {} } = {}) {
  capture({
    event: EVENTS.BLOG_VIEWED,
    req,
    properties: {
      blog_id: blog.id,
      blog_title: blog.title,
      blog_url: blog.url,
      author_id: blog.author_id,
      author_name: blog.author_name,
      // Public content view — don't attach a person profile.
      $process_person_profile: false,
      ...extra
    }
  })
}

/**
 * The public video-reels feed was viewed. Only a list endpoint exists, so we
 * track the feed view with the page and the reels shown.
 */
function trackVideoReelsViewed ({ req, page, count, reelIds = [], extra = {} } = {}) {
  capture({
    event: EVENTS.VIDEO_REELS_VIEWED,
    req,
    properties: {
      page,
      reels_count: count,
      reel_ids: Array.isArray(reelIds) ? reelIds.slice(0, 20) : undefined,
      $process_person_profile: false,
      ...extra
    }
  })
}

/**
 * A page on the public marketing website was viewed. Fired by a dedicated
 * middleware that filters out API/admin/asset requests. Anonymous by design.
 */
function trackWebsitePageView ({ req, path: pagePath, extra = {} } = {}) {
  capture({
    event: EVENTS.WEBSITE_PAGE_VIEWED,
    req,
    properties: {
      page_path: pagePath || req?.path,
      referrer: req?.headers?.referer || req?.headers?.referrer,
      $process_person_profile: false,
      ...extra
    }
  })
}

/**
 * A meeting/mediation session was scheduled.
 * @param {object} p
 * @param {string} [p.actorUserId]  who scheduled it (mediator/admin/system)
 * @param {object} p.meeting        { id, start_datetime, end_datetime, type, case_id }
 */
function trackMeetingScheduled ({ req, actorUserId, meeting = {}, extra = {} } = {}) {
  const start = meeting.start_datetime ? new Date(meeting.start_datetime) : null
  const end = meeting.end_datetime ? new Date(meeting.end_datetime) : null
  const durationMinutes = start && end ? Math.round((end - start) / 60000) : undefined
  capture({
    event: EVENTS.MEETING_SCHEDULED,
    distinctId: actorUserId,
    req,
    properties: {
      meeting_id: meeting.id,
      case_id: meeting.case_id,
      meeting_type: meeting.type,
      scheduled_start: start ? start.toISOString() : undefined,
      duration_minutes: durationMinutes,
      has_meeting_link: Boolean(meeting.meeting_link),
      ...extra
    }
  })
}

/**
 * Post-meeting feedback / rating submitted by a participant.
 */
function trackMeetingFeedback ({ req, actorUserId, meetingId, caseId, rating, party, extra = {} } = {}) {
  capture({
    event: EVENTS.MEETING_FEEDBACK_SUBMITTED,
    distinctId: actorUserId,
    req,
    properties: {
      meeting_id: meetingId,
      case_id: caseId,
      rating,
      party,
      ...extra
    }
  })
}

/**
 * A payment was successfully received. Money detail lives in the DB
 * (transactions / payment_orders); here we track it as a product event so the
 * team can see transaction volume, gateway split, and value over time. Amount is
 * included as a numeric property to power revenue trends in PostHog.
 */
function trackPaymentSucceeded ({ req, payerUserId, amount, currency = 'INR', gateway, purpose, caseId, transactionId, extra = {} } = {}) {
  const numericAmount = amount != null ? Number(amount) : undefined
  capture({
    event: EVENTS.PAYMENT_SUCCEEDED,
    distinctId: payerUserId,
    req,
    properties: {
      amount: Number.isFinite(numericAmount) ? numericAmount : undefined,
      currency,
      gateway,
      purpose,
      case_id: caseId,
      transaction_id: transactionId,
      ...extra
    }
  })
}

/**
 * A pro/premium subscription was activated (e.g. mediator PRO).
 */
function trackSubscriptionActivated ({ req, userId, amount, currency = 'INR', source, durationDays, extra = {} } = {}) {
  capture({
    event: EVENTS.SUBSCRIPTION_ACTIVATED,
    distinctId: userId,
    req,
    properties: {
      amount: amount != null ? Number(amount) : undefined,
      currency,
      source,
      duration_days: durationDays,
      ...extra
    }
  })
}

/**
 * An error occurred (API failure, DB error, unhandled exception). Powers a
 * reliability dashboard: error rate by route, by source, over time.
 * @param {object} p
 * @param {Error|object} p.error
 * @param {string} [p.source]  ERROR_SOURCES value
 */
function trackError ({ req, error = {}, source = ERROR_SOURCES.UNHANDLED, statusCode, userId, extra = {} } = {}) {
  capture({
    event: EVENTS.ERROR_OCCURRED,
    distinctId: userId || req?.user?.id,
    req,
    properties: {
      error_source: source,
      error_name: error?.name,
      error_code: error?.errorCode || error?.code,
      error_message: typeof error?.message === 'string' ? error.message.slice(0, 500) : undefined,
      status_code: statusCode,
      route: req?.originalUrl || req?.path,
      http_method: req?.method,
      // Don't create/attach a person profile for anonymous error hits.
      ...(userId || req?.user?.id ? {} : { $process_person_profile: false }),
      ...extra
    }
  })
}

module.exports = {
  // constants
  EVENTS,
  AUTH_METHODS,
  USER_TYPES,
  ERROR_SOURCES,
  CLOSED_CASE_STATUSES,
  // low level
  capture,
  identifyUser,
  // typed helpers
  trackRegistration,
  trackLogin,
  trackLoginFailed,
  trackLogout,
  trackCaseCreated,
  trackCaseStatusChanged,
  trackCaseClosed,
  trackMeetingScheduled,
  trackMeetingFeedback,
  trackPaymentInitiated,
  trackPaymentSucceeded,
  trackPaymentFailed,
  trackSubscriptionActivated,
  trackRewardRedeemed,
  trackBlogViewed,
  trackVideoReelsViewed,
  trackWebsitePageView,
  trackError,
  // passthrough
  isAnalyticsEnabled: posthog.isAnalyticsEnabled,
  shutdownAnalytics: posthog.shutdownAnalytics
}
