const prisma = require('../lib/prisma.js')
const { createError } = require('../utils/errors')
const errorCodes = require('../utils/errors/errorCodes')
const { success } = require('../utils/responses')
const { listFeeds, fetchFeedItems } = require('../services/mediatorTools/legalFeedService')
const {
  listTrackers,
  addTracker,
  refreshTracker,
  getTrackerDetails,
  removeTracker
} = require('../services/mediatorTools/courtCaseService')

function assertMediator (req) {
  if (req.user.type !== 'MEDIATOR') throw createError(errorCodes.FORBIDDEN)
}

module.exports = {
  getLegalFeeds: async function (req, res, next) {
    try {
      assertMediator(req)
      const feedId = req.query.feed || undefined
      const limit = Math.min(30, Math.max(1, parseInt(req.query.limit, 10) || 12))
      const payload = await fetchFeedItems(feedId, limit)
      success(res, payload)
    } catch (error) {
      next(error)
    }
  },

  listLegalFeedCatalog: async function (req, res, next) {
    try {
      assertMediator(req)
      success(res, { feeds: listFeeds() })
    } catch (error) {
      next(error)
    }
  },

  listCourtCaseTrackers: async function (req, res, next) {
    try {
      assertMediator(req)
      const trackers = await listTrackers(prisma, req.user.id)
      success(res, { trackers })
    } catch (error) {
      next(error)
    }
  },

  addCourtCaseTracker: async function (req, res, next) {
    try {
      assertMediator(req)
      const { cnr, label } = req.body
      if (!cnr) throw createError(errorCodes.MISSING_REQUIRED_DETAIL)
      const tracker = await addTracker(prisma, req.user.id, { cnr, label })
      success(res, { tracker }, 'Case loaded from eCourts India')
    } catch (error) {
      next(error)
    }
  },

  refreshCourtCaseTracker: async function (req, res, next) {
    try {
      assertMediator(req)
      const { id } = req.params
      const payload = await refreshTracker(prisma, req.user.id, id)
      success(res, payload, 'Latest case status saved from eCourts India')
    } catch (error) {
      next(error)
    }
  },

  getCourtCaseTrackerDetails: async function (req, res, next) {
    try {
      assertMediator(req)
      const { id } = req.params
      const payload = await getTrackerDetails(prisma, req.user.id, id)
      success(res, payload)
    } catch (error) {
      next(error)
    }
  },

  removeCourtCaseTracker: async function (req, res, next) {
    try {
      assertMediator(req)
      const { id } = req.params
      await removeTracker(prisma, req.user.id, id)
      success(res, {}, 'Case removed from tracker')
    } catch (error) {
      next(error)
    }
  }
}
