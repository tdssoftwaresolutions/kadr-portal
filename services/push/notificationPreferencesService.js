const prisma = require('../../lib/prisma.js')

/**
 * Per-user push notification preferences.
 *
 * Categories map 1:1 to boolean columns on user_notification_preferences.
 * `push_enabled` is the master switch: when false, no category push is sent.
 *
 * A push payload can declare its category via `data.category` (or `data._pushCategory`).
 * If no category is declared, the push is treated as non-categorised and is only
 * gated by the master switch.
 */

const CATEGORIES = Object.freeze([
  'meeting_reminders',
  'case_updates',
  'case_assignment',
  'admin_approvals',
  'admin_support',
  'admin_case'
])

const DEFAULT_PREFERENCES = Object.freeze({
  push_enabled: true,
  meeting_reminders: true,
  case_updates: true,
  case_assignment: true,
  admin_approvals: true,
  admin_support: true,
  admin_case: true
})

function normalizePreferences (row) {
  if (!row) return { ...DEFAULT_PREFERENCES }
  return {
    push_enabled: row.push_enabled,
    meeting_reminders: row.meeting_reminders,
    case_updates: row.case_updates,
    case_assignment: row.case_assignment,
    admin_approvals: row.admin_approvals,
    admin_support: row.admin_support,
    admin_case: row.admin_case
  }
}

async function getPreferences (userId) {
  if (!userId) return { ...DEFAULT_PREFERENCES }
  const row = await prisma.user_notification_preferences.findUnique({
    where: { user_id: userId }
  })
  return normalizePreferences(row)
}

async function savePreferences (userId, input = {}) {
  if (!userId) throw new Error('userId is required')

  const data = {}
  if (input.push_enabled !== undefined) data.push_enabled = Boolean(input.push_enabled)
  for (const cat of CATEGORIES) {
    if (input[cat] !== undefined) data[cat] = Boolean(input[cat])
  }

  const row = await prisma.user_notification_preferences.upsert({
    where: { user_id: userId },
    create: { user_id: userId, ...data },
    update: data
  })
  return normalizePreferences(row)
}

/**
 * Returns true when a push in the given category is allowed for the user.
 * Unknown/empty categories are allowed as long as the master switch is on.
 */
async function isCategoryEnabled (userId, category) {
  if (!userId) return true
  const prefs = await getPreferences(userId)
  if (!prefs.push_enabled) return false
  if (!category) return true
  if (!CATEGORIES.includes(category)) return true
  return prefs[category] !== false
}

module.exports = {
  CATEGORIES,
  DEFAULT_PREFERENCES,
  getPreferences,
  savePreferences,
  isCategoryEnabled
}
