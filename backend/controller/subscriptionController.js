const { success } = require('../utils/responses')
const { createError } = require('../utils/errors')
const errorCodes = require('../utils/errors/errorCodes')
const {
  getSubscriptionStatus
} = require('../services/subscription/subscriptionService')
const { listFeaturesForMediator } = require('../services/subscription/entitlementService')
const { PAYMENT_PURPOSES } = require('../services/payment/paymentConstants')

module.exports = {
  getMySubscription: async function (req, res, next) {
    try {
      if (req.user.type !== 'MEDIATOR') throw createError(errorCodes.FORBIDDEN)
      const [status, features] = await Promise.all([
        getSubscriptionStatus(req.user.id),
        listFeaturesForMediator(req.user.id)
      ])
      success(res, { ...status, features })
    } catch (error) {
      next(error)
    }
  },

  purchaseProSubscription: async function (req, res, next) {
    try {
      if (req.user.type !== 'MEDIATOR') throw createError(errorCodes.FORBIDDEN)
      throw createError(errorCodes.INVALID_REQUEST, {
        message: 'Use POST /api/payment/initiate with purpose MEDIATOR_PRO to purchase Pro via the configured gateway.'
      })
    } catch (error) {
      next(error)
    }
  },

  getProPaymentPurpose: function () {
    return PAYMENT_PURPOSES.MEDIATOR_PRO
  }
}
