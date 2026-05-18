const { success } = require('../utils/responses')
const { createError } = require('../utils/errors')
const errorCodes = require('../utils/errors/errorCodes')
const {
  getSubscriptionStatus,
  recordFakeProPayment,
  getProMonthlyPriceInr
} = require('../services/subscription/subscriptionService')
const { listFeaturesForMediator } = require('../services/subscription/entitlementService')

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
      const { paymentId, status, amount, currency, paymentMethod } = req.body
      if (status !== 'success') throw createError(errorCodes.INVALID_REQUEST)
      const price = await getProMonthlyPriceInr()
      const result = await recordFakeProPayment({
        mediatorId: req.user.id,
        paymentId: paymentId || `pro-${Date.now()}`,
        amount: amount != null ? amount : price,
        currency: currency || 'INR',
        paymentMethod
      })
      success(res, result, 'Pro subscription activated successfully.')
    } catch (error) {
      next(error)
    }
  }
}
