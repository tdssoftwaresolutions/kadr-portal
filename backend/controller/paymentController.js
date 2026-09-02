const { success } = require('../utils/responses')
const { createError } = require('../utils/errors')
const errorCodes = require('../utils/errors/errorCodes')
const { assertCaseAccessFromRequest, isCaseParty } = require('../services/security/caseAccessService')
const { fulfillClientCasePayment } = require('../services/payment/paymentFulfillmentService')

module.exports = {
  setClientPayment: async function (req, res, next) {
    try {
      const allowFake = process.env.ALLOW_FAKE_PAYMENTS === '1' && process.env.NODE_ENV !== 'production'
      if (!allowFake) {
        throw createError(errorCodes.INVALID_REQUEST, {
          message: 'Direct payment recording is disabled. Use the payment gateway checkout.'
        })
      }

      const { paymentId, clientId, caseId, status, amount, currency, reason, paymentMethod, referenceId } = req.body
      if (!caseId) throw createError(errorCodes.REQUIRED_CASE_ID)
      if (status !== 'success') throw createError(errorCodes.INVALID_REQUEST)

      const caseRow = await assertCaseAccessFromRequest(req, caseId)
      if (req.user.type === 'CLIENT' && !isCaseParty(caseRow, req.user.id)) {
        throw createError(errorCodes.FORBIDDEN)
      }
      if (req.user.type === 'CLIENT' && clientId && clientId !== req.user.id) {
        throw createError(errorCodes.FORBIDDEN)
      }

      const effectiveClientId = clientId || req.user.id

      await fulfillClientCasePayment({
        caseId,
        clientId: effectiveClientId,
        paymentId,
        amount,
        currency: currency || 'INR',
        reason,
        paymentMethod,
        referenceId
      })

      success(res, { message: 'Payment recorded successfully' })
    } catch (error) {
      next(error)
    }
  }
}
