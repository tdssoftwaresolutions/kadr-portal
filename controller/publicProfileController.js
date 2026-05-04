const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
const { success, error } = require('../utils/responses')
const striptags = require('striptags')
const { extractYoutubeVideoId } = require('../utils/youtube')

function formatReel (row) {
  const videoId = row.youtube_url ? extractYoutubeVideoId(row.youtube_url) : null
  return {
    id: row.id,
    title: row.title,
    description: row.description || '',
    youtube_url: row.youtube_url,
    youtube_video_id: videoId,
    created_at: row.created_at
  }
}

module.exports = {
  getPublicMediatorProfile: async function (req, res) {
    try {
      const id = req.query.id
      if (!id || typeof id !== 'string') {
        return error(res, { message: 'id is required' }, 400)
      }
      const mediator = await prisma.user.findFirst({
        where: {
          id,
          user_type: 'MEDIATOR',
          active: true
        },
        select: {
          id: true,
          name: true,
          profile_picture_url: true
        }
      })
      if (!mediator) {
        return error(res, { message: 'Profile not found' }, 404)
      }

      const [blogRows, reelRows] = await Promise.all([
        prisma.blogs.findMany({
          where: { author_id: id, status: 'Published' },
          orderBy: { created_at: 'desc' },
          take: 100,
          include: {
            blog_categories: { include: { categories: true } },
            blog_tags: { include: { tags: true } }
          }
        }),
        prisma.mediatorVideoReel.findMany({
          where: { user_id: id },
          orderBy: { created_at: 'desc' },
          take: 100
        })
      ])

      const blogs = blogRows.map((blog) => {
        const stripped = striptags(blog.content || '')
        const lines = stripped.split('\n')
        const excerpt = lines.slice(0, 5).join('').slice(0, 280) + (stripped.length > 280 ? '…' : '')
        return {
          id: blog.id,
          title: blog.title,
          excerpt,
          created_at: blog.created_at,
          categories: blog.blog_categories.map((bt) => ({
            id: bt.categories.id,
            name: bt.categories.name
          })),
          tags: blog.blog_tags.map((bt) => ({
            id: bt.tags.id,
            name: bt.tags.name
          }))
        }
      })

      const reels = reelRows.map(formatReel)

      success(res, {
        mediator,
        blogs,
        reels
      })
    } catch (e) {
      console.error('getPublicMediatorProfile', e)
      return error(res, { message: 'Could not load profile' }, 500)
    }
  }
}
