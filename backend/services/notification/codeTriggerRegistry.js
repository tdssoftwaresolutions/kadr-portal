const tableHandlers = new Map()
const ruleKeyHandlers = new Map()

function registerTableTrigger (tableName, handler) {
  const key = String(tableName || '').trim()
  if (!key || typeof handler !== 'function') return
  if (!tableHandlers.has(key)) tableHandlers.set(key, [])
  tableHandlers.get(key).push(handler)
}

function registerRuleTrigger (ruleKey, handler) {
  const key = String(ruleKey || '').trim()
  if (!key || typeof handler !== 'function') return
  ruleKeyHandlers.set(key, handler)
}

function normalizeHandlerResult (result) {
  if (!result) return []
  if (Array.isArray(result)) return result.filter(Boolean)
  return [result]
}

/**
 * Code-defined triggers run before DB rules.
 * Handler returns null, a send spec, or an array of send specs:
 * { templateKey, channel, userId?, to?, data?, attachments? }
 */
async function runForContext (ctx) {
  const specs = []
  const tableName = ctx.tableName

  if (tableName && tableHandlers.has(tableName)) {
    for (const fn of tableHandlers.get(tableName)) {
      const result = await fn(ctx)
      specs.push(...normalizeHandlerResult(result))
    }
  }

  if (ctx.ruleKey && ruleKeyHandlers.has(ctx.ruleKey)) {
    const result = await ruleKeyHandlers.get(ctx.ruleKey)(ctx)
    specs.push(...normalizeHandlerResult(result))
  }

  return specs
}

function listRegisteredCodeTriggers () {
  const tables = [...tableHandlers.keys()].map((table_name) => ({
    type: 'table',
    table_name,
    handlerCount: tableHandlers.get(table_name).length
  }))
  const rules = [...ruleKeyHandlers.keys()].map((rule_key) => ({
    type: 'rule_key',
    rule_key
  }))
  return { tables, rules }
}

module.exports = {
  registerTableTrigger,
  registerRuleTrigger,
  runForContext,
  listRegisteredCodeTriggers
}
