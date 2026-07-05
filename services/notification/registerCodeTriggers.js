/**
 * In-code notification triggers (post-DB hooks). Register handlers here.
 * Loaded from server.js on startup.
 */
const { registerTableTrigger } = require('./codeTriggerRegistry')

/** Welcome email when admin approves a user (active: false → true) with password in context. */
registerTableTrigger('user', async ({ previous, current, userId, data }) => {
  if (previous?.active !== false || current?.active !== true) return null
  if (!data?.password) return null

  return {
    templateKey: 'welcomeCredentials',
    channel: 'EMAIL',
    userId,
    data: data || {}
  }
})

module.exports = {}
