const pushService = require('../services/push/pushService')
const { success } = require('../utils/responses')
const { createError } = require('../utils/errors')
const errorCodes = require('../utils/errors/errorCodes')

module.exports = {
  register: async function (req, res, next) {
    try {
      const { token, platform } = req.body
      if (!token) throw createError(errorCodes.INVALID_REQUEST)
      await pushService.registerDevice({
        userId: req.user.id,
        token,
        platform: platform || 'unknown'
      })
      success(res, { registered: true })
    } catch (error) {
      next(error)
    }
  },
  unregister: async function (req, res, next) {
    try {
      const { token } = req.body
      if (!token) throw createError(errorCodes.INVALID_REQUEST)
      await pushService.unregisterDevice({
        userId: req.user.id,
        token
      })
      success(res, { removed: true })
    } catch (error) {
      next(error)
    }
  }
}
