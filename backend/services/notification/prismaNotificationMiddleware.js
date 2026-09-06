/**
 * Post-DB-write notification framework.
 * After Prisma create/update/upsert, evaluates in-code table triggers only (see registerCodeTriggers.js).
 */
const tableMap = require('../../config/notificationTableMap')
const { getNotificationContext } = require('./notificationContext')

const WRITE_ACTIONS = new Set(['create', 'update', 'upsert'])
const SKIP_MODELS = new Set([
  'notification_templates',
  'notification_channel_settings',
  'notification_trigger_rules',
  'notification_send_logs'
])

let hooksEnabled = process.env.NOTIFICATION_HOOKS !== '0'
let applying = false

function isHooksEnabled () {
  return hooksEnabled
}

function setHooksEnabled (enabled) {
  hooksEnabled = Boolean(enabled)
}

function resolveTableMeta (prismaModel) {
  return tableMap[prismaModel] || null
}

function resolveRecipientUserId (meta, current) {
  if (!meta?.recipientIdField || !current) return null
  const id = current[meta.recipientIdField]
  return id != null ? String(id) : null
}

async function fetchPreviousRow (prisma, params) {
  const delegate = prisma[params.model]
  if (!delegate) return null
  const where = params.args?.where
  if (!where) return null
  try {
    if (delegate.findUnique) {
      return await delegate.findUnique({ where })
    }
    if (delegate.findFirst) {
      return await delegate.findFirst({ where })
    }
  } catch (_) {
    return null
  }
  return null
}

function normalizeCurrentRow (action, result, args) {
  if (result && typeof result === 'object' && !Array.isArray(result)) {
    return result
  }
  if (action === 'create' && args?.data) return args.data
  return result || {}
}

async function runPostWriteEvaluation ({ tableName, previous, current, action, context }) {
  // Prefer an explicitly-captured context. Evaluation is deferred via
  // setImmediate, by which point the AsyncLocalStorage run() scope that held
  // template vars (e.g. the generated password) has already unwound — so
  // getNotificationContext() would return null here and drop data.password,
  // silently skipping the welcomeCredentials email. Callers in this module
  // capture the context synchronously inside the $use hook and pass it in.
  const ctx = context || getNotificationContext() || {}
  const meta = Object.values(tableMap).find((m) => m.tableName === tableName)
  const userId = ctx.userId || resolveRecipientUserId(meta, current) || null

  try {
    const triggerRuleEngine = require('./triggerRuleEngine')
    await triggerRuleEngine.evaluateTableChange({
      tableName,
      previous: previous || {},
      current: current || {},
      userId,
      to: ctx.to,
      data: { ...(ctx.data || {}), _triggerAction: action },
      attachments: ctx.attachments || [],
      skipCodeTriggers: false,
      skipDatabaseRules: true
    })
  } catch (err) {
    console.error(`[notification-hook] ${tableName} post-write failed:`, err.message)
  }
}

function applyNotificationMiddleware (prisma) {
  prisma.$use(async (params, next) => {
    if (!hooksEnabled || applying) return next(params)
    if (!WRITE_ACTIONS.has(params.action)) return next(params)
    if (SKIP_MODELS.has(params.model)) return next(params)

    const meta = resolveTableMeta(params.model)
    if (!meta) return next(params)

    // Capture the notification context synchronously, at the very top of the
    // hook — before any await. Prisma's $use middleware does not run inside the
    // caller's AsyncLocalStorage scope, so this relies on the synchronous
    // fallback stack in notificationContext.js, which is only guaranteed to be
    // populated at this point (the wrapping fn() pops it once the write settles,
    // and the deferred setImmediate below runs even later). Capturing here keeps
    // per-write template vars like the generated password available to the
    // trigger evaluation.
    const capturedContext = getNotificationContext() || {}

    let previous = null
    if (params.action === 'update' || params.action === 'upsert') {
      applying = true
      try {
        previous = await fetchPreviousRow(prisma, params)
      } finally {
        applying = false
      }
    }

    const result = await next(params)
    const current = normalizeCurrentRow(params.action, result, params.args)

    if (params.action === 'create' && !current?.id && result?.id) {
      current.id = result.id
    }

    setImmediate(() => {
      runPostWriteEvaluation({
        tableName: meta.tableName,
        previous,
        current,
        action: params.action,
        context: capturedContext
      }).catch((err) => {
        console.error('[notification-hook] async evaluation error', err.message)
      })
    })

    return result
  })

  return prisma
}

module.exports = {
  applyNotificationMiddleware,
  isHooksEnabled,
  setHooksEnabled,
  runPostWriteEvaluation
}
