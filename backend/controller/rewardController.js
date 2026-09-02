const { createError } = require('../utils/errors')
const errorCodes = require('../utils/errors/errorCodes')
const { success } = require('../utils/responses')
const { assertAdminPage } = require('../utils/adminPermissionHelpers')
const {
  getMediatorRewardSummary,
  listCatalogAdmin,
  upsertCatalogItem,
  deleteCatalogItem,
  redeemCatalogItem,
  listRedemptionOrdersAdmin,
  fulfillRedemptionOrder
} = require('../services/reward/rewardService')

module.exports = {
  getMyRewards: async function (req, res, next) {
    try {
      if (req.user.type !== 'MEDIATOR') throw createError(errorCodes.FORBIDDEN)
      const page = Math.max(1, parseInt(req.query.page, 10) || 1)
      const summary = await getMediatorRewardSummary(req.user.id, page)
      success(res, summary)
    } catch (error) {
      next(error)
    }
  },

  redeemReward: async function (req, res, next) {
    try {
      if (req.user.type !== 'MEDIATOR') throw createError(errorCodes.FORBIDDEN)
      const { catalogItemId } = req.body
      if (!catalogItemId) throw createError(errorCodes.MISSING_REQUIRED_DETAIL)
      const order = await redeemCatalogItem(req.user.id, catalogItemId)
      const msg = order?.status === 'FULFILLED'
        ? 'Reward redeemed and applied to your account.'
        : 'Your redemption request has been placed. Our team will fulfill it shortly.'
      success(res, { order }, msg)
    } catch (error) {
      next(error)
    }
  },

  getMediatorRewardsAdmin: async function (req, res, next) {
    try {
      if (req.user.type !== 'ADMIN') throw createError(errorCodes.FORBIDDEN)
      await assertAdminPage(req, 'settings')
      const { mediatorId } = req.query
      if (!mediatorId) throw createError(errorCodes.MISSING_REQUIRED_DETAIL)
      const page = Math.max(1, parseInt(req.query.page, 10) || 1)
      const summary = await getMediatorRewardSummary(mediatorId, page)
      success(res, summary)
    } catch (error) {
      next(error)
    }
  },

  getRewardCatalogAdmin: async function (req, res, next) {
    try {
      if (req.user.type !== 'ADMIN') throw createError(errorCodes.FORBIDDEN)
      await assertAdminPage(req, 'settings')
      const items = await listCatalogAdmin()
      success(res, { items })
    } catch (error) {
      next(error)
    }
  },

  saveRewardCatalogItem: async function (req, res, next) {
    try {
      if (req.user.type !== 'ADMIN') throw createError(errorCodes.FORBIDDEN)
      await assertAdminPage(req, 'settings')
      const {
        id,
        title,
        description,
        points_cost,
        active,
        sort_order,
        fulfillment_type,
        fulfillment_rule_id
      } = req.body
      const item = await upsertCatalogItem({
        id,
        title,
        description,
        points_cost,
        active,
        sort_order,
        fulfillment_type,
        fulfillment_rule_id
      })
      success(res, { item }, 'Reward item saved')
    } catch (error) {
      next(error)
    }
  },

  deleteRewardCatalogItem: async function (req, res, next) {
    try {
      if (req.user.type !== 'ADMIN') throw createError(errorCodes.FORBIDDEN)
      await assertAdminPage(req, 'settings')
      const { id } = req.params
      await deleteCatalogItem(id)
      success(res, {}, 'Reward item removed')
    } catch (error) {
      next(error)
    }
  },

  getRewardOrdersAdmin: async function (req, res, next) {
    try {
      if (req.user.type !== 'ADMIN') throw createError(errorCodes.FORBIDDEN)
      await assertAdminPage(req, 'reward-orders')
      const page = Math.max(1, parseInt(req.query.page, 10) || 1)
      const status = req.query.status || null
      const result = await listRedemptionOrdersAdmin({ status, page })
      success(res, result)
    } catch (error) {
      next(error)
    }
  },

  fulfillRewardOrder: async function (req, res, next) {
    try {
      if (req.user.type !== 'ADMIN') throw createError(errorCodes.FORBIDDEN)
      await assertAdminPage(req, 'reward-orders')
      const { id } = req.params
      const { admin_notes: adminNotes } = req.body
      const order = await fulfillRedemptionOrder(id, req.user.id, adminNotes)
      success(res, { order }, 'Order marked as fulfilled')
    } catch (error) {
      next(error)
    }
  }
}
