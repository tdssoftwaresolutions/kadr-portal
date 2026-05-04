const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
const helper = require('../utils/helper')
const { success, error } = require('../utils/responses')
const striptags = require('striptags')

module.exports = {
  saveBlog: async function (req, res) {
    const { blog, status } = req.body
    const { id, email, name } = req.user
    const savedBlog = await helper.saveBlog(prisma, blog, id, status)
    const formattedBlog = {
      id: savedBlog.id,
      title: savedBlog.title,
      content: savedBlog.content,
      author_id: savedBlog.authorId,
      status: savedBlog.status,
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
      const htmlBody = `
                <p>Your blog <b>${savedBlog.title}</b> is now live!</p>
                <p>To view your blog, click <a href="${process.env.BASE_URL}/blog-detail?id=${savedBlog.id}">here</a>.</p>
                <p>Thank you for sharing your thoughts with the community!</p>`
      await helper.sendEmail(name, email, `Your blog '${savedBlog.title}' is now live!`, htmlBody)
    }
    success(res, { blog: formattedBlog }, 'Blog saved successfully')
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
