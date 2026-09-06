const rateLimit = require('express-rate-limit')
const path = require('path')
const fs = require('fs')

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,

  handler: (req, res) => {
    const page = fs.readFileSync(
      path.join(__dirname, '../../public/website/rate_limit.html'),
      'utf8'
    )

    res.status(429).type('html').send(page)
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
