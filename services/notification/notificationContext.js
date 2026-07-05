const { AsyncLocalStorage } = require('async_hooks')

const storage = new AsyncLocalStorage()

/**
 * Attach extra template data / recipient hints for the next Prisma write(s) in this async chain.
 * Used when template variables are not stored on the row (e.g. generated password).
 */
function runWithNotificationContext (context, fn) {
  const parent = storage.getStore() || {}
  const merged = {
    ...parent,
    ...(context || {}),
    data: { ...(parent.data || {}), ...(context?.data || {}) }
  }
  return storage.run(merged, fn)
}

function getNotificationContext () {
  return storage.getStore() || null
}

module.exports = {
  runWithNotificationContext,
  getNotificationContext
}
