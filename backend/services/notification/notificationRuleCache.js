const prisma = require('../../lib/prisma')

const CACHE_TTL_MS = 60 * 1000
let cache = { loadedAt: 0, byTable: new Map() }

async function refreshRuleCache () {
  const rows = await prisma.notification_trigger_rules.findMany({
    where: { active: true },
    orderBy: { rule_key: 'asc' }
  })
  const byTable = new Map()
  for (const row of rows) {
    const key = String(row.table_name || '').trim()
    if (!key) continue
    if (!byTable.has(key)) byTable.set(key, [])
    byTable.get(key).push(row)
  }
  cache = { loadedAt: Date.now(), byTable }
  return cache
}

async function getRulesForTable (tableName) {
  const name = String(tableName || '').trim()
  if (!name) return []
  if (Date.now() - cache.loadedAt > CACHE_TTL_MS) {
    await refreshRuleCache()
  }
  return cache.byTable.get(name) || []
}

function invalidateRuleCache () {
  cache.loadedAt = 0
}

module.exports = {
  refreshRuleCache,
  getRulesForTable,
  invalidateRuleCache
}
