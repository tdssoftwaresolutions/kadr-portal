/**
 * Redirects HTTP requests to HTTPS in production.
 * Respects common proxy headers (X-Forwarded-Proto) used by load balancers.
 * Only active when NODE_ENV=production and COOKIE_SECURE=1 (indicating HTTPS is expected).
 */
function httpsRedirectMiddleware (req, res, next) {
  if (process.env.NODE_ENV !== 'production') return next()
  if (process.env.COOKIE_SECURE !== '1') return next()

  const proto = req.headers['x-forwarded-proto'] || req.protocol
  if (proto === 'https') return next()

  // Skip for health check endpoints (load balancer pings over HTTP)
  if (req.path === '/health' || req.path === '/health/ready') return next()

  const host = req.headers.host || req.hostname
  const redirectUrl = `https://${host}${req.originalUrl}`
  return res.redirect(301, redirectUrl)
}

module.exports = httpsRedirectMiddleware
