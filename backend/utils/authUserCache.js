/**
 * Short-TTL cache for the per-request auth lookup in helper.checkTokenAndFetch.
 * Every authenticated request re-fetches the user row purely to check
 * active/is_deleted (name/email/type already live in the JWT) — this cache
 * removes that DB round trip from the common case. Same pattern as
 * notificationRuleCache.js, but keyed per user id since many distinct users
 * hit this path concurrently.
 */
const prisma = require('../lib/prisma.js')

const CACHE_TTL_MS = 10 * 1000
const cache = new Map()

async function getCachedAuthUser (userId) {
  const cached = cache.get(userId)
  if (cached && Date.now() - cached.loadedAt < CACHE_TTL_MS) {
    return cached.user
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      user_type: true,
      active: true,
      is_deleted: true
    }
  })
  cache.set(userId, { user, loadedAt: Date.now() })
  return user
}

/** Call after any admin action that changes active/is_deleted, so the effect is immediate. */
function invalidateAuthUser (userId) {
  cache.delete(userId)
}

module.exports = { getCachedAuthUser, invalidateAuthUser }
