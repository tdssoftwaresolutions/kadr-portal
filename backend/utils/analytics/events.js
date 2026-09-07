/**
 * Canonical catalog of analytics event names and constants.
 *
 * Centralizing names here keeps PostHog clean: no typo-duplicated events, and a
 * single place for product/leadership to see exactly what is tracked. Event
 * names use snake_case, past-tense verbs (PostHog convention), so dashboards
 * read naturally: "user_registered", "meeting_scheduled", etc.
 */

const EVENTS = Object.freeze({
  // Acquisition & auth
  USER_REGISTERED: 'user_registered',
  USER_LOGGED_IN: 'user_logged_in',
  USER_LOGIN_FAILED: 'user_login_failed',
  USER_LOGGED_OUT: 'user_logged_out',

  // Core product activity
  CASE_CREATED: 'case_created',
  CASE_STATUS_CHANGED: 'case_status_changed',
  CASE_CLOSED: 'case_closed',
  MEETING_SCHEDULED: 'meeting_scheduled',
  MEETING_FEEDBACK_SUBMITTED: 'meeting_feedback_submitted',

  // Monetization
  PAYMENT_INITIATED: 'payment_initiated',
  PAYMENT_SUCCEEDED: 'payment_succeeded',
  PAYMENT_FAILED: 'payment_failed',
  SUBSCRIPTION_ACTIVATED: 'subscription_activated',
  REWARD_REDEEMED: 'reward_redeemed',

  // Content & marketing engagement
  BLOG_VIEWED: 'blog_viewed',
  VIDEO_REELS_VIEWED: 'video_reels_viewed',
  WEBSITE_PAGE_VIEWED: 'website_page_viewed',

  // Reliability
  ERROR_OCCURRED: 'error_occurred'
})

/** Terminal case statuses that count as "closed" for created-vs-closed metrics. */
const CLOSED_CASE_STATUSES = Object.freeze([
  'closed_success',
  'closed_no_success',
  'cancelled',
  'failed'
])

/** How the auth/registration happened, for funnel breakdowns. */
const AUTH_METHODS = Object.freeze({
  PASSWORD: 'password',
  GOOGLE: 'google'
})

const USER_TYPES = Object.freeze({
  CLIENT: 'CLIENT',
  MEDIATOR: 'MEDIATOR',
  ADMIN: 'ADMIN',
  REPRESENTATIVE: 'REPRESENTATIVE'
})

/** Where an error surfaced, so leadership can see reliability by area. */
const ERROR_SOURCES = Object.freeze({
  API: 'api',
  DATABASE: 'database',
  PAYMENT: 'payment',
  APP: 'application',
  UNHANDLED: 'unhandled'
})

module.exports = { EVENTS, AUTH_METHODS, USER_TYPES, ERROR_SOURCES, CLOSED_CASE_STATUSES }
