const helmet = require('helmet')

function securityMiddleware () {
  const isProduction = process.env.NODE_ENV === 'production'

  // S3 bucket origin used for:
  //  - in-app document/PDF previews rendered in an iframe (frame-src, see
  //    src/components/DocumentPreview.vue), and
  //  - direct browser-to-S3 uploads via presigned PUT URLs (connect-src, see
  //    frontend/utils/directUpload.js used by the signup forms).
  // Built from env so it stays correct across environments. Falls back to a
  // region-scoped wildcard if unset.
  const s3Bucket = process.env.S3_BUCKET_NAME
  const s3Region = process.env.S3_REGION || 'us-east-1'
  const s3Origin = s3Bucket
    ? `https://${s3Bucket}.s3.${s3Region}.amazonaws.com`
    : `https://*.s3.${s3Region}.amazonaws.com`

  return helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'", // Vue SFC builds emit inline scripts via webpack
          // webpack dev server uses eval-based source maps; not needed in production builds
          ...(!isProduction ? ["'unsafe-eval'"] : []),
          'https://accounts.google.com', // Google Identity Services (gsi/client)
          'https://sdk.cashfree.com',
          'https://secure.payu.in',
          'https://test.payu.in',
          'https://api.phonepe.com',
          'https://www.youtube.com',
          'https://www.google.com'
        ],
        // Helmet's CSP defaults emit `script-src-attr 'none'`, which blocks inline
        // event handler attributes (e.g. onclick="goToLogin()") on the public
        // static website even though `scriptSrc` allows 'unsafe-inline'. Allow
        // inline handlers explicitly so the website nav/CTA buttons work.
        scriptSrcAttr: ["'unsafe-inline'"],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          'https://fonts.googleapis.com',
          'https://accounts.google.com' // Google Identity Services (gsi) stylesheet
        ],
        fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
        imgSrc: ["'self'", 'data:', 'blob:', 'https:', 'http:'],
        connectSrc: [
          "'self'",
          'https://accounts.google.com', // Google Identity Services token exchange
          'https://sdk.cashfree.com',
          'https://sandbox.cashfree.com',
          'https://api.cashfree.com',
          'https://secure.payu.in',
          'https://test.payu.in',
          'https://api.phonepe.com',
          'https://api-preprod.phonepe.com',
          s3Origin, // direct-to-S3 presigned PUT uploads
          process.env.BASE_URL || 'http://localhost:3000'
        ].filter(Boolean),
        frameSrc: [
          "'self'",
          'https://accounts.google.com', // Google Identity Services One Tap iframe
          'https://docs.google.com', // Google Docs viewer (office file previews)
          s3Origin, // S3 document/PDF previews
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
          'https://test.payu.in',
          'https://sandbox.cashfree.com', // Cashfree sandbox checkout form submission
          'https://api.cashfree.com' // Cashfree production checkout form submission
        ],
        frameAncestors: ["'self'"],
        upgradeInsecureRequests: isProduction ? [] : null
      },
      reportOnly: false
    },
    crossOriginEmbedderPolicy: false,
    // Google Identity Services signs the user in via a popup (ux_mode: 'popup').
    // The popup at accounts.google.com/gsi/transform must be able to postMessage
    // back to this window via window.opener. Helmet's default COOP of
    // 'same-origin' severs window.opener for cross-origin popups, which surfaces
    // as "Cannot read properties of null (reading 'postMessage')" and a blank
    // gsi/transform screen. 'same-origin-allow-popups' keeps COOP protections for
    // this app's own pages while preserving the opener link for popups it opens.
    crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
    hsts: isProduction
      ? { maxAge: 31536000, includeSubDomains: true, preload: true }
      : false
  })
}

module.exports = securityMiddleware
