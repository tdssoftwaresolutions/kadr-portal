/**
 * Per-admin read state for Message center threads (case + website).
 * Unread = incoming messages (non-admin / website visitor) with created_at > boundary.
 * If the admin has no row yet, boundary defaults to the latest incoming message so
 * legacy threads do not show a huge historical unread count.
 */

const { v4: uuidv4 } = require('uuid')

async function findReadState (prisma, adminId, kind, { caseId, logicalChannel, websiteThreadId }) {
  if (kind === 'CASE') {
    return prisma.admin_inbox_read_states.findFirst({
      where: {
        admin_id: adminId,
        thread_kind: 'CASE',
        case_id: caseId,
        logical_channel: logicalChannel,
        website_thread_id: null
      }
    })
  }
  return prisma.admin_inbox_read_states.findFirst({
    where: {
      admin_id: adminId,
      thread_kind: 'WEBSITE',
      website_thread_id: websiteThreadId,
      case_id: null,
      logical_channel: null
    }
  })
}

async function upsertReadState (prisma, adminId, kind, lastReadAt, { caseId, logicalChannel, websiteThreadId }) {
  const existing = await findReadState(prisma, adminId, kind, { caseId, logicalChannel, websiteThreadId })
  const base = {
    admin_id: adminId,
    thread_kind: kind,
    last_read_at: lastReadAt
  }
  if (kind === 'CASE') {
    base.case_id = caseId
    base.logical_channel = logicalChannel
    base.website_thread_id = null
  } else {
    base.case_id = null
    base.logical_channel = null
    base.website_thread_id = websiteThreadId
  }
  if (existing) {
    return prisma.admin_inbox_read_states.update({
      where: { id: existing.id },
      data: { last_read_at: lastReadAt }
    })
  }
  return prisma.admin_inbox_read_states.create({
    data: { id: uuidv4(), ...base }
  })
}

async function countCaseIncomingUnread (prisma, adminId, caseId, logicalChannel, dbChannels) {
  const state = await findReadState(prisma, adminId, 'CASE', { caseId, logicalChannel, websiteThreadId: null })
  let boundary
  if (state?.last_read_at) {
    boundary = state.last_read_at
  } else {
    const baseline = await prisma.case_messages.aggregate({
      where: {
        case_id: caseId,
        channel: { in: dbChannels },
        user: { user_type: { not: 'ADMIN' } }
      },
      _max: { created_at: true }
    })
    boundary = baseline._max.created_at || new Date(0)
  }
  return prisma.case_messages.count({
    where: {
      case_id: caseId,
      channel: { in: dbChannels },
      created_at: { gt: boundary },
      user: { user_type: { not: 'ADMIN' } }
    }
  })
}

async function countWebsiteVisitorUnread (prisma, adminId, threadId) {
  const state = await findReadState(prisma, adminId, 'WEBSITE', {
    caseId: null,
    logicalChannel: null,
    websiteThreadId: threadId
  })
  let boundary
  if (state?.last_read_at) {
    boundary = state.last_read_at
  } else {
    const baseline = await prisma.website_contact_messages.aggregate({
      where: {
        thread_id: threadId,
        author_type: { in: ['VISITOR', 'PORTAL_USER'] }
      },
      _max: { created_at: true }
    })
    boundary = baseline._max.created_at || new Date(0)
  }
  return prisma.website_contact_messages.count({
    where: {
      thread_id: threadId,
      author_type: { in: ['VISITOR', 'PORTAL_USER'] },
      created_at: { gt: boundary }
    }
  })
}

async function markCaseThreadRead (prisma, adminId, caseId, logicalChannel, dbChannels) {
  const agg = await prisma.case_messages.aggregate({
    where: { case_id: caseId, channel: { in: dbChannels } },
    _max: { created_at: true }
  })
  const at = agg._max.created_at || new Date()
  return upsertReadState(prisma, adminId, 'CASE', at, { caseId, logicalChannel, websiteThreadId: null })
}

async function markWebsiteThreadRead (prisma, adminId, threadId) {
  const agg = await prisma.website_contact_messages.aggregate({
    where: { thread_id: threadId },
    _max: { created_at: true }
  })
  const at = agg._max.created_at || new Date()
  return upsertReadState(prisma, adminId, 'WEBSITE', at, {
    caseId: null,
    logicalChannel: null,
    websiteThreadId: threadId
  })
}

module.exports = {
  countCaseIncomingUnread,
  countWebsiteVisitorUnread,
  markCaseThreadRead,
  markWebsiteThreadRead
}
