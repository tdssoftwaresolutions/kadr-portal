const jwt = require('jsonwebtoken')
const prisma = require('../lib/prisma.js')
const helper = require('../utils/helper')
const dataCrypto = require('../utils/crypto')
const errorCodes = require('../utils/errors/errorCodes')

// Max incorrect OTP attempts before the code is invalidated.
const MAX_OTP_ATTEMPTS = 5
const { createError } = require('../utils/errors')
const { success } = require('../utils/responses')
const { canLogin } = require('../utils/userAccess')
const { isMobileClientRequest } = require('../utils/mobileClient')
const { getRefreshCookieOptions, getRefreshCookieClearOptions } = require('../utils/cookieOptions')
const { OAuth2Client } = require('google-auth-library')

module.exports = {
  login: async function (req, res, next) {
    try {
      const { username, password, userType } = req.body
      const normalizedType = userType ? String(userType).toUpperCase() : null
      const candidates = await prisma.user.findMany({
        where: {
          email: username,
          ...(normalizedType ? { user_type: normalizedType } : {})
        }
      })
      if (!candidates.length) throw createError(errorCodes.INVALID_CREDENTIALS)

      const passwordMatches = []
      for (const candidate of candidates) {
        const ok = await helper.comparePassword(password, candidate.password_hash)
        if (ok) passwordMatches.push(candidate)
      }
      if (!passwordMatches.length) throw createError(errorCodes.INVALID_CREDENTIALS)

      if (passwordMatches.length > 1 && !normalizedType) {
        throw createError(errorCodes.ACCOUNT_TYPE_REQUIRED, {
          availableTypes: passwordMatches.map((u) => u.user_type)
        })
      }

      const user = passwordMatches[0]
      if (user.is_deleted === true) throw createError(errorCodes.USER_ACCOUNT_DELETED)
      if (!canLogin(user)) throw createError(errorCodes.USER_NOT_ACTIVE)

      const isMobile = isMobileClientRequest(req)
      const accessToken = helper.generateAccessToken(user)
      const refreshToken = isMobile
        ? helper.generateMobileRefreshToken(user)
        : helper.generateRefreshToken(user)
      const refreshMaxAgeMs = isMobile
        ? 30 * 24 * 60 * 60 * 1000
        : 7 * 24 * 60 * 60 * 1000
      const cookieOptions = getRefreshCookieOptions(refreshMaxAgeMs)
      try {
        res.cookie('refresh_token', refreshToken, cookieOptions)
      } catch (e) {
        const secureFlag = cookieOptions.secure ? '; Secure' : ''
        const sameSite = cookieOptions.sameSite ? `; SameSite=${cookieOptions.sameSite}` : ''
        res.setHeader('Set-Cookie', `refresh_token=${refreshToken}; HttpOnly; Max-Age=${Math.floor(refreshMaxAgeMs / 1000)}; Path=/${secureFlag}${sameSite}`)
      }
      const payload = { accessToken }
      if (isMobile) {
        payload.refreshToken = refreshToken
        payload.refreshExpiresIn = Math.floor(refreshMaxAgeMs / 1000)
      }
      success(res, payload)
    } catch (error) {
      next(error)
    }
  },
  googleLogin: async function (req, res, next) {
    try {
      const { credential, userType } = req.body
      if (!credential) throw createError(errorCodes.INVALID_REQUEST)

      // Verify the Google ID token
      const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID)
      let ticket
      try {
        ticket = await googleClient.verifyIdToken({
          idToken: credential,
          audience: process.env.GOOGLE_CLIENT_ID
        })
        console.log(ticket)
      } catch (verifyErr) {
        console.log('-----')
        console.log(verifyErr)
        throw createError(errorCodes.INVALID_CREDENTIALS)
      }

      const payload = ticket.getPayload()
      const email = payload.email
      console.log(payload)
      if (!email) throw createError(errorCodes.INVALID_CREDENTIALS)

      // Look up matching users by email
      const normalizedType = userType ? String(userType).toUpperCase() : null
      const candidates = await prisma.user.findMany({
        where: {
          email,
          ...(normalizedType ? { user_type: normalizedType } : {})
        }
      })

      if (!candidates.length) {
        throw createError(errorCodes.INVALID_CREDENTIALS)
      }

      // If multiple accounts for same email (different user types), ask user to choose
      if (candidates.length > 1 && !normalizedType) {
        throw createError(errorCodes.ACCOUNT_TYPE_REQUIRED, {
          availableTypes: candidates.map((u) => u.user_type)
        })
      }

      const user = candidates[0]
      if (user.is_deleted === true) throw createError(errorCodes.USER_ACCOUNT_DELETED)
      if (!canLogin(user)) throw createError(errorCodes.USER_NOT_ACTIVE)

      const isMobile = isMobileClientRequest(req)
      const accessToken = helper.generateAccessToken(user)
      const refreshToken = isMobile
        ? helper.generateMobileRefreshToken(user)
        : helper.generateRefreshToken(user)
      const refreshMaxAgeMs = isMobile
        ? 30 * 24 * 60 * 60 * 1000
        : 7 * 24 * 60 * 60 * 1000
      const cookieOptions = getRefreshCookieOptions(refreshMaxAgeMs)
      try {
        res.cookie('refresh_token', refreshToken, cookieOptions)
      } catch (e) {
        const secureFlag = cookieOptions.secure ? '; Secure' : ''
        const sameSite = cookieOptions.sameSite ? `; SameSite=${cookieOptions.sameSite}` : ''
        res.setHeader('Set-Cookie', `refresh_token=${refreshToken}; HttpOnly; Max-Age=${Math.floor(refreshMaxAgeMs / 1000)}; Path=/${secureFlag}${sameSite}`)
      }
      const responsePayload = { accessToken }
      if (isMobile) {
        responsePayload.refreshToken = refreshToken
        responsePayload.refreshExpiresIn = Math.floor(refreshMaxAgeMs / 1000)
      }
      success(res, responsePayload)
    } catch (error) {
      next(error)
    }
  },
  logout: function (req, res, next) {
    try {
      res.clearCookie('refresh_token', getRefreshCookieClearOptions())
    } catch (e) {
      const opts = getRefreshCookieClearOptions()
      const secureFlag = opts.secure ? '; Secure' : ''
      res.setHeader('Set-Cookie', `refresh_token=; Max-Age=0; Path=/; SameSite=${opts.sameSite}${secureFlag}`)
    }
    success(res, {}, 'Logged out successfully')
  },
  isEmailExist: async function (req, res, next) {
    try {
      const email = req.query.email
      // Prefer (email, user_type) — same email may exist as CLIENT and MEDIATOR
      const type = req.query.type ? String(req.query.type).toUpperCase() : null
      if (!email) {
        throw createError(errorCodes.MISSING_REQUIRED_DETAIL)
      }
      const user = type
        ? await prisma.user.findUnique({
          where: {
            email_user_type: {
              email,
              user_type: type
            }
          },
          select: {
            id: true,
            active: true,
            is_deleted: true,
            is_self_signed_up: true,
            user_type: true
          }
        })
        : await prisma.user.findFirst({
          where: { email },
          select: {
            id: true,
            active: true,
            is_deleted: true,
            is_self_signed_up: true,
            user_type: true
          }
        })
      if (!user) {
        success(res, { exists: false }, 'Email does not exist')
        return
      }
      if (user.is_deleted === true) {
        success(res, { exists: false, canReRegister: true }, 'Email can be used to register again.')
        return
      }
      if (user.active === false && user.is_self_signed_up === true) {
        success(res, {
          exists: true,
          pendingApproval: true,
          userType: user.user_type
        }, 'Your registration is pending approval. Please wait for the Kadr team to activate your account.')
        return
      }

      let message = 'An account with this email already exists. Please log in instead.'
      let action = 'login'
      if (user.user_type === 'CLIENT' || type === 'CLIENT') {
        message = errorCodes.CLIENT_ACCOUNT_EXISTS.message
        action = 'login_and_new_case'
      } else if (user.user_type === 'MEDIATOR' || type === 'MEDIATOR') {
        message = errorCodes.MEDIATOR_ACCOUNT_EXISTS.message
        action = 'login'
      } else if (user.user_type === 'ADMIN' || type === 'ADMIN') {
        message = errorCodes.ADMIN_ACCOUNT_EXISTS.message
        action = 'login'
      }

      success(res, {
        exists: true,
        userType: user.user_type,
        action
      }, message)
    } catch (error) {
      next(error)
    }
  },
  authenticateWithGoogle: async function (req, res, next) {
    try {
      const url = await helper.generateGoogleAuthUrl(req.user.id)
      success(res, {
        url
      })
    } catch (error) {
      next(error)
    }
  },
  getGoogleToken: async function (req, res, next) {
    try {
      if (req.user.type !== 'ADMIN') throw createError(errorCodes.FORBIDDEN)
      const googleAuth = await helper.getGoogleToken(prisma)
      if (googleAuth == null) throw createError(errorCodes.GOOGLE_AUTH_FAILED)
      success(res, { connected: Boolean(googleAuth) }, '')
    } catch (error) {
      next(error)
    }
  },
  googleCallback: async function (req, res, next) {
    try {
      const code = decodeURIComponent(req.query.code || '')
      const stateUserId = req.query.state
      if (!code) throw createError(errorCodes.INVALID_REQUEST)
      if (stateUserId) {
        const stateUser = await prisma.user.findUnique({
          where: { id: stateUserId },
          select: { id: true, user_type: true }
        })
        if (!stateUser) throw createError(errorCodes.UNAUTHORIZED)
      }
      const accessTokenStatus = await helper.getGoogleAccessToken(prisma, code)
      if (!accessTokenStatus) throw createError(errorCodes.AUTHENTICATION_FAILED)

      res.send('<html><body><h1>Your Google account is now connected. You can now close this window and return to the app.</h1></body></html>')
    } catch (error) {
      next(error)
    }
  },
  sendOtp: async function (req, res, next) {
    try {
      const { id } = req.body
      if (!id) throw createError(errorCodes.INVALID_REQUEST)

      const signatureTracking = await prisma.signature_tracking.findUnique(
        {
          where: {
            id
          },
          select: {
            case_id: true,
            user_id: true,
            case_agreement_id: true,
            cases: {
              select: {
                id: true,
                user_cases_first_partyTouser: {
                  select: {
                    id: true,
                    name: true,
                    phone_number: true
                  }
                },
                user_cases_second_partyTouser: {
                  select: {
                    id: true,
                    name: true,
                    phone_number: true
                  }
                }
              }
            }
          }
        }
      )

      if (!signatureTracking) throw createError(errorCodes.INVALID_REQUEST)

      let phoneNumber = null

      if (signatureTracking.case_id != null) {
        if (signatureTracking.cases.user_cases_first_partyTouser.id === signatureTracking.user_id) {
          phoneNumber = signatureTracking.cases.user_cases_first_partyTouser.phone_number
        } else if (signatureTracking.cases.user_cases_second_partyTouser.id === signatureTracking.user_id) {
          phoneNumber = signatureTracking.cases.user_cases_second_partyTouser.phone_number
        }
      } else if (signatureTracking.case_agreement_id != null) {
        const caseRecord = await prisma.cases.findFirst({
          where: {
            case_agreement: {
              equals: signatureTracking.case_agreement_id
            }
          },
          select: {
            user_cases_first_partyTouser: {
              select: {
                id: true,
                name: true,
                phone_number: true
              }
            },
            user_cases_second_partyTouser: {
              select: {
                id: true,
                name: true,
                phone_number: true
              }
            }
          }
        })
        if (caseRecord.user_cases_first_partyTouser.id === signatureTracking.user_id) {
          phoneNumber = caseRecord.user_cases_first_partyTouser.phone_number
        } else if (caseRecord.user_cases_second_partyTouser.id === signatureTracking.user_id) {
          phoneNumber = caseRecord.user_cases_second_partyTouser.phone_number
        }
      }

      if (!phoneNumber) throw createError(errorCodes.INVALID_REQUEST)

      const otp = dataCrypto.generateNumericOtp(6)
      const createdAt = new Date()
      const expiresAt = new Date(createdAt.getTime() + 10 * 60000)
      const response = await prisma.otp_resets.create({
        data: {
          otp: dataCrypto.hashOtp(otp),
          attempts: 0,
          created_at: createdAt,
          expires_at: expiresAt,
          type: 'MEDIATION'
        },
        select: {
          id: true
        }
      })

      await helper.sendOtpSMS(otp, phoneNumber)
      success(res, {
        requestId: response.id
      }, 'OTP sent successfully')
    } catch (error) {
      next(error)
    }
  },
  verifyOtp: async function (req, res, next) {
    try {
      const { requestId, otp } = req.body
      if (!requestId || !otp) throw createError(errorCodes.INVALID_REQUEST)

      const otpReset = await prisma.otp_resets.findUnique({
        where: {
          id: requestId
        },
        select: {
          otp: true,
          attempts: true,
          expires_at: true
        }
      })

      if (!otpReset) throw createError(errorCodes.INVALID_REQUEST)

      if (otpReset.expires_at < new Date()) {
        await prisma.otp_resets.delete({ where: { id: requestId } })
        throw createError(errorCodes.OTP_EXPIRED)
      }

      if ((otpReset.attempts || 0) >= MAX_OTP_ATTEMPTS) {
        await prisma.otp_resets.delete({ where: { id: requestId } })
        throw createError(errorCodes.OTP_TOO_MANY_ATTEMPTS)
      }

      if (!dataCrypto.compareOtp(otp, otpReset.otp)) {
        await prisma.otp_resets.update({
          where: { id: requestId },
          data: { attempts: { increment: 1 } }
        })
        throw createError(errorCodes.INVALID_OTP)
      }

      await prisma.otp_resets.delete({
        where: {
          id: requestId
        }
      })

      success(res, {}, 'OTP verified successfully')
    } catch (error) {
      next(error)
    }
  },
  resetPassword: async function (req, res, next) {
    try {
      const email = req.body.emailAddress
      const userType = req.body.userType ? String(req.body.userType).toUpperCase() : null
      const users = await prisma.user.findMany({
        where: {
          email,
          active: true,
          is_deleted: false,
          user_type: userType || { not: 'ADMIN' }
        },
        select: {
          id: true,
          name: true,
          user_type: true
        }
      })
      if (!users.length) throw createError(errorCodes.INVALID_REQUEST)
      if (users.length > 1 && !userType) {
        throw createError(errorCodes.ACCOUNT_TYPE_REQUIRED, {
          availableTypes: users.map((u) => u.user_type)
        })
      }
      const user = users[0]

      const createdAt = new Date()
      const expiresAt = new Date(createdAt.getTime() + 10 * 60000)
      const otp = dataCrypto.generateNumericOtp(6)
      const otpHash = dataCrypto.hashOtp(otp)
      await prisma.otp_resets.upsert({
        where: {
          unique_email_type: {
            email,
            type: 'RESET_PASSWORD'
          }
        },
        update: {
          otp: otpHash,
          attempts: 0,
          created_at: createdAt,
          expires_at: expiresAt
        },
        create: {
          email,
          otp: otpHash,
          attempts: 0,
          created_at: createdAt,
          expires_at: expiresAt,
          type: 'RESET_PASSWORD'
        }
      })
      await helper.sendTemplatedEmail('passwordResetOtp', email, {
        recipientName: user.name,
        otp
      })
      success(res, next)
    } catch (error) {
      next(error)
    }
  },
  confirmPasswordChange: async function (req, res, next) {
    try {
      const { emailAddress, otp, password, userType } = req.body
      if (!password || password.length < 8) {
        throw createError(errorCodes.INVALID_REQUEST, { message: 'Password must be at least 8 characters.' })
      }
      const otpReset = await prisma.otp_resets.findFirst({
        where: {
          email: emailAddress,
          type: 'RESET_PASSWORD'
        },
        select: {
          id: true,
          otp: true,
          attempts: true,
          expires_at: true
        }
      })
      if (!otpReset) throw createError(errorCodes.INVALID_REQUEST)

      if (otpReset.expires_at < new Date()) {
        await prisma.otp_resets.deleteMany({ where: { email: emailAddress, type: 'RESET_PASSWORD' } })
        throw createError(errorCodes.OTP_EXPIRED)
      }

      if ((otpReset.attempts || 0) >= MAX_OTP_ATTEMPTS) {
        await prisma.otp_resets.deleteMany({ where: { email: emailAddress, type: 'RESET_PASSWORD' } })
        throw createError(errorCodes.OTP_TOO_MANY_ATTEMPTS)
      }

      if (!dataCrypto.compareOtp(otp, otpReset.otp)) {
        await prisma.otp_resets.update({
          where: { id: otpReset.id },
          data: { attempts: { increment: 1 } }
        })
        throw createError(errorCodes.INVALID_OTP)
      }

      const hashPassword = await helper.hashPassword(password)
      const normalizedType = userType ? String(userType).toUpperCase() : null
      const users = await prisma.user.findMany({
        where: {
          email: emailAddress,
          user_type: normalizedType || { not: 'ADMIN' }
        },
        select: { id: true, name: true, user_type: true }
      })
      if (!users.length) throw createError(errorCodes.INVALID_REQUEST)
      if (users.length > 1 && !normalizedType) {
        throw createError(errorCodes.ACCOUNT_TYPE_REQUIRED, {
          availableTypes: users.map((u) => u.user_type)
        })
      }

      await prisma.user.update({
        where: { id: users[0].id },
        data: { password_hash: hashPassword }
      })
      await prisma.otp_resets.deleteMany({
        where: {
          email: emailAddress
        }
      })
      await helper.sendTemplatedEmail('passwordResetSuccess', emailAddress, {
        recipientName: users[0].name
      })
      success(res, {}, 'Password reset successfully!')
    } catch (error) {
      next(error)
    }
  },
  refreshToken: async function (req, res, next) {
    try {
      const refreshToken =
        req.body?.refreshToken ||
        req.cookies?.refresh_token
      if (!refreshToken) throw createError(errorCodes.NO_REFRESH_TOKEN)

      jwt.verify(refreshToken, process.env.REFRESH_SECRET_KEY, async (err, tokenUser) => {
        if (err) {
          return res.status(403).json(errorCodes.REFRESH_TOKEN_EXPIRED)
        }
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: tokenUser.id },
            select: { id: true, email: true, name: true, user_type: true, active: true, is_deleted: true }
          })
          if (!dbUser || dbUser.is_deleted || !dbUser.active) {
            return res.status(403).json(errorCodes.REFRESH_TOKEN_EXPIRED)
          }
          const newAccessToken = helper.generateAccessToken(dbUser)
          const isMobile = isMobileClientRequest(req)

          if (isMobile) {
            return res.json({
              success: true,
              data: { accessToken: newAccessToken }
            })
          }
          res.json({ accessToken: newAccessToken })
        } catch (verifyErr) {
          next(verifyErr)
        }
      })
    } catch (error) {
      next(error)
    }
  }
}
