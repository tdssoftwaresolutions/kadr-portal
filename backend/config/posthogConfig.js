/**
 * PostHog analytics configuration.
 *
 * Server-side analytics are OPTIONAL: if POSTHOG_API_KEY is not set, the whole
 * analytics layer becomes a safe no-op (see backend/lib/posthog.js). This keeps
 * local development and self-hosted deployments working without any PostHog
 * account, while production can enable rich product analytics by supplying a key.
 *
 * Environment variables:
 *   POSTHOG_API_KEY          Project API key (write-only "phc_..." key). Required to enable tracking.
 *   POSTHOG_HOST             Ingestion host. Defaults to PostHog US Cloud.
 *                            Use https://eu.i.posthog.com for EU Cloud, or your self-hosted URL.
 *   POSTHOG_ENABLED          Set to "0" to force-disable even when a key is present (e.g. staging).
 *   POSTHOG_FLUSH_AT         Number of queued events before an automatic flush (default 20).
 *   POSTHOG_FLUSH_INTERVAL   Max ms to hold events before flushing (default 10000).
 *   POSTHOG_DISABLE_GEOIP    Set to "1" to skip server-side GeoIP enrichment.
 *   POSTHOG_DEBUG            Set to "1" to log SDK debug output.
 */

function toBool (value, defaultValue) {
  if (value === undefined || value === null || value === '') return defaultValue
  return !['0', 'false', 'no', 'off'].includes(String(value).toLowerCase())
}

function toInt (value, defaultValue) {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : defaultValue
}

function getPosthogConfig () {
  const apiKey = process.env.POSTHOG_API_KEY || ''
  const explicitlyEnabled = toBool(process.env.POSTHOG_ENABLED, true)

  return {
    apiKey,
    host: process.env.POSTHOG_HOST || 'https://us.i.posthog.com',
    // Analytics are active only when we have a key AND haven't been force-disabled.
    enabled: Boolean(apiKey) && explicitlyEnabled,
    flushAt: toInt(process.env.POSTHOG_FLUSH_AT, 20),
    flushInterval: toInt(process.env.POSTHOG_FLUSH_INTERVAL, 10000),
    // Whether to attach server-side GeoIP location (country/region/city) to events.
    geoipEnabled: !toBool(process.env.POSTHOG_DISABLE_GEOIP, false),
    debug: toBool(process.env.POSTHOG_DEBUG, false),
    environment: process.env.NODE_ENV || 'development'
  }
}

/**
 * Derive the assets host from the ingestion host. PostHog serves the browser
 * SDK bundle from a sibling "*-assets" origin (e.g. us.i.posthog.com ->
 * us-assets.i.posthog.com, eu.i.posthog.com -> eu-assets.i.posthog.com).
 * Self-hosted instances serve assets from the same origin.
 */
function deriveAssetsHost (ingestHost) {
  try {
    const url = new URL(ingestHost)
    const m = url.hostname.match(/^(us|eu)\.i\.posthog\.com$/)
    if (m) {
      return `${url.protocol}//${m[1]}-assets.i.posthog.com`
    }
    return `${url.protocol}//${url.hostname}`
  } catch (e) {
    return 'https://us-assets.i.posthog.com'
  }
}

/**
 * Public (browser-safe) PostHog config for the client-side SDK on the marketing
 * website. The project API key is not a secret — it is a write-only ingest key
 * meant to be embedded in browser code. Returns null-ish (enabled:false) when no
 * key is configured, so the browser snippet stays completely inert.
 *
 * `ui_host` is used only so links inside the SDK point at the PostHog app.
 */
function getPosthogBrowserConfig () {
  const cfg = getPosthogConfig()
  const assetsHost = deriveAssetsHost(cfg.host)
  return {
    enabled: cfg.enabled,
    key: cfg.enabled ? cfg.apiKey : '',
    apiHost: cfg.host,
    assetsHost,
    // Hosts the browser must be allowed to reach (for CSP allowlisting).
    origins: [cfg.host, assetsHost]
  }
}

module.exports = { getPosthogConfig, getPosthogBrowserConfig, deriveAssetsHost }
