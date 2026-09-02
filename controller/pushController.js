const pushService = require('../services/push/pushService')
const prefsService = require('../services/push/notificationPreferencesService')
const { success } = require('../utils/responses')
const { createError } = require('../utils/errors')
const errorCodes = require('../utils/errors/errorCodes')

module.exports = {
  /** Public VAPID key so the browser can create a PushSubscription. */
  vapidPublicKey: async function (req, res, next) {
    try {
      const publicKey = await pushService.getVapidPublicKey()
      success(res, { publicKey })
    } catch (error) {
      next(error)
    }
  },

  /**
   * Registers a device. Accepts either a browser PushSubscription
   * ({ subscription }) or a mobile device token ({ token, platform }).
   */
  register: async function (req, res, next) {
    try {
      const { token, platform, subscription } = req.body
      if (!token && !subscription) throw createError(errorCodes.INVALID_REQUEST)
      const result = await pushService.registerDevice({
        userId: req.user.id,
        token,
        platform: platform || 'unknown',
        subscription,
        userAgent: req.headers['user-agent']
      })
      success(res, { registered: true, ...result })
    } catch (error) {
      next(error)
    }
  },

  unregister: async function (req, res, next) {
    try {
      const { token, subscription } = req.body
      if (!token && !subscription) throw createError(errorCodes.INVALID_REQUEST)
      await pushService.unregisterDevice({
        userId: req.user.id,
        token,
        subscription
      })
      success(res, { removed: true })
    } catch (error) {
      next(error)
    }
  },

  getPreferences: async function (req, res, next) {
    try {
      const preferences = await prefsService.getPreferences(req.user.id)
      success(res, { preferences, categories: prefsService.CATEGORIES })
    } catch (error) {
      next(error)
    }
  },

  savePreferences: async function (req, res, next) {
    try {
      const preferences = await prefsService.savePreferences(req.user.id, req.body || {})
      success(res, { preferences }, 'Notification preferences saved')
    } catch (error) {
      next(error)
    }
  }
}
