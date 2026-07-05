const { success } = require('../utils/responses')
const { createError } = require('../utils/errors')
const errorCodes = require('../utils/errors/errorCodes')
const { assertAdminPage } = require('../utils/adminPermissionHelpers')
const {
  getOffboardingPreview,
  processOffboarding,
  getMediator360
} = require('../services/mediator/mediatorOffboardingService')

module.exports = {
  getOffboardingPreview: async function (req, res, next) {
    try {
      if (req.user.type !== 'ADMIN') throw createError(errorCodes.FORBIDDEN)
      await assertAdminPage(req, 'users')
      const mediatorId = req.params.mediatorId
      const preview = await getOffboardingPreview(mediatorId)
      success(res, preview)
    } catch (error) {
      next(error)
    }
  },

  completeOffboarding: async function (req, res, next) {
    try {
      if (req.user.type !== 'ADMIN') throw createError(errorCodes.FORBIDDEN)
      await assertAdminPage(req, 'users')
      const mediatorId = req.params.mediatorId
      const { caseAssignments, acknowledgedPendingPayouts } = req.body
      if (!acknowledgedPendingPayouts) {
        throw createError({
          errorCode: 'E321',
          message: 'Please acknowledge pending payout review before removing this mediator.',
          statusCode: 400
        })
      }
      const result = await processOffboarding({
        mediatorId,
        triggerType: 'ADMIN',
        caseAssignments: caseAssignments || []
      })
      success(res, result, 'Mediator removed and cases reassigned.')
    } catch (error) {
      next(error)
    }
  },

  getMediator360: async function (req, res, next) {
    try {
      if (req.user.type !== 'ADMIN') throw createError(errorCodes.FORBIDDEN)
      await assertAdminPage(req, 'users')
      const page = parseInt(req.query.page, 10) || 1
      const data = await getMediator360(req.params.mediatorId, { page })
      success(res, data)
    } catch (error) {
      next(error)
    }
  }
}
