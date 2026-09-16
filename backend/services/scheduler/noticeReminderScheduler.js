const cron = require('node-cron')
const prisma = require('../../lib/prisma')
const { CaseSubTypes } = require('../../utils/caseConstants')
const { withSchedulerLock } = require('./schedulerLockService')
const { alertSchedulerFailure } = require('../alerting/criticalAlertService')
const { sendNoticeEmailsToSecondParty } = require('../case/noticeEmailService')

const DAY_MS = 24 * 60 * 60 * 1000
// Reminder 1 at day 2 (2nd send overall), reminder 2 at day 4 (3rd send
// overall), then stop — 3 total sends of the notice per case, as requested.
const REMINDER_SCHEDULE = [
  { afterDays: 2, expectedSentCount: 1 },
  { afterDays: 4, expectedSentCount: 2 }
]

async function getNoticeSentAt (caseId) {
  const historyRow = await prisma.case_history.findFirst({
    where: {
      case_id: caseId,
      case_events: { sub_status_id: CaseSubTypes.NOTICE_SENT_TO_OPPOSITE_PARTY }
    },
    orderBy: { created_at: 'desc' },
    select: { created_at: true }
  })
  return historyRow?.created_at || null
}

async function getSentCount (caseId) {
  return prisma.notification_send_logs.count({
    where: {
      case_id: caseId,
      template_key: 'paymentNoticeToSecondParty',
      channel: 'EMAIL'
    }
  })
}

async function runNoticeReminderJob () {
  return withSchedulerLock('notice-reminder', async () => {
    const cases = await prisma.cases.findMany({
      where: { sub_status: CaseSubTypes.NOTICE_SENT_TO_OPPOSITE_PARTY },
      select: {
        id: true,
        caseId: true,
        case_type: true,
        category: true,
        description: true,
        evidence_document_url: true,
        user_cases_second_partyTouser: { select: { id: true, name: true, email: true } },
        user_cases_first_partyTouser: { select: { name: true, email: true } }
      }
    })

    const now = Date.now()
    let sentCount = 0

    for (const caseDetails of cases) {
      if (!caseDetails.user_cases_second_partyTouser?.email) continue

      const noticeSentAt = await getNoticeSentAt(caseDetails.id)
      if (!noticeSentAt) continue

      const daysSinceNotice = (now - new Date(noticeSentAt).getTime()) / DAY_MS
      const alreadySent = await getSentCount(caseDetails.id)

      const due = REMINDER_SCHEDULE.find(
        (r) => daysSinceNotice >= r.afterDays && alreadySent === r.expectedSentCount
      )
      if (!due) continue

      await sendNoticeEmailsToSecondParty({ caseId: caseDetails.id, caseDetails })
      sentCount += 1
    }

    console.log(`[scheduler] Notice reminder job completed. Reminders sent: ${sentCount}`)
    return sentCount
  }, 30 * 60 * 1000)
}

function scheduleNoticeReminderJob () {
  cron.schedule('0 9 * * *', () => {
    runNoticeReminderJob().catch((err) => {
      console.error('[scheduler] Notice reminder job failed:', err)
      alertSchedulerFailure({ jobName: 'notice-reminder', error: err })
    })
  }, {
    timezone: process.env.APP_TIMEZONE || 'Asia/Kolkata'
  })
  console.log(`[scheduler] Notice reminder job scheduled at 9:00 AM (${process.env.APP_TIMEZONE || 'Asia/Kolkata'})`)
}

module.exports = {
  scheduleNoticeReminderJob,
  runNoticeReminderJob
}
