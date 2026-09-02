/**
 * High-level push helpers for domain events.
 *
 * These build a title/body directly and honour per-user preferences via the
 * category gate, so they work even without a configured notification template.
 * For template-driven pushes, use notificationService.send({ channel: 'PUSH' }).
 */
const pushService = require('./pushService')
const { isCategoryEnabled } = require('./notificationPreferencesService')

/**
 * Send a categorised push to a single user, respecting their preferences.
 * Returns { skipped } when the user opted out of the category or has no devices.
 */
async function notifyUser ({ userId, category, title, body, data = {} }) {
  if (!userId) return { skipped: true, reason: 'no_user' }
  try {
    const allowed = await isCategoryEnabled(userId, category)
    if (!allowed) return { skipped: true, reason: 'category_disabled' }

    return await pushService.sendToUser(userId, {
      title,
      body,
      data: { category, ...data }
    })
  } catch (err) {
    console.error('[pushEvents] notifyUser failed', err.message)
    return { skipped: true, error: err.message }
  }
}

/** Fan out the same categorised push to several users (deduplicated). */
async function notifyUsers ({ userIds = [], category, title, body, data = {} }) {
  const unique = [...new Set(userIds.filter(Boolean))]
  const results = await Promise.all(
    unique.map((userId) => notifyUser({ userId, category, title, body, data }))
  )
  return { total: unique.length, results }
}

module.exports = { notifyUser, notifyUsers }
