const { success } = require('../utils/responses')
const { createError } = require('../utils/errors')
const errorCodes = require('../utils/errors/errorCodes')
const { getPublicPaymentConfig, getPortalBaseUrl } = require('../services/payment/paymentConfig')
const { PAYMENT_PURPOSES } = require('../services/payment/paymentConstants')
const {
  createPaymentOrder,
  verifyAndCompleteOrder,
  getOrderByOrderId
} = require('../services/payment/paymentOrderService')
const { assertCaseAccessFromRequest, isCaseParty } = require('../services/security/caseAccessService')
const { getProMonthlyPriceInr } = require('../services/subscription/subscriptionService')

function assertPurposeAccess (req, purpose, caseId) {
  if (purpose === PAYMENT_PURPOSES.MEDIATOR_PRO) {
    if (req.user.type !== 'MEDIATOR') throw createError(errorCodes.FORBIDDEN)
    return
  }
  if (!caseId) throw createError(errorCodes.REQUIRED_CASE_ID)
  return assertCaseAccessFromRequest(req, caseId).then((caseRow) => {
    if (req.user.type === 'CLIENT' && !isCaseParty(caseRow, req.user.id)) {
      throw createError(errorCodes.FORBIDDEN)
    }
    return caseRow
  })
}

module.exports = {
  getConfig: async function (req, res, next) {
    try {
      success(res, getPublicPaymentConfig())
    } catch (error) {
      next(error)
    }
  },

  initiate: async function (req, res, next) {
    try {
      const { purpose, caseId, amount } = req.body
      if (!purpose || !Object.values(PAYMENT_PURPOSES).includes(purpose)) {
        throw createError(errorCodes.INVALID_REQUEST, { message: 'Invalid payment purpose' })
      }
      await assertPurposeAccess(req, purpose, caseId)

      const productLabels = {
        [PAYMENT_PURPOSES.CLIENT_NOTICE]: 'Notice fee — Kadr Portal',
        [PAYMENT_PURPOSES.CLIENT_MEDIATION]: 'Mediation fee — Kadr Portal',
        [PAYMENT_PURPOSES.MEDIATOR_PRO]: 'Kadr Mediator Pro subscription'
      }

      const { order, checkout, gateway } = await createPaymentOrder({
        userId: req.user.id,
        purpose,
        caseId,
        amountOverride: amount,
        metadata: { productInfo: productLabels[purpose] }
      })

      success(res, {
        orderId: order.order_id,
        amount: Number(order.amount),
        currency: order.currency,
        purpose: order.purpose,
        gateway,
        checkout
      })
    } catch (error) {
      next(error)
    }
  },

  verify: async function (req, res, next) {
    try {
      const { orderId } = req.body
      if (!orderId) throw createError(errorCodes.MISSING_FIELD)

      const order = await getOrderByOrderId(orderId)
      if (!order) throw createError(errorCodes.NOT_FOUND)
      if (order.user_id !== req.user.id && req.user.type !== 'ADMIN') {
        throw createError(errorCodes.FORBIDDEN)
      }

      const { order: completed, alreadyCompleted } = await verifyAndCompleteOrder(orderId, req.body.gatewayPayload || {})
      success(res, {
        orderId: completed.order_id,
        status: completed.status,
        purpose: completed.purpose,
        alreadyCompleted
      }, alreadyCompleted ? 'Payment already completed' : 'Payment verified successfully')
    } catch (error) {
      next(error)
    }
  },

  payuReturn: async function (req, res, next) {
    try {
      const payload = { ...req.body, ...req.query }
      const orderId = payload.txnid
      if (!orderId) {
        return res.redirect(`${getPortalBaseUrl()}/app/payment/return?status=failed`)
      }
      try {
        await verifyAndCompleteOrder(orderId, payload)
        return res.redirect(`${getPortalBaseUrl()}/app/payment/return?status=success&order_id=${encodeURIComponent(orderId)}&gateway=payu`)
      } catch (err) {
        return res.redirect(`${getPortalBaseUrl()}/app/payment/return?status=failed&order_id=${encodeURIComponent(orderId)}&gateway=payu`)
      }
    } catch (error) {
      next(error)
    }
  },

  cashfreeWebhook: async function (req, res, next) {
    try {
      const body = req.body
      const orderId = body?.data?.order?.order_id || body?.order_id
      if (orderId) {
        await verifyAndCompleteOrder(orderId, { webhook: body })
      }
      success(res, { received: true })
    } catch (error) {
      next(error)
    }
  },

  phonepeWebhook: async function (req, res, next) {
    try {
      const body = req.body
      const orderId = body?.data?.merchantTransactionId
      if (orderId) {
        await verifyAndCompleteOrder(orderId, { webhook: body })
      }
      success(res, { received: true })
    } catch (error) {
      next(error)
    }
  },

  getAmounts: async function (req, res, next) {
    try {
      const proPrice = await getProMonthlyPriceInr()
      success(res, {
        noticeInr: 1000,
        mediationInr: 5000,
        proMonthlyInr: proPrice
      })
    } catch (error) {
      next(error)
    }
  }
}
