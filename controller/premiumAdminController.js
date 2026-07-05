const { success } = require('../utils/responses')
const { createError } = require('../utils/errors')
const errorCodes = require('../utils/errors/errorCodes')
const { assertAdminPage } = require('../utils/adminPermissionHelpers')
const {
  listFeaturesAdmin,
  updateFeatureAdmin
} = require('../services/subscription/entitlementService')
const { getCatalog } = require('../config/rewardFulfillmentCatalog')
const {
  listFulfillmentRules,
  getFulfillmentRule,
  upsertFulfillmentRule,
  deleteFulfillmentRule
} = require('../services/reward/rewardFulfillmentEngine')

module.exports = {
  listPremiumFeatures: async function (req, res, next) {
    try {
      if (req.user.type !== 'ADMIN') throw createError(errorCodes.FORBIDDEN)
      await assertAdminPage(req, 'settings')
      const features = await listFeaturesAdmin()
      success(res, { features })
    } catch (error) {
      next(error)
    }
  },

  updatePremiumFeature: async function (req, res, next) {
    try {
      if (req.user.type !== 'ADMIN') throw createError(errorCodes.FORBIDDEN)
      await assertAdminPage(req, 'settings')
      const { id, ...rest } = req.body
      if (!id) throw createError(errorCodes.MISSING_REQUIRED_DETAIL)
      const feature = await updateFeatureAdmin({ id, ...rest })
      success(res, { feature }, 'Feature updated.')
    } catch (error) {
      next(error)
    }
  },

  getFulfillmentCatalog: async function (req, res, next) {
    try {
      if (req.user.type !== 'ADMIN') throw createError(errorCodes.FORBIDDEN)
      await assertAdminPage(req, 'settings')
      success(res, { catalog: getCatalog() })
    } catch (error) {
      next(error)
    }
  },

  getFulfillmentRule: async function (req, res, next) {
    try {
      if (req.user.type !== 'ADMIN') throw createError(errorCodes.FORBIDDEN)
      await assertAdminPage(req, 'settings')
      const rule = await getFulfillmentRule(req.params.id)
      if (!rule) throw createError(errorCodes.NOT_FOUND)
      success(res, { rule })
    } catch (error) {
      next(error)
    }
  },

  listFulfillmentRules: async function (req, res, next) {
    try {
      if (req.user.type !== 'ADMIN') throw createError(errorCodes.FORBIDDEN)
      await assertAdminPage(req, 'settings')
      const rules = await listFulfillmentRules()
      success(res, { rules })
    } catch (error) {
      next(error)
    }
  },

  saveFulfillmentRule: async function (req, res, next) {
    try {
      if (req.user.type !== 'ADMIN') throw createError(errorCodes.FORBIDDEN)
      await assertAdminPage(req, 'settings')
      const { id, name, description, active, flow, steps } = req.body
      const rule = await upsertFulfillmentRule({ id, name, description, active, flow, steps })
      success(res, { rule }, 'Fulfillment rule saved.')
    } catch (error) {
      next(error)
    }
  },

  deleteFulfillmentRule: async function (req, res, next) {
    try {
      if (req.user.type !== 'ADMIN') throw createError(errorCodes.FORBIDDEN)
      await assertAdminPage(req, 'settings')
      await deleteFulfillmentRule(req.params.id)
      success(res, {}, 'Fulfillment rule deleted.')
    } catch (error) {
      next(error)
    }
  }
}
