const prisma = require('../lib/prisma.js')
const helper = require('../utils/helper')
const { awardRewardPoints } = require('../services/reward/rewardService')
const { success, error } = require('../utils/responses')
const striptags = require('striptags')
const { assertAdminPage } = require('../utils/adminPermissionHelpers')

module.exports = {
  getAdminBlogTaxonomy: async function (req, res, next) {
    try {
      if (req.user?.type !== 'ADMIN') {
        return error(res, { message: 'Forbidden' }, 403)
      }
      await assertAdminPage(req, 'blog-taxonomy')
      const [categories, tags] = await Promise.all([
        prisma.categories.findMany({
          orderBy: { name: 'asc' },
          include: {
            _count: {
              select: { blog_categories: true }
            }
          }
        }),
        prisma.tags.findMany({
          orderBy: { name: 'asc' },
          include: {
            _count: {
              select: { blog_tags: true }
            }
          }
        })
      ])
      success(res, { categories, tags })
    } catch (e) {
      next(e)
    }
  },
  createBlogCategory: async function (req, res, next) {
    try {
      if (req.user?.type !== 'ADMIN') {
        return error(res, { message: 'Forbidden' }, 403)
      }
      await assertAdminPage(req, 'blog-taxonomy')
      const name = (req.body?.name || '').trim()
      if (!name) {
        return error(res, { message: 'Category name is required' }, 400)
      }
      const category = await prisma.categories.create({
        data: { name }
      })
      success(res, { category }, 'Category created successfully')
    } catch (e) {
      next(e)
    }
  },
  updateBlogCategory: async function (req, res, next) {
    try {
      if (req.user?.type !== 'ADMIN') {
        return error(res, { message: 'Forbidden' }, 403)
      }
      await assertAdminPage(req, 'blog-taxonomy')
      const { id, name } = req.body || {}
      const nextName = (name || '').trim()
      if (!id || !nextName) {
        return error(res, { message: 'Category id and name are required' }, 400)
      }
      const category = await prisma.categories.update({
        where: { id },
        data: { name: nextName }
      })
      success(res, { category }, 'Category updated successfully')
    } catch (e) {
      next(e)
    }
  },
  deleteBlogCategory: async function (req, res, next) {
    try {
      if (req.user?.type !== 'ADMIN') {
        return error(res, { message: 'Forbidden' }, 403)
      }
      await assertAdminPage(req, 'blog-taxonomy')
      const id = req.params.id
      if (!id) return error(res, { message: 'Category id is required' }, 400)
      const linksCount = await prisma.blog_categories.count({
        where: { category_id: id }
      })
      if (linksCount > 0) {
        return error(res, { message: 'Category is linked to blogs and cannot be deleted' }, 400)
      }
      await prisma.categories.delete({
        where: { id }
      })
      success(res, {}, 'Category deleted successfully')
    } catch (e) {
      next(e)
    }
  },
  createBlogTag: async function (req, res, next) {
    try {
      if (req.user?.type !== 'ADMIN') {
        return error(res, { message: 'Forbidden' }, 403)
      }
      await assertAdminPage(req, 'blog-taxonomy')
      const name = (req.body?.name || '').trim()
      if (!name) {
        return error(res, { message: 'Tag name is required' }, 400)
      }
      const tag = await prisma.tags.create({
        data: { name }
      })
      success(res, { tag }, 'Tag created successfully')
    } catch (e) {
      next(e)
    }
  },
  updateBlogTag: async function (req, res, next) {
    try {
      if (req.user?.type !== 'ADMIN') {
        return error(res, { message: 'Forbidden' }, 403)
      }
      await assertAdminPage(req, 'blog-taxonomy')
      const { id, name } = req.body || {}
      const nextName = (name || '').trim()
      if (!id || !nextName) {
        return error(res, { message: 'Tag id and name are required' }, 400)
      }
      const tag = await prisma.tags.update({
        where: { id },
        data: { name: nextName }
      })
      success(res, { tag }, 'Tag updated successfully')
    } catch (e) {
      next(e)
    }
  },
  deleteBlogTag: async function (req, res, next) {
    try {
      if (req.user?.type !== 'ADMIN') {
        return error(res, { message: 'Forbidden' }, 403)
      }
      await assertAdminPage(req, 'blog-taxonomy')
      const id = req.params.id
      if (!id) return error(res, { message: 'Tag id is required' }, 400)
      const linksCount = await prisma.blog_tags.count({
        where: { tag_id: id }
      })
      if (linksCount > 0) {
        return error(res, { message: 'Tag is linked to blogs and cannot be deleted' }, 400)
      }
      await prisma.tags.delete({
        where: { id }
      })
      success(res, {}, 'Tag deleted successfully')
    } catch (e) {
      next(e)
    }
  },
  saveBlog: async function (req, res, next) {
    try {
      const { blog, status } = req.body
      if (!blog || !blog.contentRightsConfirmed) {
        return error(res, { message: 'You must confirm that this content is your own, that it is not copied from a third party without permission, and that you have the right to publish it on this website.' }, 400)
      }
      const { id, email, name } = req.user
      const savedBlog = await helper.saveBlog(prisma, blog, id, status)
      const formattedBlog = {
        id: savedBlog.id,
        title: savedBlog.title,
        content: savedBlog.content,
        author_id: savedBlog.authorId,
        status: savedBlog.status,
        url: savedBlog.url,
        created_at: savedBlog.created_at,
        updated_at: savedBlog.updated_at,
        categories: savedBlog.blog_categories.map((bt) => ({
          id: bt.categories.id,
          name: bt.categories.name
        })),
        tags: savedBlog.blog_tags.map((bt) => ({
          id: bt.tags.id,
          name: bt.tags.name
        }))
      }
      if (status === 'Published') {
        await helper.sendTemplatedEmail('blogPublished', email, {
          recipientName: name,
          title: savedBlog.title,
          blogUrl: `${process.env.BASE_URL}/${savedBlog.url}`
        })
        try {
          await awardRewardPoints({
            mediatorId: id,
            reasonCode: 'blog_published',
            referenceId: savedBlog.id
          })
        } catch (rewardErr) {
          console.error('Reward on blog publish:', rewardErr)
        }
      }
      success(res, { blog: formattedBlog }, 'Blog saved successfully')
    } catch (e) {
      next(e)
    }
  },
  deleteBlog: async function (req, res) {
    const { id } = req.params
    const userId = req.user.id
    await helper.deleteBlog(prisma, id, userId)
    success(res, { message: 'Blog deleted successfully' })
  },
  getBlog: async function (req, res) {
    try {
      const blog = await helper.getBlog(prisma, req.query.id)
      if (!blog || blog.status !== 'Published') {
        return error(res, { message: 'Blog not found' }, 404)
      }
      if (!blog.user) {
        return error(res, { message: 'Blog not found' }, 404)
      }
      const top3Raw = await helper.getTop3LatestBlogs(prisma, blog.id)
      const formattedBlog = {
        id: blog.id,
        title: blog.title,
        content: blog.content,
        author_id: blog.user.id,
        author_name: blog.user.name,
        url: blog.url,
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
      const top3LatestBlog = top3Raw.map((b) => ({
        id: b.id,
        title: b.title,
        author_id: b.user ? b.user.id : null,
        author_name: b.user ? b.user.name : '',
        created_at: b.created_at
      }))
      success(res, { blog: formattedBlog, top3LatestBlog })
    } catch (e) {
      console.error('getBlog', e)
      return error(res, { message: 'Could not load blog' }, 500)
    }
  },
  geAllBlogs: async function (req, res) {
    const { page, search, category, author, tag } = req.query
    const pageNum = Math.max(1, parseInt(page, 10) || 1)
    const [allBlogs, blogsCount] = await Promise.all([
      helper.getAllBlogs(prisma, pageNum, search, category, author, tag),
      helper.getAllBlogsCount(prisma, search, category, author, tag)
    ])
    const formattedBlogs = allBlogs.map((blog) => {
      const strippedContent = striptags(blog.content) // Remove HTML tags
      const lines = strippedContent.split('\n') // Split into lines
      const limitedContent = lines.slice(0, 5).join('') + '....' // Limit to first 5 lin
      return {
        id: blog.id,
        title: blog.title,
        content: limitedContent,
        author_id: blog.user.id,
        author_name: blog.user.name,
        url: blog.url,
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
    success(res, { blogs: formattedBlogs, total: blogsCount, page: pageNum, perPage: 10 })
  },
  getMyBlogs: async function (req, res) {
    const [myBlogs, blogsCount] = await Promise.all([
      helper.getMyBlogs(prisma, req.user.id, req.query.page),
      helper.getBlogsCount(prisma, req.user.id)
    ])
    const formattedBlogs = myBlogs.map((blog) => ({
      id: blog.id,
      title: blog.title,
      content: blog.content,
      author_id: blog.authorId,
      status: blog.status,
      url: blog.url,
      created_at: blog.created_at,
      updated_at: blog.updated_at,
      categories: blog.blog_categories.map((bt) => ({
        id: bt.categories.id,
        name: bt.categories.name
      })),
      tags: blog.blog_tags.map((bt) => ({
        id: bt.tags.id,
        name: bt.tags.name
      }))
    }))
    success(res, { blogs: formattedBlogs, total: blogsCount, page: 1, perPage: 10 })
  },
  getPublicBlogAssets: async function (req, res) {
    const [blogCountPerCategory, blogTags] = await Promise.all([
      helper.getBlogCountPerCategory(prisma),
      helper.getBlogTags(prisma)
    ])
    success(res, { blogCountPerCategory, blogTags })
  },
  getBlogComments: async function (req, res) {
    const blogId = req.query.blogId
    if (!blogId) {
      return error(res, { message: 'blogId required' }, 400)
    }
    const blog = await prisma.blogs.findFirst({
      where: { id: blogId, status: 'Published' }
    })
    if (!blog) {
      return error(res, { message: 'Blog not found' }, 404)
    }
    const commentsRaw = await prisma.blog_comments.findMany({
      where: { blog_id: blogId },
      orderBy: { created_at: 'desc' },
      take: 200,
      include: {
        user: { select: { id: true, name: true } }
      }
    })
    const comments = commentsRaw.map((c) => ({
      id: c.id,
      blog_id: c.blog_id,
      message: c.message,
      rating: c.rating,
      author_label: c.author_label,
      user_id: c.user_id,
      created_at: c.created_at,
      author_name: c.user ? c.user.name : c.author_label || null
    }))
    success(res, { comments })
  },
  postBlogComment: async function (req, res) {
    const userId = req.user && req.user.id
    if (!userId) {
      return error(res, { message: 'Authentication required' }, 401)
    }
    const { blogId, message, rating } = req.body
    const r = parseInt(rating, 10)
    if (!blogId || typeof message !== 'string' || !message.trim()) {
      return error(res, { message: 'blogId and message are required' }, 400)
    }
    if (!r || r < 1 || r > 5) {
      return error(res, { message: 'rating must be 1–5' }, 400)
    }
    const blog = await prisma.blogs.findFirst({
      where: { id: blogId, status: 'Published' }
    })
    if (!blog) {
      return error(res, { message: 'Blog not found' }, 404)
    }
    const comment = await prisma.blog_comments.create({
      data: {
        blog_id: blogId,
        user_id: userId,
        message: message.trim().slice(0, 2000),
        rating: r,
        author_label: null
      },
      include: {
        user: { select: { id: true, name: true } }
      }
    })

    const commentCount = await prisma.blog_comments.count({ where: { blog_id: blogId } })
    if (commentCount >= 10 && blog.author_id) {
      try {
        await awardRewardPoints({
          mediatorId: blog.author_id,
          reasonCode: 'blog_10_comments',
          referenceId: blogId
        })
      } catch (rewardErr) {
        console.error('Reward on blog 10 comments:', rewardErr)
      }
    }

    success(res, {
      comment: {
        id: comment.id,
        blog_id: comment.blog_id,
        message: comment.message,
        rating: comment.rating,
        author_label: comment.author_label,
        user_id: comment.user_id,
        created_at: comment.created_at,
        author_name: comment.user ? comment.user.name : null
      }
    })
  },
  getBlogAssets: async function (req, res) {
    const [blogCategories, blogTags] = await Promise.all([
      helper.getBlogCategories(prisma),
      helper.getBlogTags(prisma)
    ])
    success(res, { blogCategories, blogTags })
  }
}
