/**
 * CORS for Capacitor bundled SPA (origin: capacitor://localhost, https://localhost).
 * Web admin on same domain does not need CORS for /api.
 */
function parseAllowedOrigins () {
  const defaults = [
    'capacitor://localhost',
    'ionic://localhost',
    'http://localhost',
    'https://localhost'
  ]
  const extra = (process.env.MOBILE_CORS_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  return [...new Set([...defaults, ...extra])]
}

const allowedOrigins = parseAllowedOrigins()

function corsMiddleware (req, res, next) {
  const origin = req.headers.origin
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Access-Control-Allow-Credentials', 'true')
    res.setHeader('Vary', 'Origin')
  }
  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS'
  )
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-Kadr-Client, X-Requested-With'
  )
  res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition')

  if (req.method === 'OPTIONS') {
    return res.status(204).end()
  }
  next()
}

module.exports = corsMiddleware
