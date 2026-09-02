/**
 * Audit Log Service
 *
 * Logs significant admin actions for compliance and traceability.
 * Stored in the admin_audit_logs table (create via prisma db push after schema update).
 *
 * For now, logs are written to console in structured JSON format and optionally to the database.
 * This allows log aggregation tools (CloudWatch, Datadog) to capture them immediately,
 * while the DB table provides queryable history.
 */

const prisma = require('../../lib/prisma')

const AUDIT_ACTIONS = {
  USER_ACTIVATED: 'USER_ACTIVATED',
  USER_DEACTIVATED: 'USER_DEACTIVATED',
  USER_DELETED: 'USER_DELETED',
  USER_CREATED: 'USER_CREATED',
  USER_UPDATED: 'USER_UPDATED',
  CASE_ASSIGNED: 'CASE_ASSIGNED',
  CASE_STATUS_CHANGED: 'CASE_STATUS_CHANGED',
  CASE_COMMISSION_CHANGED: 'CASE_COMMISSION_CHANGED',
  MEDIATOR_OFFBOARDED: 'MEDIATOR_OFFBOARDED',
  INVOICE_PAID: 'INVOICE_PAID',
  SETTINGS_CHANGED: 'SETTINGS_CHANGED',
  ADMIN_PERMISSION_CHANGED: 'ADMIN_PERMISSION_CHANGED',
  REWARD_ORDER_FULFILLED: 'REWARD_ORDER_FULFILLED',
  SUBSCRIPTION_GRANTED: 'SUBSCRIPTION_GRANTED',
  NOTIFICATION_SENT: 'NOTIFICATION_SENT',
  WEBSITE_CONTENT_CHANGED: 'WEBSITE_CONTENT_CHANGED'
}

/**
 * Log an admin audit event.
 * @param {object} params
 * @param {string} params.adminId - The admin user who performed the action
 * @param {string} params.action - One of AUDIT_ACTIONS
 * @param {string} [params.targetType] - Type of entity acted upon (user, case, etc.)
 * @param {string} [params.targetId] - ID of the entity acted upon
 * @param {object} [params.details] - Additional context
 * @param {string} [params.requestId] - Request ID for correlation
 */
async function logAuditEvent ({ adminId, action, targetType, targetId, details, requestId }) {
  const entry = {
    level: 'audit',
    timestamp: new Date().toISOString(),
    adminId,
    action,
    targetType: targetType || null,
    targetId: targetId || null,
    details: details || null,
    requestId: requestId || null
  }

  // Always log to console (structured JSON for log aggregation)
  console.log(JSON.stringify(entry))

  // Attempt to persist to database (non-blocking, non-critical)
  try {
    await prisma.$queryRawUnsafe(
      `INSERT INTO admin_audit_logs (id, admin_id, action, target_type, target_id, details, request_id, created_at)
       VALUES (UUID(), ?, ?, ?, ?, ?, ?, NOW())`,
      adminId,
      action,
      targetType || null,
      targetId || null,
      details ? JSON.stringify(details) : null,
      requestId || null
    )
  } catch (err) {
    // DB table might not exist yet — that's OK, console log is the primary output
    if (!String(err.message).includes("doesn't exist") && !String(err.code).includes('P2010')) {
      console.error('[audit] Failed to persist audit log to DB:', err.message)
    }
  }
}

/**
 * Express middleware factory for auditing specific admin actions.
 * Attach after requireAdmin and the main controller logic to log successful operations.
 */
function auditMiddleware (action, { targetType, getTargetId, getDetails } = {}) {
  return (req, res, next) => {
    // Hook into response finish to log after successful response
    const originalJson = res.json.bind(res)
    res.json = function (body) {
      if (res.statusCode >= 200 && res.statusCode < 300 && body?.success !== false) {
        const tid = typeof getTargetId === 'function' ? getTargetId(req, body) : (req.params?.id || req.body?.id)
        const dets = typeof getDetails === 'function' ? getDetails(req, body) : undefined
        logAuditEvent({
          adminId: req.user?.id,
          action,
          targetType,
          targetId: tid,
          details: dets,
          requestId: req.requestId
        }).catch(() => {})
      }
      return originalJson(body)
    }
    next()
  }
}

module.exports = {
  AUDIT_ACTIONS,
  logAuditEvent,
  auditMiddleware
}
