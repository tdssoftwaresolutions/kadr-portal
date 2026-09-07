const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const crypto = require('crypto')
const errorCodes = require('./errors/errorCodes')
const { google } = require('googleapis')
const { CaseTypes } = require('../utils/caseConstants')
const path = require('path')
const fs = require('fs')
const axios = require('axios')
const EmailService = require('../services/email/emailService')
const dataCrypto = require('./crypto')

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `${process.env.BASE_URL}/api/googleCallback`
)

class Helper {
  static getActiveCaseStatuses () {
    return [CaseTypes.NEW, CaseTypes.IN_PROGRESS]
  }

  static getPastCaseStatuses () {
    return [CaseTypes.FAILED, CaseTypes.CANCELLED, CaseTypes.CLOSED_NO_SUCCESS, CaseTypes.CLOSED_SUCCESS]
  }

  static generateRandomPassword (length = 12) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let password = ''

    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * chars.length)
      password += chars[randomIndex]
    }

    return password
  }

  static generateUniqueSignUpLink (userId) {
    const token = jwt.sign({ id: userId }, process.env.SECRET_KEY, { expiresIn: '30d' })
    return `${process.env.BASE_URL}/admin/auth/sign-up?id=${token}`
  }

  static async getMediatorCasesCount (prisma, mediatorId, statuses = Helper.getActiveCaseStatuses()) {
    return prisma.cases.count({
      where: {
        mediator: mediatorId,
        status: {
          in: statuses
        }
      }
    })
  }

  static getTodaysEvents (casesWithEvents, personalEvents) {
    const caseEvents = casesWithEvents.flatMap(caseItem => {
      return (caseItem.events)
        ?.filter(event => {
          const date = new Date()
          return new Date(event.start_datetime).toISOString().split('T')[0] === new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().split('T')[0]
        })
        .map(event => ({
          type: 'KADR',
          caseNumber: caseItem?.caseId,
          startDate: event.start_datetime,
          endDate: event.end_datetime,
          firstPartyName: caseItem?.user_cases_first_partyTouser?.name || 'N/A',
          secondPartyName: caseItem?.user_cases_second_partyTouser?.name || 'N/A',
          meetingLink: event.meeting_link
        }))
    })
    const pEvents = personalEvents.filter(event => {
      const date = new Date()
      return new Date(event.start_datetime).toISOString().split('T')[0] === new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().split('T')[0]
    })
      .map(event => ({
        type: 'PERSONAL',
        caseNumber: '',
        startDate: event.start_datetime,
        endDate: event.end_datetime,
        firstPartyName: '',
        secondPartyName: '',
        meetingLink: event.meeting_link,
        title: event.title,
        description: event.description
      }))

    return caseEvents.concat(pEvents).sort((a, b) => new Date(b.startDate) - new Date(a.startDate))
  }

  static async getTodaysPersonalMeetings (prisma, mediatorId) {
    const today = new Date()
    const startOfToday = new Date(today.setHours(0, 0, 0, 0))
    const endOfToday = new Date(today.setHours(23, 59, 59, 999))
    return prisma.events.findMany({
      where: {
        created_by: mediatorId,
        type: 'PERSONAL',
        start_datetime: {
          gte: startOfToday, // Greater than or equal to the start of today
          lte: endOfToday // Less than or equal to the end of today
        }
      },
      orderBy: {
        created_at: 'desc'
      },
      select: {
        id: true,
        title: true,
        description: true,
        start_datetime: true,
        end_datetime: true,
        type: true,
        meeting_link: true
      }
    })
  }

  static async getClientCasesCount (prisma, clientId, statuses = Helper.getActiveCaseStatuses()) {
    return prisma.cases.count({
      where: {
        AND: [
          {
            OR: [
              { first_party: clientId },
              { second_party: clientId },
              { first_party_representative: clientId },
              { second_party_representative: clientId }
            ]
          }
        ],
        status: {
          in: statuses
        }
      }
    })
  }

  static async getClientCases (prisma, clientId, page, statuses = Helper.getActiveCaseStatuses()) {
    const perPage = 10
    // Calculate the number of items to skip
    const skip = (page - 1) * perPage
    return prisma.cases.findMany({
      where: {
        AND: [
          {
            OR: [
              { first_party: clientId },
              { second_party: clientId },
              { first_party_representative: clientId },
              { second_party_representative: clientId }
            ]
          }
        ],
        status: {
          in: statuses
        }
      },
      orderBy: {
        created_at: 'desc'
      },
      skip, // Skip items for pagination
      take: perPage, // Limit the number of items per page
      select: {
        id: true,
        description: true,
        category: true,
        case_type: true,
        caseId: true,
        created_at: true,
        evidence_document_url: true,
        first_party_representative: true,
        second_party_representative: true,
        case_statuses: {
          select: {
            id: true,
            name: true
          }
        },
        case_sub_statuses: {
          select: {
            id: true,
            name: true
          }
        },
        user_cases_first_partyTouser: {
          select: {
            id: true,
            preferred_languages: true,
            name: true,
            email: true,
            phone_number: true,
            state: true,
            city: true
          }
        },
        user_cases_mediatorTouser: {
          select: {
            id: true,
            name: true
          }
        },
        user_cases_second_partyTouser: {
          select: {
            id: true,
            preferred_languages: true,
            name: true,
            email: true,
            phone_number: true,
            state: true,
            city: true
          }
        },
        // Representative info: name only (per requirement the other party must
        // not see representative contact details). isRepresentative /
        // representingSide in the case-progress payload tell the viewer they are
        // tagged as a representative rather than a party.
        user_cases_first_party_repTouser: {
          select: {
            id: true,
            name: true
          }
        },
        user_cases_second_party_repTouser: {
          select: {
            id: true,
            name: true
          }
        },
        events: {
          orderBy: {
            start_datetime: 'desc'
          },
          select: {
            id: true,
            title: true,
            description: true,
            start_datetime: true,
            end_datetime: true,
            type: true,
            meeting_link: true,
            meeting_summary: true,
            mediator_next_steps: true,
            first_party_next_steps: true,
            second_party_next_steps: true,
            first_party_rating: true,
            second_party_rating: true,
            mediator_feedback_at: true,
            first_party_feedback_at: true,
            second_party_feedback_at: true
          }
        },
        case_history: {
          orderBy: {
            created_at: 'desc'
          },
          select: {
            id: true,
            case_event_id: true,
            created_at: true
          }
        },
        transactions: {
          orderBy: { transaction_date: 'desc' },
          select: {
            transaction_id: true,
            amount: true,
            currency: true,
            success: true,
            reason: true,
            transaction_date: true,
            payment_method: true
          }
        },
        case_agreement_tracking: {
          select: {
            id: true,
            first_party_signature_datetime: true,
            second_party_signature_datetime: true,
            created_at: true,
            updated_at: true,
            signature_tracking: {
              where: {
                user_id: clientId,
                signed: false
              },
              select: { id: true },
              take: 1,
              orderBy: { created_at: 'desc' }
            }
          }
        }
      }
    })
  }

  static getEventsForToday (cases) {
    const today = new Date()
    const startOfToday = new Date(today.setHours(0, 0, 0, 0)) // Start of today
    const endOfToday = new Date(today.setHours(23, 59, 59, 999)) // End of today

    // Iterate over the cases array and filter events scheduled for today
    return cases.flatMap(caseItem => {
      // Filter events that are within today's date range
      const eventsToday = caseItem.events.filter(event => {
        const eventStart = new Date(event.start_datetime)
        const eventEnd = new Date(event.end_datetime)

        // Check if event start or end time is today
        return eventStart >= startOfToday && eventEnd <= endOfToday
      })

      // Return the filtered events along with required case details
      return eventsToday.map(event => ({
        ...event,
        caseId: caseItem.caseId,
        caseType: caseItem.case_type,
        caseFirstPartyName: caseItem.user_cases_first_partyTouser?.name,
        caseSecondPartyName: caseItem.user_cases_second_partyTouser?.name,
        case_id: caseItem.id // case.id if it's different from caseId
      }))
    })
  }

  static generateBlogSlug (title) {
    const sanitized = String(title || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '')
    return sanitized || 'blog'
  }

  static escapeHtml (value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
  }

  static async resolveBlogUrl (prisma, slug, blogId) {
    let candidate = `blog/${slug}`
    let suffix = 1
    while (await prisma.blogs.findFirst({
      where: {
        url: candidate,
        ...(blogId ? { id: { not: blogId } } : {})
      }
    })) {
      suffix += 1
      candidate = `blog/${slug}-${suffix}`
    }
    return candidate
  }

  static async writeStaticBlogPage (blog, previousUrl) {
    const templatePath = path.join(__dirname, '..', 'blog.sample')
    const outputFileName = blog.url ? `${blog.url}.html` : `blog/${Helper.generateBlogSlug(blog.title)}.html`
    const outputFilePath = path.join(__dirname, '..', '..', 'public', 'website', outputFileName)
    const outputFolder = path.dirname(outputFilePath)
    await fs.promises.mkdir(outputFolder, { recursive: true })
    const template = await fs.promises.readFile(templatePath, 'utf8')

    const authorName = Helper.escapeHtml(blog.user?.name || '')
    const authorLink = blog.author_id
      ? `<a class="blog-author-link" href="/profile?id=${Helper.escapeHtml(blog.author_id)}">${authorName}</a>`
      : `<strong>${authorName}</strong>`

    const metaParts = [authorLink, new Date(blog.created_at).toLocaleDateString()]
    if (blog.blog_categories && blog.blog_categories.length) {
      metaParts.push(
        blog.blog_categories.map((bt) => `<span class="tag tag-brown">${Helper.escapeHtml(bt.categories.name)}</span>`).join(' ')
      )
    }
    if (blog.blog_tags && blog.blog_tags.length) {
      metaParts.push(
        blog.blog_tags.map((bt) => `<span class="tag tag-sage">${Helper.escapeHtml(bt.tags.name)}</span>`).join(' ')
      )
    }

    if (previousUrl && previousUrl !== outputFileName) {
      const oldFilePath = path.join(__dirname, '..', '..', 'public', 'website', previousUrl + '.html')
      await fs.promises.unlink(oldFilePath).catch(() => {})
    }

    const fileContent = template
      .replace(/__BLOG_TITLE__/g, Helper.escapeHtml(blog.title))
      .replace(/__BLOG_META__/g, metaParts.join(' · '))
      .replace(/__BLOG_CONTENT__/g, blog.content || '')
      .replace(/__BLOG_ID__/g, Helper.escapeHtml(blog.id))

    await fs.promises.writeFile(outputFilePath, fileContent, 'utf8')
  }

  static async saveBlog (prisma, blogData, authorId, status) {
    const { sanitizeRichHtml } = require('./htmlSanitizer')
    const sanitizedContent = sanitizeRichHtml(blogData.content || '')
    let savedBlog
    let previousUrl = null
    if (blogData.id) {
      const existingBlog = await prisma.blogs.findUnique({
        where: { id: blogData.id },
        select: { url: true }
      })
      previousUrl = existingBlog?.url || null
    }
    await prisma.$transaction(async (prisma) => {
      const blog = await prisma.blogs.upsert({
        where: {
          id: blogData.id || '-1'
        },
        update: {
          title: blogData.title, // Fields to update if the record exists
          content: sanitizedContent,
          author_id: authorId,
          status
        },
        create: {
          title: blogData.title,
          content: sanitizedContent,
          author_id: authorId,
          status
        }
      })

      if (blogData.categories && blogData.categories.length > 0) {
        const categoryIdsFromRequest = blogData.categories.map((category) => category.id)

        // Fetch existing categories for this blog
        const existingCategories = await prisma.blog_categories.findMany({
          where: { blog_id: blog.id }
        })
        const existingCategoryIds = existingCategories.map((c) => c.category_id)

        // Add new categories
        for (const categoryId of categoryIdsFromRequest) {
          await prisma.blog_categories.upsert({
            where: {
              blog_id_category_id: {
                blog_id: blog.id,
                category_id: categoryId
              }
            },
            update: {}, // No update needed
            create: {
              blog_id: blog.id,
              category_id: categoryId
            }
          })
        }

        // Remove categories that are no longer in the request
        const categoryIdsToRemove = existingCategoryIds.filter(
          (id) => !categoryIdsFromRequest.includes(id)
        )
        if (categoryIdsToRemove.length > 0) {
          await prisma.blog_categories.deleteMany({
            where: {
              blog_id: blog.id,
              category_id: { in: categoryIdsToRemove }
            }
          })
        }
      }
      if (blogData.tags && blogData.tags.length > 0) {
        const newTags = blogData.tags.filter((tag) => tag.id.startsWith('NEW-'))
        const existingTags = blogData.tags.filter((tag) => !tag.id.startsWith('NEW-'))

        // Create new tags
        const newTagRecords = await Promise.all(
          newTags.map(async (tag) => {
            const existingTag = await prisma.tags.findUnique({
              where: { name: tag.name }
            })
            if (existingTag) {
              // Reuse the existing tag's ID
              return existingTag
            } else {
              // Create a new tag
              return prisma.tags.create({
                data: {
                  name: tag.name
                }
              })
            }
          })
        )

        // Combine new tag IDs with existing ones
        const tagIdsFromRequest = [
          ...newTagRecords.map((tag) => tag.id),
          ...existingTags.map((tag) => tag.id)
        ]

        // Fetch existing tags for this blog
        const existingTagsForBlog = await prisma.blog_tags.findMany({
          where: { blog_id: blog.id }
        })
        const existingTagIds = existingTagsForBlog.map((t) => t.tag_id)

        // Add new tags
        for (const tagId of tagIdsFromRequest) {
          await prisma.blog_tags.upsert({
            where: {
              blog_id_tag_id: {
                blog_id: blog.id,
                tag_id: tagId
              }
            },
            update: {}, // No update needed
            create: {
              blog_id: blog.id,
              tag_id: tagId
            }
          })
        }

        // Remove tags that are no longer in the request
        const tagIdsToRemove = existingTagIds.filter(
          (id) => !tagIdsFromRequest.includes(id)
        )
        if (tagIdsToRemove.length > 0) {
          await prisma.blog_tags.deleteMany({
            where: {
              blog_id: blog.id,
              tag_id: { in: tagIdsToRemove }
            }
          })
        }
      }

      // Fetch the saved blog with populated categories, tags, and author
      savedBlog = await prisma.blogs.findUnique({
        where: { id: blog.id },
        include: {
          user: true,
          blog_categories: {
            include: {
              categories: true
            }
          },
          blog_tags: {
            include: {
              tags: true
            }
          }
        }
      })
    })

    const slug = Helper.generateBlogSlug(savedBlog.title)

    // Check if this slug already exists in redirect_blogs and delete it
    await prisma.redirect_blogs.deleteMany({
      where: { new_url: `blog/${slug}` }
    }).catch(() => {})

    const nextUrl = await Helper.resolveBlogUrl(prisma, slug, savedBlog.id)
    if (nextUrl !== savedBlog.url) {
      // Store the redirect from old URL to new URL if old URL exists
      if (previousUrl && previousUrl !== nextUrl) {
        await prisma.redirect_blogs.upsert({
          where: { old_url: previousUrl },
          update: { new_url: nextUrl },
          create: {
            blog_id: savedBlog.id,
            old_url: previousUrl,
            new_url: nextUrl
          }
        }).catch(() => {})
      }

      savedBlog = await prisma.blogs.update({
        where: { id: savedBlog.id },
        data: { url: nextUrl },
        include: {
          user: true,
          blog_categories: {
            include: {
              categories: true
            }
          },
          blog_tags: {
            include: {
              tags: true
            }
          }
        }
      })
    }

    await Helper.writeStaticBlogPage(savedBlog, previousUrl)
    return savedBlog
  }

  static async deleteBlog (prisma, blogId, userId) {
    const { revokeContentRewards } = require('../services/reward/rewardService')
    await prisma.$transaction(async (prisma) => {
      // First, verify the blog belongs to the user
      const blog = await prisma.blogs.findFirst({
        where: {
          id: blogId,
          author_id: userId
        }
      })
      if (!blog) {
        throw new Error('Blog not found or access denied')
      }

      await revokeContentRewards({
        mediatorId: blog.author_id,
        referenceId: blogId,
        reasonCodes: ['blog_published', 'blog_10_comments'],
        tx: prisma
      })

      // Delete related records first due to foreign key constraints
      await prisma.blog_categories.deleteMany({
        where: { blog_id: blogId }
      })
      await prisma.blog_tags.deleteMany({
        where: { blog_id: blogId }
      })
      await prisma.blog_comments.deleteMany({
        where: { blog_id: blogId }
      })

      // Delete HTML file if blog has a URL
      if (blog.url) {
        const filePath = path.join(__dirname, '..', '..', 'public', 'website', blog.url + '.html')
        await fs.promises.unlink(filePath).catch(() => {})
      }

      // Delete redirect entries for this blog
      await prisma.redirect_blogs.deleteMany({
        where: { blog_id: blogId }
      }).catch(() => {})

      // Delete the blog
      await prisma.blogs.delete({
        where: { id: blogId }
      })
    })
  }

  static async getBlogCountPerCategory (prisma) {
    return prisma.categories.findMany({
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            blog_categories: true
          }
        }
      }
    })
  }

  static async getTop3LatestBlogs (prisma, excludeBlogId) {
    const where = {
      status: 'Published',
      ...(excludeBlogId
        ? { id: { not: excludeBlogId } }
        : {})
    }
    return prisma.blogs.findMany({
      where,
      orderBy: {
        created_at: 'desc'
      },
      take: 3,
      include: {
        user: true
      }
    })
  }

  static async getBlog (prisma, blogId) {
    return prisma.blogs.findUnique({
      where: {
        id: blogId
      },
      include: {
        user: true,
        blog_categories: {
          include: {
            categories: true // Fetch category details
          }
        },
        blog_tags: {
          include: {
            tags: true // Fetch tag details
          }
        }
      }
    })
  }

  static async getAllBlogs (prisma, page, search, category, author, tag) {
    const perPage = 10
    const skip = (page - 1) * perPage
    const filters = {
      status: 'Published'
    }
    if (search) {
      filters.OR = [
        { content: { contains: search } },
        { title: { contains: search } },
        { user: { name: { contains: search } } }
      ]
    }
    if (category) {
      filters.blog_categories = {
        some: {
          category_id: category
        }
      }
    }
    if (author) {
      filters.author_id = author
    }
    if (tag) {
      filters.blog_tags = {
        some: {
          tag_id: tag
        }
      }
    }
    return prisma.blogs.findMany({
      where: filters,
      orderBy: {
        created_at: 'desc' // Sort by created_at in descending order
      },
      skip, // Skip records for pagination
      take: perPage, // Limit the number of records per page
      include: {
        user: true,
        blog_categories: {
          include: {
            categories: true // Fetch category details
          }
        },
        blog_tags: {
          include: {
            tags: true // Fetch tag details
          }
        }
      }
    })
  }

  static async getMyBlogs (prisma, authorId, page) {
    const perPage = 10
    const skip = (page - 1) * perPage
    return prisma.blogs.findMany({
      where: {
        author_id: authorId // Filter by the provided authorId
      },
      orderBy: {
        created_at: 'desc' // Sort by created_at in descending order
      },
      skip, // Skip records for pagination
      take: perPage, // Limit the number of records per page
      include: {
        blog_categories: {
          include: {
            categories: true // Fetch category details
          }
        },
        blog_tags: {
          include: {
            tags: true // Fetch tag details
          }
        }
      }
    })
  }

  static async getBlogTags (prisma) {
    return prisma.tags.findMany()
  }

  static async getBlogCategories (prisma) {
    return prisma.categories.findMany()
  }

  static async getBlogsCount (prisma, authorId) {
    return prisma.blogs.count({
      where: {
        author_id: authorId
      }
    })
  }

  static async getAllBlogsCount (prisma, search, category, author, tag) {
    const filters = {
      status: 'Published'
    }
    if (search) {
      filters.OR = [
        { content: { contains: search } },
        { title: { contains: search } },
        { user: { name: { contains: search } } }
      ]
    }
    if (category) {
      filters.blog_categories = {
        some: {
          category_id: category
        }
      }
    }
    if (author) {
      filters.author_id = author
    }
    if (tag) {
      filters.blog_tags = {
        some: {
          tag_id: tag
        }
      }
    }
    return prisma.blogs.count({
      where: filters
    })
  }

  static mergeCaseHistory (myCases, caseEvents, viewer = {}) {
    const { buildCaseProgress } = require('../services/case/caseProgressService')
    return myCases.map((caseItem) => {
      const caseProgress = buildCaseProgress(caseItem, caseEvents, viewer)
      const tracking = caseItem.case_agreement_tracking
      let agreementStatus = null
      if (tracking) {
        if (tracking.first_party_signature_datetime && tracking.second_party_signature_datetime) {
          agreementStatus = 'signed'
        } else if (tracking.first_party_signature_datetime || tracking.second_party_signature_datetime) {
          agreementStatus = 'partial_signature'
        } else {
          agreementStatus = 'pending_signature'
        }
      }
      return {
        ...caseItem,
        case_history: caseProgress.case_history,
        case_progress: caseProgress,
        agreement_status: agreementStatus
      }
    })
  }

  static async getCaseEvents (prisma) {
    return prisma.case_events.findMany({
      orderBy: {
        sequence: 'asc'
      },
      select: {
        id: true,
        status_id: true,
        sub_status_id: true,
        title: true,
        description: true,
        sequence: true
      }
    })
  }

  static async getMediatorCases (prisma, mediatorId, page, statuses = Helper.getActiveCaseStatuses()) {
    // const today = new Date()
    // const startOfToday = new Date(today.setHours(0, 0, 0, 0))
    // const endOfToday = new Date(today.setHours(23, 59, 59, 999))
    const perPage = 10

    // Calculate the number of items to skip
    const skip = (page - 1) * perPage
    return prisma.cases.findMany({
      where: {
        mediator: mediatorId,
        status: {
          in: statuses
        }
      },
      orderBy: {
        created_at: 'desc'
      },
      skip, // Skip items for pagination
      take: perPage, // Limit the number of items per page
      select: {
        id: true,
        mediator: true,
        first_party: true,
        second_party: true,
        first_party_representative: true,
        second_party_representative: true,
        created_at: true,
        caseId: true,
        case_type: true,
        description: true,
        evidence_document_url: true,
        category: true,
        case_statuses: {
          select: {
            id: true,
            name: true
          }
        },
        case_sub_statuses: {
          select: {
            id: true,
            name: true
          }
        },
        user_cases_first_partyTouser: {
          select: {
            id: true,
            name: true,
            email: true,
            phone_number: true,
            city: true,
            state: true
          }
        },
        user_cases_second_partyTouser: {
          select: {
            id: true,
            name: true,
            email: true,
            phone_number: true,
            city: true,
            state: true
          }
        },
        user_cases_mediatorTouser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        // Mediator (neutral facilitator) may see representative name + email.
        user_cases_first_party_repTouser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        user_cases_second_party_repTouser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        events: {
          orderBy: {
            start_datetime: 'desc'
          },
          select: {
            id: true,
            title: true,
            description: true,
            start_datetime: true,
            end_datetime: true,
            type: true,
            meeting_link: true,
            meeting_summary: true,
            mediator_next_steps: true,
            first_party_next_steps: true,
            second_party_next_steps: true,
            first_party_rating: true,
            second_party_rating: true,
            mediator_feedback_at: true,
            first_party_feedback_at: true,
            second_party_feedback_at: true
          }
        },
        case_history: {
          orderBy: {
            created_at: 'desc'
          },
          select: {
            id: true,
            case_event_id: true,
            created_at: true
          }
        },
        transactions: {
          orderBy: { transaction_date: 'desc' },
          select: {
            transaction_id: true,
            amount: true,
            currency: true,
            success: true,
            reason: true,
            transaction_date: true,
            payment_method: true
          }
        },
        case_agreement_tracking: {
          select: {
            id: true,
            first_party_signature_datetime: true,
            second_party_signature_datetime: true,
            created_at: true,
            updated_at: true
          }
        }
      }
    })
  }

  static async addLanguagesToDatabase (languageKeys, prisma) {
    try {
      // Path to languages.json
      const filePath = path.join(__dirname, '..', '..', 'public', 'website', 'languages.json')

      // Read and parse the JSON file
      const languagesJson = JSON.parse(fs.readFileSync(filePath, 'utf8'))

      // Prepare the data for database insertion
      const languagesToInsert = languageKeys.map((key) => {
        if (languagesJson.languages[key]) {
          return {
            id: key,
            language: languagesJson.languages[key]
          }
        } else {
          console.warn(`Language key '${key}' not found in JSON.`)
          return null
        }
      }).filter(Boolean) // Remove nulls for missing keys

      // Insert the data into the database
      await prisma.available_languages.createMany({
        data: languagesToInsert,
        skipDuplicates: true // Prevent errors for existing keys
      })
    } catch (error) {
      console.error('Error adding languages to database:', error)
    } finally {
      await prisma.$disconnect()
    }
  };

  static async deployToS3Bucket (base64Content, fileName) {
    const { uploadToS3 } = require('./uploadService')
    return uploadToS3(base64Content, fileName)
  }

  static async getUsers (isActive, prisma, page, type, relationField, includeInactive = false, includeDeleted = false) {
    const perPage = 10

    // Calculate the number of items to skip
    const skip = (page - 1) * perPage

    const activeCondition = includeInactive ? {} : { active: isActive }
    const deletedCondition = includeDeleted ? {} : { is_deleted: false }

    let [inactiveUsers, totalInactiveUsers] = await prisma.$transaction([
      prisma.user.findMany({
        where: {
          AND: [
            activeCondition,
            deletedCondition,
            { is_self_signed_up: true },
            { user_type: type }
          ]
        },
        orderBy: {
          created_at: 'desc'
        },
        skip, // Skip items for pagination
        take: perPage, // Limit the number of items per page
        select: {
          id: true,
          name: true,
          email: true,
          phone_number: true,
          created_at: true,
          updated_at: true,
          user_type: true,
          active: true,
          is_deleted: true,
          city: true,
          state: true,
          pincode: true,
          is_self_signed_up: true,
          llb_college: true,
          llb_university: true,
          llb_year: true,
          mediator_course_year: true,
          mcpc_certificate_url: true,
          preferred_area_of_practice: true,
          llb_certificate_url: true,
          profile_picture_url: true,
          selected_hearing_types: true,
          bar_enrollment_no: true,
          preferred_languages: true,
          [relationField]: {
            select: {
              id: true,
              caseId: true,
              evidence_document_url: true,
              description: true,
              category: true,
              user_cases_second_partyTouser: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  phone_number: true
                }
              },
              user_cases_first_partyTouser: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  phone_number: true
                }
              },
              user_cases_first_party_repTouser: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  phone_number: true,
                  active: true
                }
              },
              user_cases_second_party_repTouser: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  phone_number: true,
                  active: true
                }
              }
            }
          }
        }
      }),
      prisma.user.count({
        where: {
          AND: [
            activeCondition,
            deletedCondition,
            { is_self_signed_up: true },
            { user_type: type }
          ]
        }
      })
    ])

    inactiveUsers = inactiveUsers.map(user => {
      const caseData = user[relationField] || []
      const userId = user.id
      const flatUser = {
        ...user,
        userId,
        cases: caseData.map(caseItem => {
          const flattenedCase = { ...caseItem }
          if (caseItem.user_cases_first_partyTouser) {
            flattenedCase.firstParty = caseItem.user_cases_first_partyTouser
          }

          if (caseItem.user_cases_second_partyTouser) {
            flattenedCase.secondParty = caseItem.user_cases_second_partyTouser
          }

          if (caseItem.user_cases_first_party_repTouser) {
            flattenedCase.firstPartyRep = caseItem.user_cases_first_party_repTouser
          }

          if (caseItem.user_cases_second_party_repTouser) {
            flattenedCase.secondPartyRep = caseItem.user_cases_second_party_repTouser
          }

          // Remove unnecessary nested properties
          delete flattenedCase.user_cases_second_partyTouser
          delete flattenedCase.user_cases_first_partyTouser
          delete flattenedCase.user_cases_first_party_repTouser
          delete flattenedCase.user_cases_second_party_repTouser
          return flattenedCase
        })
      }

      delete flatUser[relationField]
      delete flatUser.id
      return flatUser
    })

    // Send the response back to the client
    return {
      users: inactiveUsers,
      total: totalInactiveUsers,
      page,
      perPage
    }
  }

  static async getGoogleToken (prisma) {
    const record = await prisma.google_connect.findFirst()
    if (record) {
      // decrypt() passes through legacy plaintext rows unchanged.
      return JSON.parse(dataCrypto.decrypt(record.google_auth_token))
    }
    return null
  }

  static async scheduleMeeting (title, description, startDateTime, attendees) {
    try {
      const clientId = process.env.ZOOM_CLIENT_ID
      const clientSecret = process.env.ZOOM_CLIENT_SECRET
      const accountId = process.env.ZOOM_ACCOUNT_ID
      const tokenUrl = `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${accountId}`
      const response = await axios.post(
        tokenUrl, '',
        { headers: { 'Authorization': `Basic ${Buffer.from(clientId + ':' + clientSecret).toString('base64')}`, 'Content-Type': 'application/x-www-form-urlencoded' } }
      )
      const accessToken = response.data.access_token
      const meetingData = {
        topic: title,
        type: 2,
        start_time: startDateTime,
        duration: 30,
        timezone: 'UTC',
        contact_email: 'no-reply@kadr.live',
        meeting_invitees: attendees,
        attendees,
        agenda: description,
        settings: {
          host_video: true,
          participant_video: true,
          audio: 'voip',
          auto_recording: 'none',
          alternative_hosts: '',
          send_notification: true
        }
      }
      const response1 = await axios.post(
        'https://api.zoom.us/v2/users/me/meetings',
        meetingData,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        })
      const meetingLink = response1.data.join_url
      return {
        meetingLink,
        meetingId: response1.data.id
      }
    } catch (error) {
      console.error('Error getting access token:', error.response?.data || error.message)
      return {}
    }
  }

  static async getGoogleAccessToken (prisma, code) {
    try {
      const { tokens } = await oauth2Client.getToken(code)
      const record = await prisma.google_connect.findFirst()
      if (record) {
        await prisma.google_connect.update({
          where: { id: record.id },
          data: {
            google_auth_token: dataCrypto.encrypt(JSON.stringify(tokens))
          }
        })
      }
      return true
    } catch (e) {
      console.error('Error retrieving access token', e)
      return false
    }
  }

  static async generateGoogleAuthUrl (userId) {
    const scopes = [
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/calendar'
    ]

    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent',
      state: userId
    })
    return url
  }

  static isAccessTokenExpired (googleToken) {
    return Date.now() >= googleToken.expiry_date
  }

  static async getValidAccessToken (prisma, googleToken) {
    oauth2Client.setCredentials({
      access_token: googleToken.access_token,
      refresh_token: googleToken.refresh_token,
      expiry_date: googleToken.expiry_date
    })

    // Auto-refresh if expired
    if (this.isAccessTokenExpired(googleToken)) {
      const tokens = await oauth2Client.refreshAccessToken()
      const newTokens = tokens.credentials

      // Update user record in DB
      await prisma.user.updateMany({
        where: {
          OR: [
            { user_type: 'MEDIATOR' },
            { user_type: 'MC' }
          ]
        },
        data: {
          google_token: JSON.stringify(tokens)
        }
      })

      oauth2Client.setCredentials(newTokens)
    }

    return oauth2Client
  }

  static async createGoogleEvent (title, description, startDateTime, endDateTime, attendees, requestId, oauth2Client) {
    try {
      const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

      // Create Google Calendar event
      const event = {
        summary: title,
        description,
        start: { dateTime: startDateTime },
        end: { dateTime: endDateTime },
        attendees,
        conferenceData: {
          createRequest: {
            requestId,
            conferenceSolutionKey: { type: 'hangoutsMeet' }
          }
        },
        guestsCanInviteOthers: true,
        guestsCanModify: false,
        guestsCanSeeOtherGuests: true,
        anyoneCanAddSelf: true
      }

      const response = await calendar.events.insert({
        calendarId: 'primary',
        resource: event,
        conferenceDataVersion: 1
      })

      return response
    } catch (error) {
      console.error('Error creating Google event:', error)
      throw error
    }
  }

  static async hashPassword (password) {
    const saltRounds = 10 // You can adjust the number of salt rounds for more security
    const hashedPassword = await bcrypt.hash(password, saltRounds)
    return hashedPassword
  }

  static async comparePassword (enteredPassword, storedHash) {
    const isMatch = await bcrypt.compare(enteredPassword, storedHash)
    return isMatch
  }

  static verifyToken (token) {
    return new Promise((resolve, reject) => {
      jwt.verify(token, process.env.SECRET_KEY, (err, user) => {
        if (err) {
          reject(err)
        } else {
          resolve(user) // Resolving with the decoded user object
        }
      })
    })
  }

  static async checkTokenAndFetch (req, res) {
    let token = req.headers.authorization
    if (!token && req.headers.cookie) {
      const m = String(req.headers.cookie).match(/(?:^|;\s*)accessToken=([^;]+)/)
      if (m) {
        try {
          token = 'Bearer ' + decodeURIComponent(m[1].trim())
        } catch (e) {
          token = 'Bearer ' + m[1].trim()
        }
      }
    }

    if (!token) {
      return { status: 401, message: errorCodes.NO_TOKEN_PROVIDED }
    }

    const tokenWithoutBearer = token.startsWith('Bearer ') ? token.slice(7, token.length) : token

    try {
      const tokenUser = await this.verifyToken(tokenWithoutBearer)
      const prisma = require('../lib/prisma.js')
      const dbUser = await prisma.user.findUnique({
        where: { id: tokenUser.id },
        select: {
          id: true,
          email: true,
          name: true,
          user_type: true,
          active: true,
          is_deleted: true
        }
      })
      if (!dbUser || dbUser.is_deleted === true) {
        return { status: 401, message: errorCodes.USER_ACCOUNT_DELETED }
      }
      if (dbUser.active === false) {
        return { status: 401, message: errorCodes.USER_NOT_ACTIVE }
      }
      req.user = {
        id: dbUser.id,
        email: dbUser.email,
        name: dbUser.name,
        type: dbUser.user_type
      }
      return null
    } catch (err) {
      return { status: 401, message: errorCodes.TOKEN_EXPIRED }
    }
  }

  static verifySignature (data, signature) {
    // Create a new signature based on the data and compare it with the received signature
    const newSignature = this.signResponseData(data)
    return newSignature === signature
  }

  static signResponseData (data) {
    // Convert the data to a string, then hash it with the secret key
    const dataString = JSON.stringify(data)
    const signature = crypto.createHmac('sha256', process.env.SIGN_SECRET_KEY)
      .update(dataString)
      .digest('hex')
    return signature
  }

  static generateAccessToken (user) {
    return jwt.sign({ id: user.id, email: user.email, type: user.user_type ? user.user_type : user.type, name: user.name }, process.env.SECRET_KEY, { expiresIn: '1d' })
  }

  static generateRefreshToken (user) {
    return jwt.sign({ id: user.id, email: user.email, type: user.user_type ? user.user_type : user.type, name: user.name }, process.env.REFRESH_SECRET_KEY, { expiresIn: '7d' })
  }

  static generateMobileRefreshToken (user) {
    return jwt.sign({ id: user.id, email: user.email, type: user.user_type ? user.user_type : user.type, name: user.name }, process.env.REFRESH_SECRET_KEY, { expiresIn: '30d' })
  }

  /**
   * Deliver a one-time password over WhatsApp using the approved authentication
   * template configured on the WhatsApp channel (config.otpTemplateName /
   * otpTemplateLanguage). The OTP is passed as the single body parameter and,
   * for authentication templates, as the copy-code button parameter.
   *
   * Throws on failure so callers can surface an accurate error to the user
   * (the previous SMS helper swallowed errors, which hid non-delivery).
   * @param {string} otp
   * @param {string} toNumber recipient phone number
   */
  static async sendOtpWhatsApp (otp, toNumber) {
    const notificationService = require('../services/notification/notificationService')
    const { getChannelSettings } = require('../services/notification/channelConfig')
    const settings = await getChannelSettings('WHATSAPP')
    const cfg = settings.config || {}
    const name = cfg.otpTemplateName || 'kadr_otp'
    const languageCode = cfg.otpTemplateLanguage || 'en_US'

    return notificationService.sendWhatsAppTemplate({
      to: toNumber,
      name,
      languageCode,
      bodyParams: [String(otp)],
      // Authentication templates deliver the code through a copy-code button.
      button: { type: 'copy_code', index: 0, params: [String(otp)] },
      source: 'otp'
    })
  }

  static async createEmail (customerName, content) {
    const { renderEmailLayout } = require('../services/email/emailLayoutRenderer')
    const { getEmailLayout } = require('../services/notification/emailLayoutService')
    const { headerHtml, footerHtml } = await getEmailLayout()
    return renderEmailLayout({
      greeting: customerName ? `Hi ${customerName},` : 'Hello,',
      bodyHtml: content || '',
      headerHtml,
      footerHtml
    })
  }

  static toICSDate (date) {
    return new Date(date)
      .toISOString()
      .replace(/[-:]/g, '')
      .split('.')[0] + 'Z'
  }

  static generateGoogleCalendarLink ({
    title,
    description,
    start,
    end,
    link,
    caseNumber
  }) {
    const format = (d) =>
      new Date(d).toISOString().replace(/[-:]|\.\d{3}/g, '')

    const dates = `${format(start)}/${format(end)}`

    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${dates}&details=${encodeURIComponent(`${description}\nCase: ${caseNumber}\nJoin: ${link}`)}&location=${encodeURIComponent('Online Meeting')}&location=${encodeURIComponent('Online Meeting')}`
  }

  static async sendEmail (customerName, emailId, subject = 'Mail from Kadr.live', content, attachments = []) {
    try {
      const info = await EmailService.sendTemplate({
        templateName: 'legacyCustomContent',
        to: emailId,
        variables: {
          recipientName: customerName,
          content,
          subject
        },
        attachments
      })
      console.log('Email sent to : ' + emailId)

      // Send a response to the client
      return { message: 'Email sent successfully', info }
    } catch (error) {
      console.error('Error sending email:', error)
      return { message: 'Failed to send email', error }
    }
  }

  static portalMessageCenterUrl ({ caseId, channel, leadId } = {}) {
    const origin = String(process.env.PORTAL_APP_URL || process.env.BASE_URL || '').replace(/\/$/, '')
    if (!origin) return ''
    const qs = new URLSearchParams()
    if (caseId && channel) {
      qs.set('caseId', caseId)
      qs.set('channel', channel)
    } else if (leadId) {
      qs.set('lead', leadId)
    }
    const q = qs.toString()
    return `${origin}/admin/app/messages${q ? `?${q}` : ''}`
  }

  /** Logged-in user general support screen (mediator/client). */
  static portalSupportUrl ({ threadId } = {}) {
    const origin = String(process.env.PORTAL_APP_URL || process.env.BASE_URL || '').replace(/\/$/, '')
    if (!origin) return ''
    const qs = new URLSearchParams()
    if (threadId) qs.set('thread', String(threadId))
    const q = qs.toString()
    return `${origin}/admin/app/support${q ? `?${q}` : ''}`
  }

  static async sendTemplatedEmail (templateName, to, variables = {}, attachments = []) {
    const notificationService = require('../services/notification/notificationService')
    return notificationService.send({
      templateKey: templateName,
      channel: 'EMAIL',
      to,
      data: variables,
      attachments
    })
  }

  /**
   * Central notification API for all channels (email, SMS, WhatsApp, push).
   * @see services/notification/notificationService.js
   */
  static async sendNotification ({ templateKey, channel, userId, to, data, attachments }) {
    const notificationService = require('../services/notification/notificationService')
    return notificationService.send({ templateKey, channel, userId, to, data, attachments })
  }

  static async sendNotificationBulk (payload) {
    const notificationService = require('../services/notification/notificationService')
    return notificationService.sendBulk(payload)
  }

  static async evaluateNotificationRules (payload) {
    const triggerRuleEngine = require('../services/notification/triggerRuleEngine')
    return triggerRuleEngine.evaluateContext(payload)
  }

  /** Pass extra template vars for the next Prisma write(s) (e.g. generated password). */
  static runWithNotificationContext (context, fn) {
    const { runWithNotificationContext } = require('../services/notification/notificationContext')
    return runWithNotificationContext(context, fn)
  }

  static registerNotificationTableTrigger (tableName, handler) {
    const { codeTriggerRegistry } = require('../services/notification/triggerRuleEngine')
    return codeTriggerRegistry.registerTableTrigger(tableName, handler)
  }

  static registerNotificationRuleTrigger (ruleKey, handler) {
    const { codeTriggerRegistry } = require('../services/notification/triggerRuleEngine')
    return codeTriggerRegistry.registerRuleTrigger(ruleKey, handler)
  }

  static async createSignatureTrackingRecord (prisma, userId, caseId, caseAgreementId) {
    try {
      const signatureExpiry = new Date()
      signatureExpiry.setHours(signatureExpiry.getHours() + 24) // Set expiry to 24 hours from now

      const record = await prisma.signature_tracking.create({
        data: {
          user_id: userId,
          case_id: caseId,
          signed: false,
          case_agreement_id: caseAgreementId,
          signature_expiry: signatureExpiry
        }
      })

      return record
    } catch (error) {
      console.error('Error creating signature tracking record:', error)
      throw error
    }
  }

  static renderSignature (signature, altText) {
    if (signature?.startsWith('data:')) {
      return `<img src="${signature}" alt="${altText}" />`
    } else {
      return `<div style="margin-top:40px;border-bottom:1px solid #000;display:inline-block;padding:4px 20px">${signature}</div>`
    }
  }

  static formatMeetingRangeIST (startDatetime, endDatetime, timeZone) {
    const { formatMeetingRange } = require('./datetime')
    return formatMeetingRange(startDatetime, endDatetime, timeZone)
  }

  static formatDateTimeToIST (datetime, timeZone) {
    const { formatDateTime } = require('./datetime')
    return formatDateTime(datetime, timeZone)
  }

  static generateICS ({
    uid,
    title,
    description,
    start,
    end,
    link,
    caseNumber
  }) {
    return [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Kadr.live//Meeting Invite//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:REQUEST',

      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${this.toICSDate(new Date())}`,
      `DTSTART:${this.toICSDate(start)}`,
      `DTEND:${this.toICSDate(end)}`,
      `SUMMARY:${title}`,
      `DESCRIPTION:${description}\\nCase Number: ${caseNumber}\\nJoin: ${link}`,
      'LOCATION:Online Meeting',
      'STATUS:CONFIRMED',
      'SEQUENCE:0',
      'END:VEVENT',

      'END:VCALENDAR'
    ].join('\r\n')
  }

  static generateMediationHTML (data) {
    const {
      caseId,
      mediationCompletionDate,
      firstPartyName,
      secondPartyName,
      mediatorName,
      mutualAgreement,
      firstPartySignatureImage,
      secondPartySignatureImage,
      firstPartySignatureDateTime,
      secondPartySignatureDateTime,
      mediatorSignatureImage,
      judgeName
    } = data

    // Format mediationCompletionDate as DD.MM.YYYY
    let formattedCompletionDate = ''
    if (mediationCompletionDate) {
      const d = new Date(mediationCompletionDate)
      const day = String(d.getDate()).padStart(2, '0')
      const month = String(d.getMonth() + 1).padStart(2, '0')
      const year = d.getFullYear()
      formattedCompletionDate = `${day}.${month}.${year}`
    }

    const formattedFirstSignatureDateTime = this.formatDateTimeToIST(firstPartySignatureDateTime)
    const formattedSecondSignatureDateTime = this.formatDateTimeToIST(secondPartySignatureDateTime)

    return `
    <html>
       <head>
       <title> Mediaton ${firstPartyName} vs ${secondPartyName}</title> 
        <style>
          body {
            padding: 20px;
          }
  
          hr {
            margin: 20px 0;
            border: none;
            border-top: 2px solid #aaa;
          }
  
          .signature-block {
            margin-top: 30px;
          }
  
          .signature-row {
            display: flex;
            justify-content: space-between;
            margin-top: 20px;
          }
  
          .signature-col {
            width: 50%;
            text-align: center;
          }
  
          .signature-col img {
            max-width: 100%;
            height: auto;
            border-bottom: 1px solid #000;
          }
        </style>
      </head>
      <body>
        <div>
          <h3 style="text-align:center;width:100%;text-decoration:underline">IN THE DELHI MEDIATION CENTRE, ROHINI DISTRICT COURTS, DELHI</h3>

          <p style="text-decoration:underline"><strong>In the matter of:</p>
          <p><strong>Ct. Cases No.:</strong> ${caseId} </p>
          <p><strong>Case Title:</strong> ${firstPartyName} Vs. ${secondPartyName}</p>
          <p style="text-decoration:underline"><strong>Complaint Case:</strong> U/s. 138 N.I. Act</p>
          <p  style="text-decoration:underline><strong>Case received from the Court of:</strong></p>
          <p> ${judgeName}, North District, Rohini Courts, Delhi</p>

          <h3 style="text-align:center;text-decoration:underline;width:100%">Settlement / Agreement</h3>

          ${formattedCompletionDate}
          <p><strong>Present:</strong></p>
          <ul>
            <li>${firstPartyName}</li>
            <li>${secondPartyName}</li>
          </ul>

          <p>The present case has been received from the court of ${judgeName}, North District, Rohini Courts, Delhi and assigned to me for mediation.</p>

          ${mutualAgreement}

          <p>The parties have entered into the present scttlement/agreement without any prcssure, coercion, fear or undue influence from any side. Thepartics shall remain bound by the terms of present settlement, and that the parties shall co-operate for performance of the same.</p>

          <div class="section signature-block">
            <div class="signature-row">
              <div class="signature-col">
                <p><strong>${firstPartyName}</strong></p>
                ${this.renderSignature(firstPartySignatureImage, 'First Party Signature')}
                <p>${formattedFirstSignatureDateTime}</p>
              </div>
              <div class="signature-col">
                <p><strong>${secondPartyName}</strong></p>
                ${this.renderSignature(secondPartySignatureImage, 'Second Party Signature')}
                <p>${formattedSecondSignatureDateTime}</p>
              </div>
              </div>
          </div>
          <div class="section signature-block">
            <div class="signature-row">
              <div class="signature-col">
                <p><strong>${mediatorName}</strong></p>
                ${this.renderSignature(mediatorSignatureImage, 'Mediator Signature')}
              </div>
              <div class="signature-col">
              </div>
            </div>
          </div>

          <p>The contents of the settlement have been explained to the parties in Hindi and they have understood the same and have admitted the same to be correct. The setlement proceedings be sent to the Ld. Referral Court.</p>
        </div>
      </body>
    </html>
    `
  }

  static adminActiveCaseStatusesFilter () {
    return {
      OR: [
        { status: CaseTypes.NEW },
        { status: CaseTypes.IN_PROGRESS }
      ]
    }
  }

  static buildAdminCasesWhere (filters) {
    const { mediatorId, firstPartyId, secondPartyId, status } = filters || {}
    const and = []
    if (mediatorId === '__unassigned__') {
      and.push({ mediator: null })
    } else if (mediatorId) {
      and.push({ mediator: mediatorId })
    }
    if (firstPartyId) and.push({ first_party: firstPartyId })
    if (secondPartyId) and.push({ second_party: secondPartyId })
    if (status) and.push({ status })
    return { AND: and }
  }

  static getAdminCaseCardSelect () {
    return {
      id: true,
      caseId: true,
      description: true,
      category: true,
      case_type: true,
      evidence_document_url: true,
      created_at: true,
      updated_at: true,
      status: true,
      sub_status: true,
      mediator_commission: true,
      mediator: true,
      first_party: true,
      second_party: true,
      first_party_representative: true,
      second_party_representative: true,
      case_statuses: {
        select: { id: true, name: true }
      },
      case_sub_statuses: {
        select: { id: true, name: true }
      },
      user_cases_first_partyTouser: {
        select: {
          id: true,
          name: true,
          email: true,
          phone_number: true,
          city: true,
          state: true
        }
      },
      user_cases_second_partyTouser: {
        select: {
          id: true,
          name: true,
          email: true,
          phone_number: true,
          city: true,
          state: true
        }
      },
      user_cases_mediatorTouser: {
        select: {
          id: true,
          name: true,
          email: true,
          phone_number: true,
          city: true,
          state: true,
          profile_picture_url: true,
          preferred_languages: true,
          preferred_area_of_practice: true
        }
      },
      // Admin case management: full representative detail (name/email/phone/status).
      user_cases_first_party_repTouser: {
        select: {
          id: true,
          name: true,
          email: true,
          phone_number: true,
          active: true
        }
      },
      user_cases_second_party_repTouser: {
        select: {
          id: true,
          name: true,
          email: true,
          phone_number: true,
          active: true
        }
      },
      events: {
        orderBy: { start_datetime: 'desc' },
        select: {
          id: true,
          title: true,
          description: true,
          start_datetime: true,
          end_datetime: true,
          type: true,
          meeting_link: true,
          google_calendar_link: true,
          meeting_summary: true,
          mediator_next_steps: true,
          first_party_next_steps: true,
          second_party_next_steps: true,
          first_party_rating: true,
          second_party_rating: true,
          mediator_feedback_at: true,
          first_party_feedback_at: true,
          second_party_feedback_at: true
        }
      },
      case_history: {
        orderBy: { created_at: 'asc' },
        select: {
          id: true,
          case_event_id: true,
          created_at: true,
          case_events: {
            select: { title: true, description: true, sequence: true }
          }
        }
      },
      case_agreement: true,
      case_agreement_tracking: {
        select: {
          id: true,
          agreed_terms: true,
          mediation_agreement_link: true,
          created_at: true,
          updated_at: true,
          first_party_signature_datetime: true,
          second_party_signature_datetime: true
        }
      },
      transactions: {
        orderBy: { transaction_date: 'desc' },
        select: {
          transaction_id: true,
          amount: true,
          currency: true,
          success: true,
          reason: true,
          reference_id: true,
          transaction_date: true,
          payment_method: true
        }
      }
    }
  }

  static async getAdminActiveCasesCount (prisma, filters) {
    const where = this.buildAdminCasesWhere(filters)
    return prisma.cases.count({ where })
  }

  static async getAdminActiveCases (prisma, page, filters) {
    const perPage = 10
    const skip = (page - 1) * perPage
    const where = this.buildAdminCasesWhere(filters)
    return prisma.cases.findMany({
      where,
      orderBy: { created_at: 'desc' },
      skip,
      take: perPage,
      select: this.getAdminCaseCardSelect()
    })
  }

  static async getAdminCaseFilterMeta (prisma) {
    const active = this.adminActiveCaseStatusesFilter()
    const [mediators, firstParties, secondParties, statuses] = await Promise.all([
      prisma.user.findMany({
        where: { user_type: 'MEDIATOR', active: true, is_deleted: false },
        select: {
          id: true,
          name: true,
          email: true,
          phone_number: true,
          city: true,
          state: true,
          profile_picture_url: true,
          preferred_languages: true,
          preferred_area_of_practice: true
        },
        orderBy: { name: 'asc' }
      }),
      prisma.user.findMany({
        where: {
          cases_cases_first_partyTouser: { some: active }
        },
        select: { id: true, name: true, email: true },
        orderBy: { name: 'asc' }
      }),
      prisma.user.findMany({
        where: {
          cases_cases_second_partyTouser: { some: active }
        },
        select: { id: true, name: true, email: true },
        orderBy: { name: 'asc' }
      }),
      prisma.case_statuses.findMany({
        select: { id: true, name: true },
        orderBy: { name: 'asc' }
      })
    ])
    return { mediators, firstParties, secondParties, statuses }
  }
}

module.exports = Helper
