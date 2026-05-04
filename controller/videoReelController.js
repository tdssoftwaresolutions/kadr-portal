const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
const { success } = require('../utils/responses')
const { createError } = require('../utils/errors')
const errorCodes = require('../utils/errors/errorCodes')
const { extractYoutubeVideoId } = require('../utils/youtube')

function assertMediator (req) {
  const role = req.user.type || req.user.user_type
  if (role !== 'MEDIATOR') {
    throw createError(errorCodes.FORBIDDEN)
  }
}

function formatReel (row) {
  return {
    id: row.id,
    user_id: row.user_id,
    title: row.title,
    description: row.description || '',
    youtube_url: row.youtube_url,
    created_at: row.created_at,
    updated_at: row.updated_at,
    creator_name: row.user ? row.user.name : undefined
  }
}

module.exports = {
  saveVideoReel: async function (req, res, next) {
    try {
      assertMediator(req)
      const { reel } = req.body
      if (!reel || !reel.title || typeof reel.title !== 'string' || !reel.title.trim()) {
        throw createError(errorCodes.MISSING_REQUIRED_DETAIL)
      }
      if (!reel.youtube_url || typeof reel.youtube_url !== 'string' || !reel.youtube_url.trim()) {
        throw createError(errorCodes.MISSING_REQUIRED_DETAIL)
      }
      const videoId = extractYoutubeVideoId(reel.youtube_url)
      if (!videoId) {
        throw createError(errorCodes.MISSING_REQUIRED_DETAIL)
      }
      const userId = req.user.id
      const data = {
        title: reel.title.trim(),
        description: reel.description != null ? String(reel.description).trim() : '',
        youtube_url: reel.youtube_url.trim()
      }

      let saved
      if (reel.id) {
        const existing = await prisma.mediatorVideoReel.findFirst({
          where: { id: reel.id, user_id: userId }
        })
        if (!existing) throw createError(errorCodes.NOT_FOUND)
        saved = await prisma.mediatorVideoReel.update({
          where: { id: reel.id },
          data,
          include: { user: { select: { id: true, name: true } } }
        })
      } else {
        saved = await prisma.mediatorVideoReel.create({
          data: {
            user_id: userId,
            ...data
          },
          include: { user: { select: { id: true, name: true } } }
        })
      }
      success(res, { reel: formatReel(saved) }, 'Video saved successfully')
    } catch (err) {
      next(err)
    }
  },

  deleteVideoReel: async function (req, res, next) {
    try {
      assertMediator(req)
      const { id } = req.params
      const existing = await prisma.mediatorVideoReel.findFirst({
        where: { id, user_id: req.user.id }
      })
      if (!existing) throw createError(errorCodes.NOT_FOUND)
      await prisma.mediatorVideoReel.delete({ where: { id } })
      success(res, { message: 'Video deleted successfully' })
    } catch (err) {
      next(err)
    }
  },

  getMyVideoReels: async function (req, res, next) {
    try {
      assertMediator(req)
      const page = Math.max(1, parseInt(req.query.page, 10) || 1)
      const perPage = 10
      const skip = (page - 1) * perPage
      const userId = req.user.id
      const [rows, total] = await Promise.all([
        prisma.mediatorVideoReel.findMany({
          where: { user_id: userId },
          orderBy: { created_at: 'desc' },
          skip,
          take: perPage,
          include: { user: { select: { id: true, name: true } } }
        }),
        prisma.mediatorVideoReel.count({ where: { user_id: userId } })
      ])
      success(res, {
        reels: rows.map(formatReel),
        total,
        page,
        perPage
      })
    } catch (err) {
      next(err)
    }
  },

  getPublicVideoReels: async function (req, res, next) {
    try {
      const page = Math.max(1, parseInt(req.query.page, 10) || 1)
      const limit = Math.min(20, Math.max(1, parseInt(req.query.limit, 10) || 6))
      const skip = (page - 1) * limit
      const [rows, total] = await Promise.all([
        prisma.mediatorVideoReel.findMany({
          orderBy: { created_at: 'desc' },
          skip,
          take: limit,
          include: { user: { select: { id: true, name: true } } }
        }),
        prisma.mediatorVideoReel.count()
      ])
      const hasMore = skip + rows.length < total
      success(res, {
        reels: rows.map(formatReel),
        page,
        limit,
        total,
        hasMore
      })
    } catch (err) {
      next(err)
    }
  }
}
