const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
const helper = require('../utils/helper')
const { success } = require('../utils/responses')
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
                <p>To view your blog, click <a href="${process.env.BASE_URL}/blog-detail.html?id=${savedBlog.id}">here</a>.</p>
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
    const [blog, top3LatestBlog] = await Promise.all([
      helper.getBlog(prisma, req.query.id),
      helper.getTop3LatestBlogs(prisma)
    ])
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
    success(res, { blog: formattedBlog, top3LatestBlog })
  },
  geAllBlogs: async function (req, res) {
    const { page, search, category, author, tag } = req.query
    const [allBlogs, blogsCount] = await Promise.all([
      helper.getAllBlogs(prisma, page, search, category, author, tag),
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
    success(res, { blogs: formattedBlogs, total: blogsCount, page: 1, perPage: 10 })
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
    const [blogCountPerCategory] = await Promise.all([
      helper.getBlogCountPerCategory(prisma)
    ])
    success(res, { blogCountPerCategory })
  },
  getBlogAssets: async function (req, res) {
    const [blogCategories, blogTags] = await Promise.all([
      helper.getBlogCategories(prisma),
      helper.getBlogTags(prisma)
    ])
    success(res, { blogCategories, blogTags })
  }
}
