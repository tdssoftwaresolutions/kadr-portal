const rateLimit = require('express-rate-limit')
const path = require('path')
const fs = require('fs')

// Read once at module load instead of on every 429 response — the old code
// did a blocking fs.readFileSync per rate-limited request, exactly when the
// limiter (and the event loop) is busiest.
const rateLimitPage = fs.readFileSync(
  path.join(__dirname, '../../public/website/rate_limit.html'),
  'utf8'
)

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,

  handler: (req, res) => {
    res.status(429).type('html').send(rateLimitPage)
  }
})

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many authentication attempts. Please try again later.' }
})

const otpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many OTP requests. Please try again later.' }
})

const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many signup attempts. Please try again later.' }
})

const signatureLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many signature requests. Please try again later.' }
})

module.exports = {
  globalLimiter,
  authLimiter,
  otpLimiter,
  signupLimiter,
  signatureLimiter
}
