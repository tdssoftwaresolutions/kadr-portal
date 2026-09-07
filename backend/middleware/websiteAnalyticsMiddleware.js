/**
 * Counts visitors on the public marketing website (public/website).
 *
 * Mounted just before the website static handler so it sees every request to
 * the site, including successful page hits. We fire a `website_page_viewed`
 * event only for meaningful HTML page views — not for every JS/CSS/image asset,
 * and never for /api, /admin or /health — so the visitor count stays clean and
 * the event volume stays low.
 *
 * Anonymous by design (no logged-in user on the public site); PostHog still
 * attaches location and device from the request so you can see where visitors
 * come from and what they use.
 */
const path = require('path')
const analytics = require('../utils/analytics')

// Asset extensions we never count as a "page view".
const ASSET_EXTENSIONS = new Set([
  '.js', '.mjs', '.css', '.map',
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.ico', '.avif',
  '.woff', '.woff2', '.ttf', '.eot', '.otf',
  '.json', '.xml', '.txt', '.pdf',
  '.mp4', '.webm', '.mp3', '.wav'
])

function isPageView (req) {
  if (req.method !== 'GET') return false

  const p = req.path || '/'
  if (p.startsWith('/api') || p.startsWith('/admin') || p.startsWith('/health')) return false

  const ext = path.extname(p).toLowerCase()
  // Root, extensionless (pretty URLs / directory index), and .html are pages.
  if (ext === '' || ext === '.html' || ext === '.htm') {
    // A real page navigation asks for HTML; asset prefetches usually don't.
    const accept = req.headers && req.headers.accept
    if (accept && !accept.includes('text/html') && !accept.includes('*/*')) return false
    return true
  }

  if (ASSET_EXTENSIONS.has(ext)) return false
  // Unknown extension: be conservative and don't count it.
  return false
}

function websiteAnalyticsMiddleware (req, res, next) {
  try {
    if (isPageView(req)) {
      analytics.trackWebsitePageView({ req, path: req.path })
    }
  } catch (err) {
    // Never let analytics break page delivery.
  }
  next()
}

module.exports = websiteAnalyticsMiddleware
