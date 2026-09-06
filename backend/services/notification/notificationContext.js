const { AsyncLocalStorage } = require('async_hooks')

const storage = new AsyncLocalStorage()

// Fallback context stack.
//
// Prisma's $use middleware does NOT execute within the caller's
// AsyncLocalStorage scope (the query engine dispatches middleware across its
// own async boundary), so getNotificationContext() returns null inside the
// middleware and per-write template vars (e.g. a generated password) are lost.
//
// To bridge that gap we also push the context onto a synchronous stack the
// moment runWithNotificationContext is invoked, and pop it when fn() settles.
// Because fn() synchronously initiates the Prisma call — which synchronously
// enters the $use middleware before the caller yields — the middleware can
// read the top-of-stack context reliably for the write(s) it wraps.
const contextStack = []

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
  contextStack.push(merged)
  let popped = false
  const pop = () => {
    if (popped) return
    popped = true
    const idx = contextStack.lastIndexOf(merged)
    if (idx !== -1) contextStack.splice(idx, 1)
  }
  return storage.run(merged, () => {
    let result
    try {
      result = fn()
    } catch (err) {
      pop()
      throw err
    }
    if (result && typeof result.then === 'function') {
      return result.then(
        (v) => { pop(); return v },
        (e) => { pop(); throw e }
      )
    }
    pop()
    return result
  })
}

/**
 * Resolve the active notification context. Prefers the AsyncLocalStorage store
 * (correct inside the caller's own async chain) and falls back to the top of
 * the synchronous stack (needed inside Prisma $use middleware).
 */
function getNotificationContext () {
  return storage.getStore() || contextStack[contextStack.length - 1] || null
}

module.exports = {
  runWithNotificationContext,
  getNotificationContext
}
