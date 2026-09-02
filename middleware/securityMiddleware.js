const helmet = require('helmet')

function securityMiddleware () {
  const isProduction = process.env.NODE_ENV === 'production'

  return helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'", // Vue requires inline scripts in dev; consider nonce-based in future
          "'unsafe-eval'", // Vue 2 template compiler needs eval in dev mode
          'https://sdk.cashfree.com',
          'https://secure.payu.in',
          'https://test.payu.in',
          'https://api.phonepe.com',
          'https://www.youtube.com',
          'https://www.google.com'
        ],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
        imgSrc: ["'self'", 'data:', 'blob:', 'https:', 'http:'],
        connectSrc: [
          "'self'",
          'https://sdk.cashfree.com',
          'https://sandbox.cashfree.com',
          'https://api.cashfree.com',
          'https://secure.payu.in',
          'https://test.payu.in',
          'https://api.phonepe.com',
          'https://api-preprod.phonepe.com',
          process.env.BASE_URL || 'http://localhost:3000'
        ].filter(Boolean),
        frameSrc: [
          "'self'",
          'https://secure.payu.in',
          'https://test.payu.in',
          'https://www.youtube.com',
          'https://sdk.cashfree.com'
        ],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: [
          "'self'",
          'https://secure.payu.in',
          'https://test.payu.in'
        ],
        frameAncestors: ["'self'"],
        upgradeInsecureRequests: isProduction ? [] : null
      },
      reportOnly: false
    },
    crossOriginEmbedderPolicy: false,
    hsts: isProduction
      ? { maxAge: 31536000, includeSubDomains: true, preload: true }
      : false
  })
}

module.exports = securityMiddleware
