/**
 * Critical Alert Service
 *
 * Sends immediate email alerts to the tech team on critical system events:
 * - Unhandled exceptions / uncaught promise rejections
 * - Payment failures
 * - Database connection failures
 * - Scheduler job failures
 * - Repeated 500 errors (threshold-based)
 *
 * Configuration via environment variables:
 *   ALERT_TECH_TEAM_EMAILS - Comma-separated list of email addresses (required)
 *   ALERT_THROTTLE_MINUTES - Minimum minutes between duplicate alerts (default: 5)
 *   ALERT_500_THRESHOLD - Number of 500 errors in window to trigger alert (default: 5)
 *   ALERT_500_WINDOW_MINUTES - Window for counting 500 errors (default: 5)
 */

const nodemailer = require('nodemailer')

const ALERT_CATEGORIES = {
  UNHANDLED_EXCEPTION: 'UNHANDLED_EXCEPTION',
  UNHANDLED_REJECTION: 'UNHANDLED_REJECTION',
  PAYMENT_FAILURE: 'PAYMENT_FAILURE',
  DATABASE_FAILURE: 'DATABASE_FAILURE',
  SCHEDULER_FAILURE: 'SCHEDULER_FAILURE',
  SERVER_ERROR_SPIKE: 'SERVER_ERROR_SPIKE',
  STARTUP_FAILURE: 'STARTUP_FAILURE'
}

// Throttle: track last alert time per category to avoid flooding
const lastAlertTime = new Map()
const error500Window = []

function getThrottleMinutes () {
  return parseInt(process.env.ALERT_THROTTLE_MINUTES, 10) || 5
}

function getTechTeamEmails () {
  const emails = process.env.ALERT_TECH_TEAM_EMAILS || ''
  return emails.split(',').map((e) => e.trim()).filter(Boolean)
}

function shouldThrottle (category) {
  const throttleMs = getThrottleMinutes() * 60 * 1000
  const lastTime = lastAlertTime.get(category) || 0
  if (Date.now() - lastTime < throttleMs) return true
  lastAlertTime.set(category, Date.now())
  return false
}

function getTransporter () {
  const host = process.env.EMAIL_SMTP_HOST
  const port = parseInt(process.env.EMAIL_SMTP_PORT, 10) || 465
  const secure = process.env.EMAIL_SMTP_SECURE !== 'false'
  const user = process.env.EMAIL_USER
  const pass = process.env.EMAIL_PASSWORD

  if (!host || !user || !pass) {
    return null
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    pool: true,
    maxConnections: 2
  })
}

function formatError (error) {
  if (!error) return 'No error details available'
  if (typeof error === 'string') return error
  const parts = []
  if (error.message) parts.push(`Message: ${error.message}`)
  if (error.code) parts.push(`Code: ${error.code}`)
  if (error.stack) parts.push(`\nStack:\n${error.stack}`)
  return parts.join('\n') || String(error)
}

function buildAlertEmail ({ category, subject, details, context = {} }) {
  const env = process.env.NODE_ENV || 'development'
  const host = process.env.BASE_URL || 'unknown'
  const timestamp = new Date().toISOString()

  const html = `
    <div style="font-family:monospace;padding:20px;background:#1a1a2e;color:#eaeaea;">
      <h2 style="color:#e74c3c;margin:0 0 16px;">⚠️ Critical Alert: ${category}</h2>
      <table style="border-collapse:collapse;width:100%;margin-bottom:16px;">
        <tr><td style="padding:4px 8px;color:#aaa;">Environment</td><td style="padding:4px 8px;">${env}</td></tr>
        <tr><td style="padding:4px 8px;color:#aaa;">Server</td><td style="padding:4px 8px;">${host}</td></tr>
        <tr><td style="padding:4px 8px;color:#aaa;">Timestamp</td><td style="padding:4px 8px;">${timestamp}</td></tr>
        <tr><td style="padding:4px 8px;color:#aaa;">PID</td><td style="padding:4px 8px;">${process.pid}</td></tr>
        ${context.requestId ? `<tr><td style="padding:4px 8px;color:#aaa;">Request ID</td><td style="padding:4px 8px;">${context.requestId}</td></tr>` : ''}
        ${context.userId ? `<tr><td style="padding:4px 8px;color:#aaa;">User ID</td><td style="padding:4px 8px;">${context.userId}</td></tr>` : ''}
        ${context.path ? `<tr><td style="padding:4px 8px;color:#aaa;">Path</td><td style="padding:4px 8px;">${context.path}</td></tr>` : ''}
      </table>
      <div style="background:#2d2d44;padding:12px;border-radius:4px;white-space:pre-wrap;font-size:13px;overflow-x:auto;">
${details}
      </div>
    </div>
  `

  const text = `CRITICAL ALERT: ${category}\nEnvironment: ${env}\nServer: ${host}\nTimestamp: ${timestamp}\n\n${details}`

  return { html, text, subject: `[KADR ALERT] ${subject || category} — ${env}` }
}

async function sendAlert ({ category, subject, error, details, context = {} }) {
  const recipients = getTechTeamEmails()
  if (!recipients.length) {
    console.error(`[critical-alert] No ALERT_TECH_TEAM_EMAILS configured. Alert: ${category}`, details || error?.message)
    return
  }

  if (shouldThrottle(category)) {
    console.warn(`[critical-alert] Throttled (${category}). Skipping email.`)
    return
  }

  const detailsText = details || formatError(error)
  const { html, text, subject: emailSubject } = buildAlertEmail({ category, subject, details: detailsText, context })

  const transporter = getTransporter()
  if (!transporter) {
    console.error(`[critical-alert] SMTP not configured. Cannot send alert: ${category}\n${detailsText}`)
    return
  }

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: recipients.join(','),
      subject: emailSubject,
      html,
      text
    })
    console.log(`[critical-alert] Sent ${category} alert to ${recipients.join(', ')}`)
  } catch (err) {
    console.error('[critical-alert] Failed to send alert email:', err.message)
  }
}

// Specific alert functions for common scenarios
function alertUnhandledException (error) {
  sendAlert({
    category: ALERT_CATEGORIES.UNHANDLED_EXCEPTION,
    subject: `Unhandled Exception: ${error?.message?.slice(0, 60) || 'Unknown'}`,
    error
  })
}

function alertUnhandledRejection (reason) {
  sendAlert({
    category: ALERT_CATEGORIES.UNHANDLED_REJECTION,
    subject: `Unhandled Rejection: ${String(reason?.message || reason).slice(0, 60)}`,
    error: reason instanceof Error ? reason : new Error(String(reason))
  })
}

function alertPaymentFailure ({ orderId, gateway, error, userId }) {
  sendAlert({
    category: ALERT_CATEGORIES.PAYMENT_FAILURE,
    subject: `Payment Failed: ${orderId} (${gateway})`,
    details: `Order: ${orderId}\nGateway: ${gateway}\nUser: ${userId || 'unknown'}\nError: ${formatError(error)}`,
    context: { userId }
  })
}

function alertDatabaseFailure (error) {
  sendAlert({
    category: ALERT_CATEGORIES.DATABASE_FAILURE,
    subject: 'Database Connection Failure',
    error
  })
}

function alertSchedulerFailure ({ jobName, error }) {
  sendAlert({
    category: ALERT_CATEGORIES.SCHEDULER_FAILURE,
    subject: `Scheduler Job Failed: ${jobName}`,
    details: `Job: ${jobName}\n${formatError(error)}`
  })
}

function alertStartupFailure (error) {
  sendAlert({
    category: ALERT_CATEGORIES.STARTUP_FAILURE,
    subject: 'Server Startup Failed',
    error
  })
}

/**
 * Track 500 errors; trigger alert if threshold exceeded in window.
 */
function record500Error ({ path, method, requestId, userId, error }) {
  const threshold = parseInt(process.env.ALERT_500_THRESHOLD, 10) || 5
  const windowMs = (parseInt(process.env.ALERT_500_WINDOW_MINUTES, 10) || 5) * 60 * 1000
  const now = Date.now()

  error500Window.push({ time: now, path, method, requestId, error: error?.message })

  // Prune old entries
  while (error500Window.length && error500Window[0].time < now - windowMs) {
    error500Window.shift()
  }

  if (error500Window.length >= threshold) {
    const recentPaths = error500Window.slice(-10).map((e) => `${e.method} ${e.path}`).join('\n')
    sendAlert({
      category: ALERT_CATEGORIES.SERVER_ERROR_SPIKE,
      subject: `500 Error Spike: ${error500Window.length} errors in ${Math.round(windowMs / 60000)}min`,
      details: `${error500Window.length} server errors in the last ${Math.round(windowMs / 60000)} minutes.\n\nRecent paths:\n${recentPaths}`,
      context: { requestId, userId, path }
    })
    // Clear window after alerting to prevent repeated alerts
    error500Window.length = 0
  }
}

module.exports = {
  ALERT_CATEGORIES,
  sendAlert,
  alertUnhandledException,
  alertUnhandledRejection,
  alertPaymentFailure,
  alertDatabaseFailure,
  alertSchedulerFailure,
  alertStartupFailure,
  record500Error
}
