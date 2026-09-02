/**
 * Web push reminders for upcoming mediation meetings.
 *
 * Runs every 5 minutes and pushes participants (mediator + both parties) when a
 * KADR meeting is due to start within the next REMINDER_WINDOW_MIN minutes.
 * De-dup is per (event, user) via notification_send_logs so each participant is
 * reminded once per meeting. Respects the 'meeting_reminders' push category.
 */
const cron = require('node-cron')
const prisma = require('../../lib/prisma')
const pushEvents = require('../push/pushEvents')
const { withSchedulerLock } = require('./schedulerLockService')

const REMINDER_WINDOW_MIN = Number(process.env.MEETING_REMINDER_WINDOW_MIN || 30)
const DEDUP_KEY = 'meetingReminderPushDedup'

async function alreadyReminded (userId, eventId) {
  const existing = await prisma.notification_send_logs.findFirst({
    where: {
      template_key: DEDUP_KEY,
      user_id: userId,
      recipient: eventId,
      status: 'dedup'
    },
    select: { id: true }
  })
  return Boolean(existing)
}

async function markReminded (userId, eventId) {
  await prisma.notification_send_logs.create({
    data: {
      template_key: DEDUP_KEY,
      channel: 'PUSH',
      user_id: userId,
      recipient: eventId,
      status: 'dedup',
      metadata: { eventId, purpose: 'meeting_reminder_push' }
    }
  })
}

async function runMeetingReminderPushJob () {
  return withSchedulerLock('meeting-reminder-push', async () => {
    const now = new Date()
    const windowEnd = new Date(now.getTime() + REMINDER_WINDOW_MIN * 60 * 1000)

    const meetings = await prisma.events.findMany({
      where: {
        type: 'KADR',
        start_datetime: { gte: now, lte: windowEnd }
      },
      select: {
        id: true,
        start_datetime: true,
        meeting_link: true,
        cases: {
          select: {
            caseId: true,
            user_cases_mediatorTouser: { select: { id: true, active: true, is_deleted: true } },
            user_cases_first_partyTouser: { select: { id: true, active: true, is_deleted: true } },
            user_cases_second_partyTouser: { select: { id: true, active: true, is_deleted: true } }
          }
        }
      }
    })

    let pushed = 0
    for (const meeting of meetings) {
      const caseLabel = meeting.cases?.caseId || 'your case'
      const participants = [
        meeting.cases?.user_cases_mediatorTouser,
        meeting.cases?.user_cases_first_partyTouser,
        meeting.cases?.user_cases_second_partyTouser
      ].filter((u) => u && u.id && u.active !== false && u.is_deleted !== true)

      for (const user of participants) {
        if (await alreadyReminded(user.id, meeting.id)) continue
        await pushEvents.notifyUser({
          userId: user.id,
          category: 'meeting_reminders',
          title: 'Upcoming mediation meeting',
          body: `Your meeting for case ${caseLabel} is starting soon.`,
          data: {
            url: meeting.meeting_link || '/admin/calendar',
            caseId: meeting.cases?.caseId,
            eventId: meeting.id
          }
        })
        await markReminded(user.id, meeting.id)
        pushed += 1
      }
    }
    console.log(`[scheduler] Meeting reminder push job completed. Pushes queued: ${pushed}`)
    return pushed
  }, 5 * 60 * 1000)
}

function scheduleMeetingReminderPushJob () {
  cron.schedule('*/5 * * * *', () => {
    runMeetingReminderPushJob().catch((err) => {
      console.error('[scheduler] Meeting reminder push job failed:', err)
    })
  }, {
    timezone: process.env.APP_TIMEZONE || 'Asia/Kolkata'
  })
  console.log('[scheduler] Meeting reminder push job scheduled (every 5 minutes)')
}

module.exports = {
  scheduleMeetingReminderPushJob,
  runMeetingReminderPushJob
}
