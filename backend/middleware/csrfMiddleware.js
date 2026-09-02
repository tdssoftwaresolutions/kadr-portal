const crypto = require('crypto')

/**
 * CSRF protection for cookie-authenticated state-changing routes.
 *
 * Strategy: Double-submit cookie pattern.
 * - On login (or any authenticated GET), a random CSRF token is set as a
 *   non-httpOnly cookie (readable by the SPA JS).
 * - On state-changing requests (POST/PUT/DELETE), the SPA must include
 *   the token in the `X-CSRF-Token` header.
 * - This middleware verifies the header matches the cookie value.
 *
 * Mobile clients (identified by X-Kadr-Client: mobile) are exempt since
 * they don't use cookies for auth — they send Bearer tokens only.
 */

const CSRF_COOKIE_NAME = '_csrf_token'
const CSRF_HEADER_NAME = 'x-csrf-token'
const TOKEN_LENGTH = 32

function generateCsrfToken () {
  return crypto.randomBytes(TOKEN_LENGTH).toString('hex')
}

function useSecureCookies () {
  if (process.env.COOKIE_SECURE === '1') return true
  if (process.env.COOKIE_SECURE === '0') return false
  return String(process.env.BASE_URL || '').startsWith('https://')
}

/**
 * Middleware to set the CSRF cookie on authenticated responses.
 * Attach after auth middleware on routes that return data to the SPA.
 */
function setCsrfCookie (req, res, next) {
  if (!req.cookies[CSRF_COOKIE_NAME]) {
    const token = generateCsrfToken()
    const secure = useSecureCookies()
    res.cookie(CSRF_COOKIE_NAME, token, {
      httpOnly: false, // JS must read this
      secure,
      sameSite: secure ? 'None' : 'Lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000
    })
  }
  next()
}

/**
 * Middleware to verify CSRF token on state-changing requests.
 * Skips if:
 *  - Request is GET/HEAD/OPTIONS (safe methods)
 *  - Client is mobile (X-Kadr-Client: mobile)
 *  - Request has no cookies (pure Bearer token auth)
 *  - Route is a webhook callback (payment gateways POST without CSRF)
 */
function verifyCsrfToken (req, res, next) {
  const method = req.method.toUpperCase()
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) return next()

  // Mobile clients don't use cookies
  const clientHeader = (req.headers['x-kadr-client'] || '').toLowerCase()
  if (clientHeader === 'mobile') return next()

  // Webhook endpoints are exempt (no browser involved)
  const webhookPaths = ['/api/payment/return/', '/api/payment/webhook/']
  if (webhookPaths.some((p) => req.path.startsWith(p))) return next()

  // If no cookies at all, this is likely a pure Bearer request
  if (!req.cookies || !req.cookies[CSRF_COOKIE_NAME]) return next()

  const cookieToken = req.cookies[CSRF_COOKIE_NAME]
  const headerToken = req.headers[CSRF_HEADER_NAME]

  if (!headerToken || !cookieToken) {
    return res.status(403).json({
      success: false,
      error: { code: 'E_CSRF', message: 'CSRF token missing.' }
    })
  }

  // Timing-safe comparison
  if (cookieToken.length !== headerToken.length) {
    return res.status(403).json({
      success: false,
      error: { code: 'E_CSRF', message: 'CSRF token invalid.' }
    })
  }

  const valid = crypto.timingSafeEqual(
    Buffer.from(cookieToken, 'utf8'),
    Buffer.from(headerToken, 'utf8')
  )

  if (!valid) {
    return res.status(403).json({
      success: false,
      error: { code: 'E_CSRF', message: 'CSRF token invalid.' }
    })
  }

  next()
}

module.exports = {
  setCsrfCookie,
  verifyCsrfToken,
  generateCsrfToken,
  CSRF_COOKIE_NAME,
  CSRF_HEADER_NAME
}
