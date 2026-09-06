const { success } = require('../utils/responses')
const { createError } = require('../utils/errors')
const errorCodes = require('../utils/errors/errorCodes')
const { assertAdminPage } = require('../utils/adminPermissionHelpers')
const {
  listCoupons,
  createCoupon,
  deleteCoupon,
  lookupSignupCode
} = require('../services/coupon/couponService')

module.exports = {
  // ----- Admin CRUD (settings page) -----
  listCoupons: async function (req, res, next) {
    try {
      if (req.user.type !== 'ADMIN') throw createError(errorCodes.FORBIDDEN)
      await assertAdminPage(req, 'settings')
      const coupons = await listCoupons()
      success(res, { coupons })
    } catch (error) {
      next(error)
    }
  },

  createCoupon: async function (req, res, next) {
    try {
      if (req.user.type !== 'ADMIN') throw createError(errorCodes.FORBIDDEN)
      await assertAdminPage(req, 'settings')
      const { code, title, description, premiumDays, usageLimit, active } = req.body
      try {
        const coupon = await createCoupon({ code, title, description, premiumDays, usageLimit, active })
        success(res, { coupon }, 'Coupon created.')
      } catch (svcErr) {
        if (svcErr.userMessage) {
          throw createError({ ...errorCodes.INVALID_REQUEST, message: svcErr.userMessage })
        }
        throw svcErr
      }
    } catch (error) {
      next(error)
    }
  },

  deleteCoupon: async function (req, res, next) {
    try {
      if (req.user.type !== 'ADMIN') throw createError(errorCodes.FORBIDDEN)
      await assertAdminPage(req, 'settings')
      if (!req.params.id) throw createError(errorCodes.MISSING_REQUIRED_DETAIL)
      await deleteCoupon(req.params.id)
      success(res, {}, 'Coupon deleted.')
    } catch (error) {
      next(error)
    }
  },

  // ----- Public lookup (unauthenticated, used on the signup screen) -----
  lookupSignupCode: async function (req, res, next) {
    try {
      const code = req.query.code || ''
      const result = await lookupSignupCode(code)
      success(res, { result })
    } catch (error) {
      next(error)
    }
  }
}
