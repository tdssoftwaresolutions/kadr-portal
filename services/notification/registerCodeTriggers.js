/**
 * In-code notification triggers (post-DB hooks). Register handlers here.
 * Loaded from server.js on startup.
 *
 * Table triggers receive { previous, current, userId, data } where userId is the
 * recipient resolved via config/notificationTableMap.js. Handlers may return a
 * send spec (or array) for the template-based notification pipeline, and/or
 * perform side-effects (like direct push fan-out) themselves.
 */
const { registerTableTrigger } = require('./codeTriggerRegistry')
const prisma = require('../../lib/prisma')
const pushEvents = require('../push/pushEvents')

/** Welcome email when admin approves a user (active: false → true) with password in context. */
registerTableTrigger('user', async ({ previous, current, userId, data }) => {
  if (previous?.active !== false || current?.active !== true) return null
  if (!data?.password) return null

  return {
    templateKey: 'welcomeCredentials',
    channel: 'EMAIL',
    userId,
    data: data || {}
  }
})

/** Push to a user when their account is approved (active false → true). */
registerTableTrigger('user', async ({ previous, current }) => {
  if (previous?.active !== false || current?.active !== true) return null
  const uid = current?.id
  if (!uid) return null
  await pushEvents.notifyUser({
    userId: uid,
    category: 'case_updates',
    title: 'Your account is approved',
    body: 'Welcome to Kadr. You can now sign in and access the portal.',
    data: { url: '/admin/' }
  })
  return null
})

/**
 * Push on case status / sub-status changes to the mediator and both parties.
 * Fires only when status or sub_status actually changed.
 */
registerTableTrigger('cases', async ({ previous, current }) => {
  const statusChanged = previous?.status !== current?.status
  const subStatusChanged = previous?.sub_status !== current?.sub_status
  if (!statusChanged && !subStatusChanged) return null

  const caseLabel = current?.caseId || 'your case'
  const recipients = [current?.mediator, current?.first_party, current?.second_party]

  await pushEvents.notifyUsers({
    userIds: recipients,
    category: 'case_updates',
    title: `Update on case ${caseLabel}`,
    body: 'There is a new update on your case. Open the portal to view details.',
    data: { url: '/admin/cases', caseId: current?.caseId }
  })
  return null
})

/**
 * Support ticket activity. website_contact_messages has author_type ('USER'|'ADMIN')
 * and links to a thread. Notify the opposite side.
 */
registerTableTrigger('website_contact_messages', async ({ current, data }) => {
  if (data?._triggerAction !== 'create') return null
  const threadId = current?.thread_id
  if (!threadId) return null

  const thread = await prisma.website_contact_threads.findUnique({
    where: { id: threadId },
    select: { id: true, portal_user_id: true, title: true }
  })
  if (!thread) return null

  const authorType = String(current?.author_type || '').toUpperCase()

  if (authorType === 'ADMIN') {
    // Admin replied → notify the portal user who owns the thread.
    if (thread.portal_user_id) {
      await pushEvents.notifyUser({
        userId: thread.portal_user_id,
        category: 'case_updates',
        title: 'New reply on your support ticket',
        body: thread.title ? `Re: ${thread.title}` : 'You have a new reply from support.',
        data: { url: '/admin/support', threadId: thread.id }
      })
    }
    return null
  }

  // User posted → notify all active admins.
  const admins = await prisma.user.findMany({
    where: { user_type: 'ADMIN', active: true, is_deleted: false },
    select: { id: true }
  })
  await pushEvents.notifyUsers({
    userIds: admins.map((a) => a.id),
    category: 'admin_support',
    title: 'New support ticket activity',
    body: thread.title ? `New message: ${thread.title}` : 'A user posted a new support message.',
    data: { url: '/admin/website-contact/inbox', threadId: thread.id }
  })
  return null
})

/**
 * New support thread created by a portal user → notify admins (admin_support).
 */
registerTableTrigger('website_contact_threads', async ({ current, data }) => {
  if (data?._triggerAction !== 'create') return null
  const admins = await prisma.user.findMany({
    where: { user_type: 'ADMIN', active: true, is_deleted: false },
    select: { id: true }
  })
  await pushEvents.notifyUsers({
    userIds: admins.map((a) => a.id),
    category: 'admin_support',
    title: 'New support ticket',
    body: current?.title ? `Subject: ${current.title}` : 'A new support ticket was opened.',
    data: { url: '/admin/website-contact/inbox', threadId: current?.id }
  })
  return null
})

module.exports = {}
