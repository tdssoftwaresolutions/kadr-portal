/**
 * Single PostHog client for the whole process.
 *
 * Mirrors backend/lib/prisma.js: one cached instance on globalThis so nodemon
 * hot-reloads don't spin up multiple senders. When POSTHOG_API_KEY is absent
 * (or POSTHOG_ENABLED=0) this module exposes a no-op client, so calling code
 * never has to guard with `if (posthog)` — tracking simply does nothing.
 *
 * Never throw from this layer. Analytics must never break a user request.
 */
const { PostHog } = require('posthog-node')
const { getPosthogConfig } = require('../config/posthogConfig')

const globalForPosthog = globalThis
const config = getPosthogConfig()

/**
 * A stand-in that satisfies the small slice of the PostHog API we use, so the
 * rest of the codebase is identical whether analytics are on or off.
 */
const noopClient = {
  capture () {},
  identify () {},
  groupIdentify () {},
  alias () {},
  async flush () {},
  async shutdown () {},
  __isNoop: true
}

function createClient () {
  if (!config.enabled) {
    if (!config.apiKey) {
      console.warn('[posthog] POSTHOG_API_KEY not set — product analytics disabled (no-op mode).')
    } else {
      console.warn('[posthog] Analytics force-disabled via POSTHOG_ENABLED=0 (no-op mode).')
    }
    return noopClient
  }

  const client = new PostHog(config.apiKey, {
    host: config.host,
    flushAt: config.flushAt,
    flushInterval: config.flushInterval
  })

  if (config.debug && typeof client.debug === 'function') {
    client.debug(true)
  }

  // Surface transport errors without crashing the app.
  if (typeof client.on === 'function') {
    client.on('error', (err) => {
      console.error('[posthog] client error:', err?.message || err)
    })
  }

  console.log(`[posthog] Analytics enabled — host=${config.host}, env=${config.environment}`)
  return client
}

const posthog = globalForPosthog.__kadrPosthog ?? createClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPosthog.__kadrPosthog = posthog
}

/** True when a real PostHog client is active (useful for tests / diagnostics). */
function isAnalyticsEnabled () {
  return !posthog.__isNoop
}

/** Flush queued events and close the client. Call during graceful shutdown. */
async function shutdownAnalytics () {
  try {
    await posthog.shutdown()
  } catch (err) {
    console.error('[posthog] shutdown error:', err?.message || err)
  }
}

module.exports = posthog
module.exports.client = posthog
module.exports.config = config
module.exports.isAnalyticsEnabled = isAnalyticsEnabled
module.exports.shutdownAnalytics = shutdownAnalytics
