const { createError } = require('../utils/errors')
const errorCodes = require('../utils/errors/errorCodes')
const { success } = require('../utils/responses')
const { assertAdminPage } = require('../utils/adminPermissionHelpers')
const adminService = require('../services/notification/notificationAdminService')
const notificationService = require('../services/notification/notificationService')

async function assertNotificationsAdmin (req) {
  if (req.user.type !== 'ADMIN') throw createError(errorCodes.FORBIDDEN)
  await assertAdminPage(req, 'notifications')
}

module.exports = {
  listTemplates: async function (req, res, next) {
    try {
      await assertNotificationsAdmin(req)
      const { channel } = req.query
      const templates = await adminService.listTemplates({ channel: channel || undefined })
      success(res, { templates, channels: adminService.CHANNELS })
    } catch (error) {
      next(error)
    }
  },

  saveTemplate: async function (req, res, next) {
    try {
      await assertNotificationsAdmin(req)
      const template = await adminService.upsertTemplate(req.body)
      success(res, { template }, 'Template saved')
    } catch (error) {
      next(error)
    }
  },

  deleteTemplate: async function (req, res, next) {
    try {
      await assertNotificationsAdmin(req)
      await adminService.deleteTemplate(req.params.id)
      success(res, {}, 'Template deleted')
    } catch (error) {
      next(error)
    }
  },

  previewTemplate: async function (req, res, next) {
    try {
      await assertNotificationsAdmin(req)
      const { templateKey, channel, data, draft } = req.body
      if (!channel) throw createError(errorCodes.MISSING_REQUIRED_DETAIL)
      if (!templateKey && !draft) throw createError(errorCodes.MISSING_REQUIRED_DETAIL)
      const preview = await adminService.previewTemplate({
        templateKey: templateKey || '',
        channel: String(channel).toUpperCase(),
        data: data || {},
        draft: draft || null
      })
      success(res, preview)
    } catch (error) {
      next(error)
    }
  },

  listChannelSettings: async function (req, res, next) {
    try {
      await assertNotificationsAdmin(req)
      const channels = await adminService.listAllChannelSettings()
      success(res, { channels })
    } catch (error) {
      next(error)
    }
  },

  saveChannelSettings: async function (req, res, next) {
    try {
      await assertNotificationsAdmin(req)
      const { channel, enabled, provider, config } = req.body
      if (!channel) throw createError(errorCodes.MISSING_REQUIRED_DETAIL)
      const saved = await adminService.saveChannelSettings({
        channel: String(channel).toUpperCase(),
        enabled,
        provider,
        config
      })
      success(res, { channel: saved }, 'Channel settings saved')
    } catch (error) {
      next(error)
    }
  },

  searchUsers: async function (req, res, next) {
    try {
      await assertNotificationsAdmin(req)
      const { q, types, limit } = req.query
      const users = await adminService.searchUsersForPicker({
        q,
        types: types ? String(types).split(',') : [],
        limit
      })
      success(res, { users })
    } catch (error) {
      next(error)
    }
  },

  sendBulk: async function (req, res, next) {
    try {
      await assertNotificationsAdmin(req)
      const { templateKey, channel, userIds, data, attachments } = req.body
      if (!templateKey || !channel) throw createError(errorCodes.MISSING_REQUIRED_DETAIL)
      if (!Array.isArray(userIds) || !userIds.length) {
        throw createError(errorCodes.MISSING_REQUIRED_DETAIL)
      }
      const summary = await notificationService.sendBulk({
        templateKey,
        channel: String(channel).toUpperCase(),
        userIds,
        data: data || {},
        attachments: attachments || []
      })
      success(res, summary, `Sent ${summary.succeeded} of ${summary.total}`)
    } catch (error) {
      next(error)
    }
  },

  listSendLogs: async function (req, res, next) {
    try {
      await assertNotificationsAdmin(req)
      const logs = await adminService.listSendLogs({ limit: req.query.limit })
      success(res, { logs })
    } catch (error) {
      next(error)
    }
  },

  previewEmailLayout: async function (req, res, next) {
    try {
      await assertNotificationsAdmin(req)
      const { headerHtml, footerHtml } = req.body
      const preview = await adminService.previewEmailLayout({ headerHtml, footerHtml })
      success(res, preview)
    } catch (error) {
      next(error)
    }
  }
}
