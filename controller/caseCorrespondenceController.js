const { PrismaClient } = require('@prisma/client')
const { v4: uuidv4 } = require('uuid')
const prisma = new PrismaClient()
const helper = require('../utils/helper')
const errorCodes = require('../utils/errors/errorCodes')
const { createError } = require('../utils/errors')
const { success } = require('../utils/responses')
const {
  sanitizeCorrespondenceBody,
  sanitizeFileName
} = require('../utils/caseCorrespondenceSanitizer')
const { assertAdminPage, assertAdminPageAny, adminHasPage } = require('../utils/adminPermissionHelpers')
const inboxReadState = require('../utils/adminInboxReadState')

const MAX_BODY_LENGTH = 12000
const MAX_ATTACHMENTS = 5
const MAX_FILE_BYTES = 8 * 1024 * 1024

/** Logical channels (stored in DB; legacy party–mediator values are read-only aliases). */
const LOGICAL_CHANNELS = new Set(['ADMIN_MEDIATOR', 'ADMIN_FIRST_PARTY', 'ADMIN_SECOND_PARTY'])

const authorSelect = {
  select: {
    id: true,
    name: true,
    user_type: true
  }
}

const messageInclude = {
  user: authorSelect,
  attachments: true
}

function toLogicalChannel (dbChannel) {
  if (dbChannel === 'FIRST_PARTY_MEDIATOR') return 'ADMIN_FIRST_PARTY'
  if (dbChannel === 'SECOND_PARTY_MEDIATOR') return 'ADMIN_SECOND_PARTY'
  return dbChannel
}

function dbChannelsForLogical (logical) {
  if (logical === 'ADMIN_FIRST_PARTY') return ['ADMIN_FIRST_PARTY', 'FIRST_PARTY_MEDIATOR']
  if (logical === 'ADMIN_SECOND_PARTY') return ['ADMIN_SECOND_PARTY', 'SECOND_PARTY_MEDIATOR']
  if (logical === 'ADMIN_MEDIATOR') return ['ADMIN_MEDIATOR']
  return []
}

/** DB value to store for new messages (must match MySQL enum `case_correspondence_channel`). */
function persistChannelForLogical (logical) {
  if (logical === 'ADMIN_MEDIATOR') return 'ADMIN_MEDIATOR'
  if (logical === 'ADMIN_FIRST_PARTY') return 'ADMIN_FIRST_PARTY'
  if (logical === 'ADMIN_SECOND_PARTY') return 'ADMIN_SECOND_PARTY'
  return null
}

function parseLogicalChannel (value) {
  const v = typeof value === 'string' ? value.trim() : value
  if (!v) return null
  if (LOGICAL_CHANNELS.has(v)) return v
  if (v === 'FIRST_PARTY_MEDIATOR') return 'ADMIN_FIRST_PARTY'
  if (v === 'SECOND_PARTY_MEDIATOR') return 'ADMIN_SECOND_PARTY'
  return null
}

async function loadCase (caseId) {
  if (!caseId) return null
  return prisma.cases.findUnique({
    where: { id: caseId },
    select: {
      id: true,
      caseId: true,
      mediator: true,
      first_party: true,
      second_party: true,
      category: true,
      description: true,
      status: true,
      sub_status: true
    }
  })
}

function channelLabel (logicalChannel) {
  return 'Case chat'
}

function inboxSenderSummary (senderName, senderRoleLabel, isAdminRecipient) {
  const name = senderName || 'Someone'
  if (isAdminRecipient) {
    if (senderRoleLabel === 'Mediator') return `Mediator : ${name}`
    if (senderRoleLabel === 'First party') return `First party : ${name}`
    if (senderRoleLabel === 'Second party') return `Second party : ${name}`
    return `${senderRoleLabel}: ${name}`
  }
  return `Admin: ${name} messaged you`
}

function senderRoleLabel (userId, caseRow, userType) {
  if (userType === 'ADMIN') return 'Admin'
  if (userType === 'MEDIATOR') return 'Mediator'
  if (caseRow.first_party === userId) return 'First party'
  if (caseRow.second_party === userId) return 'Second party'
  return 'Party'
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

function counterpartyUserId (caseRow, logicalChannel) {
  if (logicalChannel === 'ADMIN_MEDIATOR') return caseRow.mediator || null
  if (logicalChannel === 'ADMIN_FIRST_PARTY') return caseRow.first_party || null
  if (logicalChannel === 'ADMIN_SECOND_PARTY') return caseRow.second_party || null
  return null
}

async function resolveNotifyRecipients (caseRow, logicalChannel, authorId, userType) {
  if (userType === 'ADMIN') {
    const uid = counterpartyUserId(caseRow, logicalChannel)
    if (!uid || uid === authorId) return []
    const u = await prisma.user.findUnique({
      where: { id: uid },
      select: { email: true, name: true }
    })
    if (u?.email) return [{ email: u.email, name: u.name }]
    return []
  }
  const admins = await getMessageHubNotifyRecipients()
  return admins.filter((a) => a.id !== authorId)
}

async function fetchUrlAsNodemailerAttachment (url, filename, mimeType) {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const buf = Buffer.from(await res.arrayBuffer())
    if (!buf.length) return null
    return {
      filename: sanitizeFileName(filename),
      content: buf,
      contentType: mimeType || res.headers.get('content-type') || 'application/octet-stream'
    }
  } catch (e) {
    console.error('caseCorrespondence: attachment fetch for email failed', e.message)
    return null
  }
}

function truncate (s, max) {
  const t = String(s || '')
  if (t.length <= max) return t
  return `${t.slice(0, max - 1)}…`
}

function scheduleCorrespondenceNotify ({
  recipients,
  senderName,
  senderRole,
  caseLabel,
  logicalChannel,
  bodyText,
  attachmentRows,
  isAdminRecipient,
  openPortalUrl
}) {
  if (!recipients.length) return

  setImmediate(async () => {
    const preview = truncate(bodyText.replace(/\s+/g, ' ').trim(), 900)
    const attachmentSummary = attachmentRows.length
      ? `${attachmentRows.length} file(s) included — see attached copies below or open the case in the portal.`
      : 'None'

    let attachmentLinksHtml = ''
    if (attachmentRows.length) {
      const items = attachmentRows.map((a) => {
        const safeName = sanitizeFileName(a.file_name)
        const href = String(a.s3_url || '').replace(/"/g, '%22')
        return `<li style="margin:4px 0;"><a href="${href}">${safeName.replace(/</g, '&lt;')}</a></li>`
      })
      attachmentLinksHtml = `<ul style="padding-left:18px;margin:0;">${items.join('')}</ul>`
    }

    const emailAttachments = []
    for (const row of attachmentRows) {
      const att = await fetchUrlAsNodemailerAttachment(row.s3_url, row.file_name, row.mime_type)
      if (att) emailAttachments.push(att)
    }

    const senderSummary = inboxSenderSummary(senderName, senderRole, isAdminRecipient)

    const variablesBase = {
      senderName,
      senderRoleLabel: senderRole,
      senderSummary,
      caseLabel,
      messagePreview: preview || '(attachment only)',
      attachmentSummary,
      attachmentLinksHtml,
      isAdminRecipient: Boolean(isAdminRecipient),
      openPortalUrl: openPortalUrl || ''
    }

    for (const r of recipients) {
      try {
        await helper.sendTemplatedEmail(
          'caseCorrespondenceNewMessage',
          r.email,
          { ...variablesBase, recipientName: r.name || '' },
          emailAttachments
        )
      } catch (e) {
        console.error('caseCorrespondence: notify email failed', r.email, e.message)
      }
    }
  })
}

function canAccessCase (user, caseRow) {
  if (!caseRow) return false
  const { id, type } = user
  if (type === 'ADMIN') return true
  if (type === 'MEDIATOR' && caseRow.mediator === id) return true
  if (type === 'CLIENT' && (caseRow.first_party === id || caseRow.second_party === id)) return true
  return false
}

function canUseChannel (user, caseRow, logicalChannel) {
  const { id, type } = user
  if (type === 'ADMIN') return true
  if (type === 'MEDIATOR' && caseRow.mediator === id && logicalChannel === 'ADMIN_MEDIATOR') return true
  if (type === 'CLIENT') {
    if (logicalChannel === 'ADMIN_FIRST_PARTY' && caseRow.first_party === id) return true
    if (logicalChannel === 'ADMIN_SECOND_PARTY' && caseRow.second_party === id) return true
  }
  return false
}

function clientLogicalChannelForUser (caseRow, userId) {
  if (caseRow.first_party === userId) return 'ADMIN_FIRST_PARTY'
  if (caseRow.second_party === userId) return 'ADMIN_SECOND_PARTY'
  return null
}

function mapMessage (row) {
  return {
    id: row.id,
    case_id: row.case_id,
    channel: toLogicalChannel(row.channel),
    parent_id: row.parent_id,
    body: row.body,
    had_pii_removed: row.had_pii_removed,
    created_at: row.created_at,
    author: row.user
      ? {
          id: row.user.id,
          name: row.user.name,
          user_type: row.user.user_type
        }
      : null,
    attachments: (row.attachments || []).map((a) => ({
      id: a.id,
      file_name: a.file_name,
      s3_url: a.s3_url,
      mime_type: a.mime_type
    }))
  }
}

async function messagesForLogical (caseId, logicalChannel) {
  const channels = dbChannelsForLogical(logicalChannel)
  if (!channels.length) return []
  const rows = await prisma.case_messages.findMany({
    where: { case_id: caseId, channel: { in: channels } },
    orderBy: { created_at: 'asc' },
    include: messageInclude
  })
  return rows.map(mapMessage)
}

async function uploadAttachment (base64Payload, safeName) {
  const keyBase = `case-correspondence/${uuidv4()}-${safeName.replace(/\.[^.]+$/, '') || 'file'}`
  return helper.deployToS3Bucket(base64Payload, keyBase)
}

module.exports = {
  listMessages: async function (req, res, next) {
    try {
      const { id: userId, type: userType } = req.user
      const caseId = req.query.caseId
      let logicalChannel = parseLogicalChannel(req.query.channel)

      const caseRow = await loadCase(caseId)
      if (!caseRow) throw createError(errorCodes.CASE_NOT_FOUND)
      if (!canAccessCase(req.user, caseRow)) throw createError(errorCodes.FORBIDDEN)
      if (userType === 'ADMIN') {
        await assertAdminPageAny(req, ['cases', 'messages'])
      }

      if (userType === 'CLIENT') {
        logicalChannel = clientLogicalChannelForUser(caseRow, userId)
        if (!logicalChannel) throw createError(errorCodes.FORBIDDEN)
      } else if (userType === 'MEDIATOR') {
        logicalChannel = 'ADMIN_MEDIATOR'
      } else if (userType === 'ADMIN') {
        if (!logicalChannel) throw createError(errorCodes.MISSING_FIELD)
        if (!canUseChannel(req.user, caseRow, logicalChannel)) throw createError(errorCodes.FORBIDDEN)
      }

      const messages = await messagesForLogical(caseId, logicalChannel)

      success(res, {
        messages,
        channel: logicalChannel,
        monitoringNotice: 'Messages may be reviewed for support and compliance. Be respectful and lawful.'
      })
    } catch (err) {
      next(err)
    }
  },

  listAllChannelsForAdmin: async function (req, res, next) {
    try {
      const { type: userType } = req.user
      if (userType !== 'ADMIN') throw createError(errorCodes.FORBIDDEN)
      await assertAdminPageAny(req, ['cases', 'messages'])

      const caseId = req.query.caseId
      const caseRow = await loadCase(caseId)
      if (!caseRow) throw createError(errorCodes.CASE_NOT_FOUND)

      const [a, b, c] = await Promise.all([
        messagesForLogical(caseId, 'ADMIN_FIRST_PARTY'),
        messagesForLogical(caseId, 'ADMIN_SECOND_PARTY'),
        messagesForLogical(caseId, 'ADMIN_MEDIATOR')
      ])

      success(res, {
        ADMIN_FIRST_PARTY: a,
        ADMIN_SECOND_PARTY: b,
        ADMIN_MEDIATOR: c,
        monitoringNotice: 'Private threads with each participant on this case.'
      })
    } catch (err) {
      next(err)
    }
  },

  /**
   * Global inbox for admins: one row per (case, logical thread), newest activity first.
   */
  listInbox: async function (req, res, next) {
    try {
      if (req.user.type !== 'ADMIN') throw createError(errorCodes.FORBIDDEN)
      await assertAdminPage(req, 'messages')

      const grouped = await prisma.case_messages.groupBy({
        by: ['case_id', 'channel'],
        _max: { created_at: true }
      })

      const merged = new Map()
      for (const g of grouped) {
        const logical = toLogicalChannel(g.channel)
        if (!LOGICAL_CHANNELS.has(logical)) continue
        const key = `${g.case_id}:${logical}`
        const prev = merged.get(key)
        const t = g._max.created_at
        const tMs = t ? new Date(t).getTime() : 0
        const prevMs = prev && prev.lastAt ? new Date(prev.lastAt).getTime() : 0
        if (!prev || tMs > prevMs) {
          merged.set(key, { case_id: g.case_id, logicalChannel: logical, lastAt: t })
        }
      }

      let threads = Array.from(merged.values()).sort((x, y) => {
        const ax = x.lastAt ? new Date(x.lastAt).getTime() : 0
        const ay = y.lastAt ? new Date(y.lastAt).getTime() : 0
        return ay - ax
      })
      threads = threads.slice(0, 120)

      const caseIds = [...new Set(threads.map((t) => t.case_id))]
      const cases = caseIds.length
        ? await prisma.cases.findMany({
          where: { id: { in: caseIds } },
          select: {
            id: true,
            caseId: true,
            category: true,
            status: true,
            mediator: true,
            first_party: true,
            second_party: true,
            user_cases_mediatorTouser: { select: { id: true, name: true, email: true } },
            user_cases_first_partyTouser: { select: { id: true, name: true, email: true } },
            user_cases_second_partyTouser: { select: { id: true, name: true, email: true } }
          }
        })
        : []
      const caseMap = new Map(cases.map((c) => [c.id, c]))

      const enriched = []
      for (const th of threads) {
        const c = caseMap.get(th.case_id)
        const channels = dbChannelsForLogical(th.logicalChannel)
        const lastMsg = await prisma.case_messages.findFirst({
          where: { case_id: th.case_id, channel: { in: channels } },
          orderBy: { created_at: 'desc' },
          include: { user: authorSelect }
        })
        const preview = lastMsg ? truncate(lastMsg.body.replace(/\s+/g, ' ').trim(), 140) : ''
        const participantLabel =
          th.logicalChannel === 'ADMIN_MEDIATOR'
            ? (c?.user_cases_mediatorTouser?.name ? `Mediator : ${c.user_cases_mediatorTouser.name}` : 'Mediator (unassigned)')
            : th.logicalChannel === 'ADMIN_FIRST_PARTY'
              ? (c?.user_cases_first_partyTouser?.name ? `First party : ${c.user_cases_first_partyTouser.name}` : 'First party')
              : (c?.user_cases_second_partyTouser?.name ? `Second party : ${c.user_cases_second_partyTouser.name}` : 'Second party')

        const unreadCount = await inboxReadState.countCaseIncomingUnread(
          prisma,
          req.user.id,
          th.case_id,
          th.logicalChannel,
          channels
        )

        enriched.push({
          case_id: th.case_id,
          case_reference: c?.caseId || th.case_id.slice(0, 8),
          logical_channel: th.logicalChannel,
          channel_label: channelLabel(th.logicalChannel),
          last_message_at: th.lastAt,
          last_preview: preview,
          participant_label: participantLabel,
          category: c?.category || null,
          unread_count: unreadCount
        })
      }

      success(res, { threads: enriched })
    } catch (err) {
      next(err)
    }
  },

  markInboxRead: async function (req, res, next) {
    try {
      if (req.user.type !== 'ADMIN') throw createError(errorCodes.FORBIDDEN)
      await assertAdminPage(req, 'messages')
      const kind = typeof req.body?.kind === 'string' ? req.body.kind.trim().toUpperCase() : ''
      if (kind === 'CASE') {
        const caseId = req.body?.caseId
        const logicalChannel = parseLogicalChannel(req.body?.logicalChannel)
        if (!caseId || !logicalChannel) throw createError(errorCodes.MISSING_FIELD)
        const caseRow = await loadCase(caseId)
        if (!caseRow) throw createError(errorCodes.CASE_NOT_FOUND)
        const ch = dbChannelsForLogical(logicalChannel)
        await inboxReadState.markCaseThreadRead(prisma, req.user.id, caseId, logicalChannel, ch)
        return success(res, { ok: true })
      }
      if (kind === 'WEBSITE') {
        const threadId = req.body?.websiteThreadId
        if (!threadId || typeof threadId !== 'string') throw createError(errorCodes.MISSING_FIELD)
        const thread = await prisma.website_contact_threads.findUnique({ where: { id: threadId } })
        if (!thread) throw createError(errorCodes.NOT_FOUND)
        await inboxReadState.markWebsiteThreadRead(prisma, req.user.id, threadId)
        return success(res, { ok: true })
      }
      throw createError(errorCodes.INVALID_REQUEST)
    } catch (err) {
      next(err)
    }
  },

  listCasesForPicker: async function (req, res, next) {
    try {
      if (req.user.type !== 'ADMIN') throw createError(errorCodes.FORBIDDEN)
      await assertAdminPage(req, 'messages')
      const page = Math.max(1, parseInt(req.query.page, 10) || 1)
      const search = (req.query.search || '').trim()
      const perPage = 15
      const skip = (page - 1) * perPage
      const active = helper.adminActiveCaseStatusesFilter()
      const whereParts = [active]
      if (search) {
        whereParts.push({
          OR: [
            { caseId: { contains: search } },
            { category: { contains: search } }
          ]
        })
      }
      const where = { AND: whereParts }
      const [casesWithEvents, total] = await Promise.all([
        prisma.cases.findMany({
          where,
          orderBy: { created_at: 'desc' },
          skip,
          take: perPage,
          select: {
            id: true,
            caseId: true,
            category: true,
            status: true,
            sub_status: true,
            case_statuses: { select: { name: true } },
            case_sub_statuses: { select: { name: true } },
            user_cases_mediatorTouser: { select: { id: true, name: true, email: true } },
            user_cases_first_partyTouser: { select: { id: true, name: true, email: true } },
            user_cases_second_partyTouser: { select: { id: true, name: true, email: true } }
          }
        }),
        prisma.cases.count({ where })
      ])
      success(res, { casesWithEvents, total, page, perPage })
    } catch (err) {
      next(err)
    }
  },

  threadContext: async function (req, res, next) {
    try {
      if (req.user.type !== 'ADMIN') throw createError(errorCodes.FORBIDDEN)
      await assertAdminPage(req, 'messages')
      const caseId = req.query.caseId
      const caseRow = await prisma.cases.findUnique({
        where: { id: caseId },
        select: helper.getAdminCaseCardSelect()
      })
      if (!caseRow) throw createError(errorCodes.CASE_NOT_FOUND)
      success(res, { case: caseRow })
    } catch (err) {
      next(err)
    }
  },

  createMessage: async function (req, res, next) {
    try {
      const { id: userId, type: userType } = req.user
      const { caseId, channel: channelRaw, body: rawBody, parentId, attachments = [] } = req.body || {}

      const logicalChannel = parseLogicalChannel(channelRaw)
      if (!caseId || !logicalChannel) throw createError(errorCodes.MISSING_FIELD)

      const caseRow = await loadCase(caseId)
      if (!caseRow) throw createError(errorCodes.CASE_NOT_FOUND)
      if (!canAccessCase(req.user, caseRow)) throw createError(errorCodes.FORBIDDEN)
      if (!canUseChannel(req.user, caseRow, logicalChannel)) throw createError(errorCodes.FORBIDDEN)
      if (userType === 'ADMIN') {
        await assertAdminPageAny(req, ['cases', 'messages'])
      }

      const { text: body, hadPiiRemoved: bodyStripped } = sanitizeCorrespondenceBody(rawBody || '')
      if (body.length > MAX_BODY_LENGTH) throw createError(errorCodes.INVALID_REQUEST)

      if (!Array.isArray(attachments) || attachments.length > MAX_ATTACHMENTS) {
        throw createError(errorCodes.INVALID_REQUEST)
      }

      const dbChannels = dbChannelsForLogical(logicalChannel)
      const persistChannel = persistChannelForLogical(logicalChannel)
      if (!persistChannel) {
        throw createError(errorCodes.INVALID_REQUEST)
      }

      if (parentId) {
        const parent = await prisma.case_messages.findFirst({
          where: {
            id: parentId,
            case_id: caseId,
            channel: { in: dbChannels }
          }
        })
        if (!parent) throw createError(errorCodes.INVALID_REQUEST)
      }

      const hasAttachments = attachments.length > 0
      if (!body.trim() && !hasAttachments) {
        throw createError(errorCodes.CASE_CORRESPONDENCE_BLOCKED)
      }

      const messageId = uuidv4()
      const storedHadPii = bodyStripped
      const bodyToStore = body.trim() ? body.trim() : '(attachment only)'

      const created = await prisma.$transaction(async (tx) => {
        await tx.case_messages.create({
          data: {
            id: messageId,
            case_id: caseId,
            channel: persistChannel,
            author_id: userId,
            parent_id: parentId || null,
            body: bodyToStore,
            had_pii_removed: storedHadPii
          }
        })

        let uploadedCount = 0
        for (const item of attachments) {
          const name = sanitizeFileName(item.fileName || item.file_name || 'file')
          const b64 = item.base64 || item.content
          if (!b64) continue
          const matches = String(b64).match(/^data:(.+);base64,(.+)$/)
          let buf
          if (matches && matches.length === 3) {
            buf = Buffer.from(matches[2], 'base64')
          } else {
            buf = Buffer.from(String(b64).replace(/^data:[^;]+;base64,/, ''), 'base64')
          }
          if (!buf || buf.length === 0) continue
          if (buf.length > MAX_FILE_BYTES) throw createError(errorCodes.INVALID_REQUEST)

          const url = await uploadAttachment(b64, name)
          await tx.case_message_attachments.create({
            data: {
              id: uuidv4(),
              message_id: messageId,
              file_name: name,
              s3_url: url,
              mime_type: item.mimeType || item.mime_type || matches?.[1] || null
            }
          })
          uploadedCount += 1
        }

        if (attachments.length > 0 && uploadedCount === 0) {
          throw createError(errorCodes.INVALID_REQUEST)
        }

        return tx.case_messages.findUnique({
          where: { id: messageId },
          include: messageInclude
        })
      })

      const mapped = mapMessage(created)
      const sanitizationNotice = storedHadPii
        ? 'Email addresses and phone numbers are not allowed and were removed from your message.'
        : null

      const recipients = await resolveNotifyRecipients(caseRow, logicalChannel, userId, userType)
      const caseLabel = caseRow.caseId ? `Case #${caseRow.caseId}` : `Case ${caseRow.id.slice(0, 8)}…`
      const senderName = created.user?.name || 'A participant'
      const senderRole = senderRoleLabel(userId, caseRow, userType)
      const isAdminRecipient = userType !== 'ADMIN'
      const openPortalUrl = isAdminRecipient
        ? helper.portalMessageCenterUrl({ caseId: caseRow.id, channel: logicalChannel })
        : ''

      if (recipients.length) {
        scheduleCorrespondenceNotify({
          recipients,
          senderName,
          senderRole,
          caseLabel,
          logicalChannel,
          bodyText: bodyToStore,
          attachmentRows: created.attachments || [],
          isAdminRecipient,
          openPortalUrl
        })
      }

      success(res, {
        message: mapped,
        sanitizationNotice,
        monitoringNotice: 'Messages may be reviewed for support and compliance. Be respectful and lawful.'
      }, sanitizationNotice || 'Message sent', 201)
    } catch (err) {
      next(err)
    }
  }
}
