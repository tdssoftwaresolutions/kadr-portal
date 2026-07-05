const prisma = require('../lib/prisma')
const { v4: uuidv4 } = require('uuid')
const helper = require('../utils/helper')
const errorCodes = require('../utils/errors/errorCodes')
const { createError } = require('../utils/errors')
const { success } = require('../utils/responses')
const { assertAdminPage, adminHasPage } = require('../utils/adminPermissionHelpers')
const inboxReadState = require('../utils/adminInboxReadState')

const MAX_TITLE = 500
const MAX_BODY = 8000
const MAX_PHONE = 40
const MAX_VISITOR_NAME = 255

const SUPPORT_TOPICS = new Set(['GENERAL', 'PORTAL', 'TECHNICAL', 'CASE_RELATED'])

function supportTopicLabel (code) {
  const c = String(code || '').toUpperCase()
  const map = {
    GENERAL: 'General',
    PORTAL: 'Portal / account',
    TECHNICAL: 'Technical',
    CASE_RELATED: 'Case-related (general)'
  }
  return map[c] || c || 'General'
}

async function getMessageHubNotifyRecipients () {
  const rows = await prisma.user.findMany({
    where: { user_type: 'ADMIN', active: true, is_deleted: false },
    select: { id: true, email: true, name: true, master: true, admin_permissions: true, user_type: true }
  })
  return rows
    .filter((r) => r.email && String(r.email).trim())
    .filter((row) => adminHasPage(row, 'messages'))
}

function truncate (s, max) {
  const t = String(s || '')
  if (t.length <= max) return t
  return `${t.slice(0, max - 1)}…`
}

function normalizeLeadBody (raw) {
  return String(raw || '').replace(/\r\n/g, '\n').trim()
}

function assertWebsiteContactApiKey (req) {
  const expected = process.env.WEBSITE_CONTACT_API_KEY
  if (!expected) return
  const got = req.get('x-website-contact-key') || req.body?.apiKey
  if (got !== expected) throw createError(errorCodes.FORBIDDEN)
}

function assertClientOrMediator (req) {
  const t = req.user.type
  if (t !== 'CLIENT' && t !== 'MEDIATOR') throw createError(errorCodes.FORBIDDEN)
}

function scheduleNotifyAdminsNewLead ({ thread, preview }) {
  setImmediate(async () => {
    try {
      const admins = await getMessageHubNotifyRecipients()
      const openUrl = helper.portalMessageCenterUrl({ leadId: thread.id })
      for (const a of admins) {
        if (!a.email) continue
        try {
          await helper.sendTemplatedEmail(
            'websiteContactNewLeadAdmin',
            a.email,
            {
              recipientName: a.name || '',
              leadTitle: thread.title,
              leadEmail: thread.email,
              leadVisitorName: thread.visitor_name || '',
              leadPhone: thread.phone || '',
              messagePreview: preview,
              openInboxUrl: openUrl
            }
          )
        } catch (e) {
          console.error('websiteContact: notify admin failed', a.email, e.message)
        }
      }
    } catch (e) {
      console.error('websiteContact: notify loop failed', e.message)
    }
  })
}

function scheduleNotifyAdminsPortalUserMessage ({ thread, preview }) {
  setImmediate(async () => {
    try {
      const admins = await getMessageHubNotifyRecipients()
      const openUrl = helper.portalMessageCenterUrl({ leadId: thread.id })
      const participant = thread.portal_display_name || thread.email
      for (const a of admins) {
        if (!a.email) continue
        try {
          await helper.sendTemplatedEmail(
            'websiteContactPortalMessageAdmin',
            a.email,
            {
              participantName: participant,
              topicLabel: supportTopicLabel(thread.support_topic),
              threadTitle: thread.title,
              messagePreview: preview,
              openInboxUrl: openUrl
            }
          )
        } catch (e) {
          console.error('websiteContact: portal notify admin failed', a.email, e.message)
        }
      }
    } catch (e) {
      console.error('websiteContact: portal notify loop failed', e.message)
    }
  })
}

module.exports = {
  /** Public: POST from marketing site — optional WEBSITE_CONTACT_API_KEY + header x-website-contact-key */
  submitPublicLead: async function (req, res, next) {
    try {
      assertWebsiteContactApiKey(req)
      const { email, title, description, phone, name } = req.body || {}
      const em = String(email || '').trim().toLowerCase()
      const ti = String(title || '').trim()
      const body = normalizeLeadBody(description)
      const ph = phone != null ? String(phone).trim().slice(0, MAX_PHONE) : null
      const visitorNameRaw = name != null ? String(name).trim().slice(0, MAX_VISITOR_NAME) : ''
      if (!em || !ti || !body) throw createError(errorCodes.MISSING_FIELD)
      if (ti.length > MAX_TITLE || body.length > MAX_BODY) throw createError(errorCodes.INVALID_REQUEST)

      const threadId = uuidv4()
      const msgId = uuidv4()
      const titleStored = ti.slice(0, MAX_TITLE)
      await prisma.$transaction([
        prisma.website_contact_threads.create({
          data: {
            id: threadId,
            email: em,
            phone: ph || null,
            title: titleStored,
            visitor_name: visitorNameRaw || null,
            thread_origin: 'WEBSITE',
            status: 'OPEN'
          }
        }),
        prisma.website_contact_messages.create({
          data: {
            id: msgId,
            thread_id: threadId,
            author_type: 'VISITOR',
            body
          }
        })
      ])

      scheduleNotifyAdminsNewLead({
        thread: {
          id: threadId,
          title: titleStored,
          email: em,
          phone: ph,
          visitor_name: visitorNameRaw || null
        },
        preview: truncate(body.replace(/\s+/g, ' '), 900)
      })

      success(res, { threadId, received: true }, 'Thank you — we received your message.', 201)
    } catch (err) {
      next(err)
    }
  },

  /** Client / mediator: list their portal support threads */
  listPortalSupportThreads: async function (req, res, next) {
    try {
      assertClientOrMediator(req)
      const threads = await prisma.website_contact_threads.findMany({
        where: { thread_origin: 'PORTAL', portal_user_id: req.user.id },
        orderBy: { updated_at: 'desc' },
        take: 50,
        include: {
          messages: {
            orderBy: { created_at: 'desc' },
            take: 1,
            select: { body: true, created_at: true, author_type: true }
          }
        }
      })
      const out = threads.map((t) => {
        const last = t.messages[0]
        return {
          thread_id: t.id,
          title: t.title,
          support_topic: t.support_topic,
          status: t.status,
          last_message_at: last?.created_at || t.updated_at,
          last_preview: last ? truncate(String(last.body).replace(/\s+/g, ' '), 160) : ''
        }
      })
      success(res, { threads: out })
    } catch (err) {
      next(err)
    }
  },

  /** Client / mediator: full thread + messages (portal only, own threads) */
  getPortalSupportThread: async function (req, res, next) {
    try {
      assertClientOrMediator(req)
      const threadId = req.params.id
      const thread = await prisma.website_contact_threads.findFirst({
        where: { id: threadId, thread_origin: 'PORTAL', portal_user_id: req.user.id },
        include: {
          messages: {
            orderBy: { created_at: 'asc' },
            include: {
              admin: { select: { id: true, name: true, email: true } }
            }
          }
        }
      })
      if (!thread) throw createError(errorCodes.NOT_FOUND)
      const messages = thread.messages.map((m) => ({
        id: m.id,
        author_type: m.author_type,
        body: m.body,
        created_at: m.created_at,
        admin: m.admin ? { id: m.admin.id, name: m.admin.name } : null
      }))
      success(res, {
        thread: {
          id: thread.id,
          title: thread.title,
          support_topic: thread.support_topic,
          status: thread.status,
          created_at: thread.created_at
        },
        messages
      })
    } catch (err) {
      next(err)
    }
  },

  /** Client / mediator: start a new portal support thread with first message */
  createPortalSupportThread: async function (req, res, next) {
    try {
      assertClientOrMediator(req)
      const topic = String((req.body || {}).topic || '').trim().toUpperCase()
      const body = normalizeLeadBody((req.body || {}).body)
      if (!body) throw createError(errorCodes.MISSING_FIELD)
      if (!SUPPORT_TOPICS.has(topic)) throw createError(errorCodes.INVALID_REQUEST)
      if (body.length > MAX_BODY) throw createError(errorCodes.INVALID_REQUEST)

      const u = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { email: true, name: true, phone_number: true }
      })
      if (!u || !u.email) throw createError(errorCodes.INVALID_REQUEST)

      const threadId = uuidv4()
      const msgId = uuidv4()
      const displayName = (u.name && String(u.name).trim()) || u.email.split('@')[0]
      const titleBase = `[Portal · ${supportTopicLabel(topic)}] ${displayName}`
      const titleStored = titleBase.slice(0, MAX_TITLE)

      await prisma.$transaction([
        prisma.website_contact_threads.create({
          data: {
            id: threadId,
            email: String(u.email).trim().toLowerCase(),
            phone: u.phone_number ? String(u.phone_number).trim().slice(0, MAX_PHONE) : null,
            title: titleStored,
            visitor_name: u.name || null,
            thread_origin: 'PORTAL',
            portal_user_id: req.user.id,
            support_topic: topic,
            status: 'OPEN'
          }
        }),
        prisma.website_contact_messages.create({
          data: {
            id: msgId,
            thread_id: threadId,
            author_type: 'PORTAL_USER',
            body
          }
        })
      ])

      scheduleNotifyAdminsPortalUserMessage({
        thread: {
          id: threadId,
          title: titleStored,
          email: u.email,
          support_topic: topic,
          portal_display_name: displayName
        },
        preview: truncate(body.replace(/\s+/g, ' '), 900)
      })

      success(res, { threadId, messageId: msgId }, 'Message sent', 201)
    } catch (err) {
      next(err)
    }
  },

  /** Client / mediator: reply on an existing portal support thread */
  postPortalUserMessage: async function (req, res, next) {
    try {
      assertClientOrMediator(req)
      const threadId = req.params.id
      const body = normalizeLeadBody((req.body || {}).body)
      if (!body) throw createError(errorCodes.MISSING_FIELD)
      if (body.length > MAX_BODY) throw createError(errorCodes.INVALID_REQUEST)

      const thread = await prisma.website_contact_threads.findFirst({
        where: { id: threadId, thread_origin: 'PORTAL', portal_user_id: req.user.id }
      })
      if (!thread) throw createError(errorCodes.NOT_FOUND)

      const msgId = uuidv4()
      await prisma.$transaction([
        prisma.website_contact_messages.create({
          data: {
            id: msgId,
            thread_id: threadId,
            author_type: 'PORTAL_USER',
            body
          }
        }),
        prisma.website_contact_threads.update({
          where: { id: threadId },
          data: { status: 'OPEN' }
        })
      ])

      const displayName = (thread.visitor_name && String(thread.visitor_name).trim()) || thread.email
      scheduleNotifyAdminsPortalUserMessage({
        thread: {
          id: threadId,
          title: thread.title,
          email: thread.email,
          support_topic: thread.support_topic,
          portal_display_name: displayName
        },
        preview: truncate(body.replace(/\s+/g, ' '), 900)
      })

      success(res, { id: msgId }, 'Message sent', 201)
    } catch (err) {
      next(err)
    }
  },

  listInbox: async function (req, res, next) {
    try {
      if (req.user.type !== 'ADMIN') throw createError(errorCodes.FORBIDDEN)
      await assertAdminPage(req, 'messages')

      const threads = await prisma.website_contact_threads.findMany({
        orderBy: { updated_at: 'desc' },
        take: 120,
        include: {
          portal_user: { select: { id: true, name: true, email: true, user_type: true } },
          messages: {
            orderBy: { created_at: 'desc' },
            take: 1,
            select: { body: true, created_at: true, author_type: true }
          }
        }
      })

      const enriched = []
      for (const t of threads) {
        const last = t.messages[0]
        const preview = last ? truncate(String(last.body).replace(/\s+/g, ' '), 140) : ''
        const unreadCount = await inboxReadState.countWebsiteVisitorUnread(prisma, req.user.id, t.id)
        enriched.push({
          thread_id: t.id,
          email: t.email,
          phone: t.phone,
          title: t.title,
          visitor_name: t.visitor_name,
          thread_origin: t.thread_origin,
          support_topic: t.support_topic,
          portal_user: t.portal_user
            ? { id: t.portal_user.id, name: t.portal_user.name, email: t.portal_user.email, user_type: t.portal_user.user_type }
            : null,
          status: t.status,
          last_message_at: last?.created_at || t.updated_at,
          last_preview: preview,
          unread_count: unreadCount
        })
      }

      success(res, { threads: enriched })
    } catch (err) {
      next(err)
    }
  },

  getThread: async function (req, res, next) {
    try {
      if (req.user.type !== 'ADMIN') throw createError(errorCodes.FORBIDDEN)
      await assertAdminPage(req, 'messages')
      const threadId = req.params.id
      const thread = await prisma.website_contact_threads.findUnique({
        where: { id: threadId },
        include: {
          portal_user: { select: { id: true, name: true, email: true, phone_number: true, user_type: true } },
          messages: {
            orderBy: { created_at: 'asc' },
            include: {
              admin: { select: { id: true, name: true, email: true } }
            }
          }
        }
      })
      if (!thread) throw createError(errorCodes.NOT_FOUND)
      const messages = thread.messages.map((m) => ({
        id: m.id,
        author_type: m.author_type,
        body: m.body,
        created_at: m.created_at,
        admin: m.admin ? { id: m.admin.id, name: m.admin.name } : null
      }))
      success(res, {
        thread: {
          id: thread.id,
          email: thread.email,
          phone: thread.phone,
          title: thread.title,
          visitor_name: thread.visitor_name,
          thread_origin: thread.thread_origin,
          support_topic: thread.support_topic,
          portal_user: thread.portal_user,
          status: thread.status,
          created_at: thread.created_at
        },
        messages
      })
    } catch (err) {
      next(err)
    }
  },

  postAdminReply: async function (req, res, next) {
    try {
      if (req.user.type !== 'ADMIN') throw createError(errorCodes.FORBIDDEN)
      await assertAdminPage(req, 'messages')
      const threadId = req.params.id
      const raw = (req.body || {}).body
      const body = normalizeLeadBody(raw)
      if (!body) throw createError(errorCodes.MISSING_FIELD)
      if (body.length > MAX_BODY) throw createError(errorCodes.INVALID_REQUEST)

      const thread = await prisma.website_contact_threads.findUnique({ where: { id: threadId } })
      if (!thread) throw createError(errorCodes.NOT_FOUND)

      const adminRow = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { name: true, email: true }
      })
      const adminName = adminRow?.name || 'Kadr team'

      const msgId = uuidv4()
      await prisma.$transaction([
        prisma.website_contact_messages.create({
          data: {
            id: msgId,
            thread_id: threadId,
            author_type: 'ADMIN',
            body,
            admin_id: req.user.id
          }
        }),
        prisma.website_contact_threads.update({
          where: { id: threadId },
          data: { status: 'OPEN' }
        })
      ])

      const customerSiteUrl = String(process.env.PUBLIC_WEBSITE_URL || process.env.BASE_URL || '').replace(/\/$/, '')
      const portalUrl = helper.portalSupportUrl({ threadId })
      const recipientName =
        thread.thread_origin === 'PORTAL'
          ? String(thread.visitor_name || '').trim() || (thread.email ? thread.email.split('@')[0] : '')
          : String(thread.visitor_name || '').trim()

      try {
        await helper.sendTemplatedEmail(
          'websiteContactCustomerReply',
          thread.email,
          {
            recipientName,
            leadTitle: thread.title,
            adminName,
            replyBody: body,
            websiteUrl: customerSiteUrl,
            openPortalUrl: thread.thread_origin === 'PORTAL' ? portalUrl : ''
          }
        )
      } catch (e) {
        console.error('websiteContact: customer email failed', thread.email, e.message)
      }

      success(res, { id: msgId }, 'Reply sent', 201)
    } catch (err) {
      next(err)
    }
  }
}
