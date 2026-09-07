/**
 * Request enrichment for analytics: derive IP, geolocation, and device/browser
 * from an Express request so PostHog events can be filtered by location and
 * device without any client-side SDK.
 *
 * Design notes:
 *  - GeoIP uses the offline `geoip-lite` database (no external calls, no PII
 *    leaves the server). It gives country / region / city / lat-long / timezone.
 *  - Device parsing uses `ua-parser-js` (browser, OS, device type).
 *  - We deliberately reuse PostHog's canonical property names (`$geoip_*`,
 *    `$browser`, `$os`, `$device_type`, `$ip`) so the values light up the
 *    built-in "Web analytics", world-map, and device breakdown views.
 *  - Everything is wrapped in try/catch and returns {} on failure. Analytics
 *    must never break a request.
 */
const geoip = require('geoip-lite')
const { UAParser } = require('ua-parser-js')
const { getPosthogConfig } = require('../../config/posthogConfig')

const config = getPosthogConfig()

/**
 * Extract the best-guess client IP, honoring the proxy chain. Express sets
 * req.ip; behind load balancers we prefer the left-most X-Forwarded-For entry.
 */
function extractClientIp (req) {
  if (!req) return null
  const forwarded = req.headers && req.headers['x-forwarded-for']
  if (forwarded) {
    const first = String(forwarded).split(',')[0].trim()
    if (first) return normalizeIp(first)
  }
  const realIp = req.headers && req.headers['x-real-ip']
  if (realIp) return normalizeIp(String(realIp).trim())
  return normalizeIp(req.ip || req.connection?.remoteAddress || null)
}

/** Strip IPv6-mapped IPv4 prefix (::ffff:1.2.3.4 -> 1.2.3.4). */
function normalizeIp (ip) {
  if (!ip) return null
  return ip.startsWith('::ffff:') ? ip.slice(7) : ip
}

function isPrivateOrLocalIp (ip) {
  if (!ip) return true
  return (
    ip === '127.0.0.1' ||
    ip === '::1' ||
    ip.startsWith('10.') ||
    ip.startsWith('192.168.') ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(ip)
  )
}

/** Resolve country/region/city from an IP using the offline database. */
function lookupGeo (ip) {
  if (!config.geoipEnabled) return null
  if (!ip || isPrivateOrLocalIp(ip)) return null
  try {
    const geo = geoip.lookup(ip)
    if (!geo) return null
    return {
      $geoip_country_code: geo.country || undefined,
      $geoip_subdivision_1_name: geo.region || undefined,
      $geoip_city_name: geo.city || undefined,
      $geoip_time_zone: geo.timezone || undefined,
      $geoip_latitude: Array.isArray(geo.ll) ? geo.ll[0] : undefined,
      $geoip_longitude: Array.isArray(geo.ll) ? geo.ll[1] : undefined
    }
  } catch (err) {
    return null
  }
}

/** Map ua-parser device output to PostHog's $device_type buckets. */
function normalizeDeviceType (parsed, isMobileHint) {
  const raw = parsed?.device?.type
  if (raw === 'mobile' || raw === 'wearable') return 'Mobile'
  if (raw === 'tablet') return 'Tablet'
  if (raw === 'smarttv' || raw === 'console') return 'Other'
  if (!raw && isMobileHint) return 'Mobile'
  return 'Desktop'
}

/** Parse the User-Agent into browser / OS / device properties. */
function parseUserAgent (userAgent, isMobileHint) {
  if (!userAgent) return {}
  try {
    const parsed = new UAParser(userAgent).getResult()
    return {
      $browser: parsed.browser?.name || undefined,
      $browser_version: parsed.browser?.version || undefined,
      $os: parsed.os?.name || undefined,
      $os_version: parsed.os?.version || undefined,
      $device: parsed.device?.model || undefined,
      $device_type: normalizeDeviceType(parsed, isMobileHint),
      device_vendor: parsed.device?.vendor || undefined
    }
  } catch (err) {
    return {}
  }
}

/**
 * Build the enrichment property bag for a request. Safe to call with a partial
 * or missing req. Returns PostHog-friendly properties describing where and on
 * what device the action happened.
 *
 * @param {import('express').Request} req
 * @returns {object} properties to merge into an event's `properties`
 */
function buildRequestContext (req) {
  try {
    if (!req) return {}
    const ip = extractClientIp(req)
    const userAgent = req.headers ? req.headers['user-agent'] : undefined

    // Detect our own mobile app clients (the app sets a custom header/flag).
    let isMobileClient = false
    try {
      isMobileClient = require('../mobileClient').isMobileClientRequest(req)
    } catch (e) { /* mobileClient may be unavailable in some contexts */ }

    const props = {
      $ip: ip || undefined,
      $current_url: req.originalUrl || req.url || undefined,
      request_method: req.method || undefined,
      request_id: req.requestId || undefined,
      client_platform: isMobileClient ? 'mobile_app' : 'web',
      $raw_user_agent: userAgent || undefined,
      ...parseUserAgent(userAgent, isMobileClient),
      ...(lookupGeo(ip) || {})
    }

    // Strip undefined keys so PostHog person/event props stay clean.
    Object.keys(props).forEach((k) => props[k] === undefined && delete props[k])
    return props
  } catch (err) {
    return {}
  }
}

module.exports = {
  buildRequestContext,
  extractClientIp,
  lookupGeo,
  parseUserAgent
}
