const prisma = require('../../lib/prisma')
const codeTriggerRegistry = require('./codeTriggerRegistry')

function getFieldValue (obj, field) {
  if (!obj || !field) return undefined
  if (Object.prototype.hasOwnProperty.call(obj, field)) return obj[field]
  const parts = String(field).split('.')
  let cur = obj
  for (const p of parts) {
    if (cur == null || typeof cur !== 'object') return undefined
    cur = cur[p]
  }
  return cur
}

function asBool (value) {
  if (value === true || value === 1) return true
  if (value === false || value === 0) return false
  const s = String(value ?? '').trim().toLowerCase()
  if (s === 'true' || s === '1' || s === 'yes') return true
  if (s === 'false' || s === '0' || s === 'no' || s === '') return false
  return Boolean(value)
}

function evaluateRule (rule, { previous = {}, current = {} }) {
  const prevVal = getFieldValue(previous, rule.field_name)
  const curVal = getFieldValue(current, rule.field_name)
  const op = rule.operator
  const compare = rule.compare_value

  if (op === 'FIELD_CHANGED') {
    return String(prevVal ?? '') !== String(curVal ?? '')
  }
  if (op === 'CHANGED_TO') {
    const target = compare != null ? String(compare) : ''
    return String(prevVal ?? '') !== target && String(curVal ?? '') === target
  }
  if (op === 'BECAME_TRUE') {
    return !asBool(prevVal) && asBool(curVal)
  }
  if (op === 'BECAME_FALSE') {
    return asBool(prevVal) && !asBool(curVal)
  }
  if (op === 'EQ') {
    return String(curVal ?? '') === String(compare ?? '')
  }
  if (op === 'NEQ') {
    return String(curVal ?? '') !== String(compare ?? '')
  }
  if (op === 'NOT_EMPTY') {
    return curVal !== null && curVal !== undefined && String(curVal).trim() !== ''
  }
  return false
}

async function dispatchSendSpec (spec, meta = {}) {
  const notificationService = require('./notificationService')
  return notificationService.send({
    templateKey: spec.templateKey,
    channel: spec.channel || 'EMAIL',
    userId: spec.userId,
    to: spec.to,
    data: spec.data || {},
    attachments: spec.attachments || [],
    source: meta.source || 'trigger',
    ruleKey: meta.ruleKey || null
  })
}

async function runCodeTriggers (ctx) {
  const specs = await codeTriggerRegistry.runForContext(ctx)
  const outcomes = []
  for (const spec of specs) {
    if (!spec?.templateKey) continue
    try {
      const result = await dispatchSendSpec(spec, { source: 'code_trigger', ruleKey: ctx.ruleKey })
      outcomes.push({ source: 'code', sent: true, templateKey: spec.templateKey, result })
    } catch (err) {
      outcomes.push({ source: 'code', sent: false, templateKey: spec.templateKey, error: err.message })
    }
  }
  return outcomes
}

async function evaluateAndSend ({
  ruleKey,
  tableName,
  previous = {},
  current = {},
  data = {},
  userId,
  to,
  attachments = [],
  skipCodeTriggers = false,
  skipDatabaseRules = false
}) {
  const ctx = { ruleKey, tableName, previous, current, data, userId, to, attachments }
  const codeOutcomes = skipCodeTriggers ? [] : await runCodeTriggers(ctx)

  if (skipDatabaseRules) {
    return { code: codeOutcomes, db: [], sent: codeOutcomes.some((o) => o.sent) }
  }

  const rule = await prisma.notification_trigger_rules.findFirst({
    where: {
      active: true,
      ...(ruleKey ? { rule_key: ruleKey } : {}),
      ...(tableName && !ruleKey ? { table_name: tableName } : {})
    }
  })

  if (!rule) {
    return { code: codeOutcomes, db: [], sent: codeOutcomes.some((o) => o.sent), skipped: true, reason: 'rule_not_found' }
  }

  if (!evaluateRule(rule, { previous, current })) {
    return { code: codeOutcomes, db: [], sent: codeOutcomes.some((o) => o.sent), skipped: true, reason: 'conditions_not_met' }
  }

  const result = await dispatchSendSpec(
    {
      templateKey: rule.template_key,
      channel: rule.channel,
      userId,
      to,
      data,
      attachments
    },
    { source: 'trigger_rule', ruleKey: rule.rule_key }
  )

  return {
    code: codeOutcomes,
    db: [{ ruleKey: rule.rule_key, sent: true, result }],
    sent: true,
    ruleKey: rule.rule_key,
    result
  }
}

async function evaluateTableChange ({
  tableName,
  previous = {},
  current = {},
  data = {},
  userId,
  to,
  attachments = [],
  skipCodeTriggers = false,
  skipDatabaseRules = false
}) {
  const ctx = { tableName, previous, current, data, userId, to, attachments }
  const codeOutcomes = skipCodeTriggers ? [] : await runCodeTriggers(ctx)

  if (skipDatabaseRules) {
    return { code: codeOutcomes, db: codeOutcomes.length ? [] : [] }
  }

  const rules = await prisma.notification_trigger_rules.findMany({
    where: { active: true, table_name: tableName }
  })

  const dbOutcomes = []
  for (const rule of rules) {
    if (!evaluateRule(rule, { previous, current })) {
      dbOutcomes.push({ ruleKey: rule.rule_key, sent: false, skipped: true, reason: 'conditions_not_met' })
      continue
    }
    const result = await dispatchSendSpec(
      {
        templateKey: rule.template_key,
        channel: rule.channel,
        userId,
        to,
        data,
        attachments
      },
      { source: 'trigger_rule', ruleKey: rule.rule_key }
    )
    dbOutcomes.push({ ruleKey: rule.rule_key, sent: true, result })
  }

  return { code: codeOutcomes, db: dbOutcomes }
}

/** Unified entry: code triggers first, then DB rules for the table. */
async function evaluateContext (payload) {
  const {
    ruleKey,
    tableName,
    previous = {},
    current = {},
    data = {},
    userId,
    to,
    attachments = [],
    skipCodeTriggers = false,
    skipDatabaseRules = false
  } = payload

  if (ruleKey) {
    return evaluateAndSend({
      ruleKey,
      tableName,
      previous,
      current,
      data,
      userId,
      to,
      attachments,
      skipCodeTriggers,
      skipDatabaseRules
    })
  }

  if (tableName) {
    return evaluateTableChange({
      tableName,
      previous,
      current,
      data,
      userId,
      to,
      attachments,
      skipCodeTriggers,
      skipDatabaseRules
    })
  }

  return { code: [], db: [], skipped: true, reason: 'missing_table_or_rule_key' }
}

module.exports = {
  evaluateRule,
  evaluateAndSend,
  evaluateTableChange,
  evaluateContext,
  runCodeTriggers,
  getFieldValue,
  codeTriggerRegistry
}
