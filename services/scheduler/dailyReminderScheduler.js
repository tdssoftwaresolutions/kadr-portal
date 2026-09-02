const cron = require('node-cron')
const prisma = require('../../lib/prisma')
const helper = require('../../utils/helper')
const { CaseSubTypes } = require('../../utils/caseConstants')
const { withSchedulerLock } = require('./schedulerLockService')
const { alertSchedulerFailure } = require('../alerting/criticalAlertService')

const DAILY_FEEDBACK_REMINDER_KEY = 'feedbackReminderDedup'

const getISTDayBounds = (offsetDays = 0) => {
  const tz = process.env.APP_TIMEZONE || 'Asia/Kolkata'
  const now = new Date()
  // Wall-clock "now" in the operational timezone
  const nowInTz = new Date(now.toLocaleString('en-US', { timeZone: tz }))
  const target = new Date(nowInTz)
  target.setDate(target.getDate() + offsetDays)
  const startLocal = new Date(target)
  startLocal.setHours(0, 0, 0, 0)
  const endLocal = new Date(target)
  endLocal.setHours(23, 59, 59, 999)

  // Convert "as if local wall time" back to UTC using current TZ offset
  const probe = new Date()
  const offsetMs =
    new Date(probe.toLocaleString('en-US', { timeZone: tz })).getTime() -
    new Date(probe.toLocaleString('en-US', { timeZone: 'UTC' })).getTime()

  return {
    startUtc: new Date(startLocal.getTime() - offsetMs),
    endUtc: new Date(endLocal.getTime() - offsetMs)
  }
}

const getRecipient = (recipientMap, user) => {
  if (!user?.id || !user?.email || user.active === false || user.is_deleted === true) return null
  if (!recipientMap.has(user.id)) {
    recipientMap.set(user.id, {
      id: user.id,
      name: user.name || 'User',
      email: user.email,
      userType: user.user_type,
      sections: {
        pendingApprovals: null,
        pendingPayments: [],
        pendingCaseAcceptance: [],
        unassignedMediatorCases: [],
        todayMeetings: [],
        pendingFeedback: [],
        pendingSignatures: []
      }
    })
  }
  return recipientMap.get(user.id)
}

const markFeedbackReminderSent = async (userId, eventId, role) => {
  await prisma.notification_send_logs.create({
    data: {
      template_key: DAILY_FEEDBACK_REMINDER_KEY,
      channel: 'EMAIL',
      user_id: userId,
      recipient: `${eventId}:${role}`,
      status: 'dedup',
      metadata: { eventId, role, purpose: 'feedback_reminder_dedup' }
    }
  })
}

const wasFeedbackReminderSent = async (userId, eventId, role) => {
  const existing = await prisma.notification_send_logs.findFirst({
    where: {
      template_key: DAILY_FEEDBACK_REMINDER_KEY,
      user_id: userId,
      recipient: `${eventId}:${role}`,
      status: 'dedup'
    },
    select: { id: true }
  })
  return Boolean(existing)
}

const buildDailyReminders = async () => {
  const recipientMap = new Map()
  const { startUtc: todayStart, endUtc: todayEnd } = getISTDayBounds(0)
  const { startUtc: yesterdayStart, endUtc: yesterdayEnd } = getISTDayBounds(-1)

  const [admins, pendingClientApprovals, pendingMediatorApprovals, pendingPaymentCases, pendingAcceptanceCases, unassignedMediatorCases, todayMeetings, feedbackCandidateMeetings, pendingSignatures] = await Promise.all([
    prisma.user.findMany({
      where: { user_type: 'ADMIN', active: true },
      select: { id: true, name: true, email: true, user_type: true, active: true }
    }),
    prisma.user.count({
      where: { user_type: 'CLIENT', active: false, is_self_signed_up: true }
    }),
    prisma.user.count({
      where: { user_type: 'MEDIATOR', active: false, is_self_signed_up: true }
    }),
    prisma.cases.findMany({
      where: {
        first_party: { not: null },
        sub_status: { in: [CaseSubTypes.PENDING_NOTICE_PAYMENT, CaseSubTypes.PENDING_MEDIATION_PAYMENT] }
      },
      select: {
        caseId: true,
        sub_status: true,
        user_cases_first_partyTouser: { select: { id: true, name: true, email: true, user_type: true, active: true } }
      }
    }),
    prisma.cases.findMany({
      where: {
        second_party: { not: null },
        sub_status: CaseSubTypes.NOTICE_SENT_TO_OPPOSITE_PARTY
      },
      select: {
        caseId: true,
        user_cases_first_partyTouser: { select: { name: true } },
        user_cases_second_partyTouser: { select: { id: true, name: true, email: true, user_type: true, active: true } }
      }
    }),
    prisma.cases.findMany({
      where: {
        mediator: null,
        status: { in: ['new', 'in_progress'] },
        updated_at: { lte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        sub_status: {
          notIn: [
            CaseSubTypes.PENDING_NOTICE_PAYMENT,
            CaseSubTypes.NOTICE_SENT_TO_OPPOSITE_PARTY
          ]
        }
      },
      select: {
        caseId: true,
        updated_at: true,
        sub_status: true
      },
      take: 50
    }),
    prisma.events.findMany({
      where: {
        type: 'KADR',
        start_datetime: { gte: todayStart, lte: todayEnd }
      },
      select: {
        id: true,
        title: true,
        description: true,
        start_datetime: true,
        end_datetime: true,
        meeting_link: true,
        cases: {
          select: {
            caseId: true,
            user_cases_mediatorTouser: { select: { id: true, name: true, email: true, user_type: true, active: true } },
            user_cases_first_partyTouser: { select: { id: true, name: true, email: true, user_type: true, active: true } },
            user_cases_second_partyTouser: { select: { id: true, name: true, email: true, user_type: true, active: true } }
          }
        }
      }
    }),
    prisma.events.findMany({
      where: {
        type: 'KADR',
        end_datetime: { gte: yesterdayStart, lte: yesterdayEnd }
      },
      select: {
        id: true,
        title: true,
        start_datetime: true,
        end_datetime: true,
        mediator_feedback_at: true,
        first_party_feedback_at: true,
        second_party_feedback_at: true,
        cases: {
          select: {
            caseId: true,
            user_cases_mediatorTouser: { select: { id: true, name: true, email: true, user_type: true, active: true } },
            user_cases_first_partyTouser: { select: { id: true, name: true, email: true, user_type: true, active: true } },
            user_cases_second_partyTouser: { select: { id: true, name: true, email: true, user_type: true, active: true } }
          }
        }
      }
    }),
    prisma.signature_tracking.findMany({
      where: {
        signed: false,
        signature_expiry: { gte: new Date() }
      },
      select: {
        user_id: true,
        cases: {
          select: {
            caseId: true,
            user_cases_first_partyTouser: { select: { id: true, name: true, email: true, user_type: true, active: true } },
            user_cases_second_partyTouser: { select: { id: true, name: true, email: true, user_type: true, active: true } },
            user_cases_mediatorTouser: { select: { id: true, name: true, email: true, user_type: true, active: true } }
          }
        }
      }
    })
  ])

  admins.forEach((admin) => {
    const recipient = getRecipient(recipientMap, admin)
    recipient.sections.pendingApprovals = {
      clients: pendingClientApprovals,
      mediators: pendingMediatorApprovals
    }
    recipient.sections.unassignedMediatorCases = unassignedMediatorCases.map((c) => ({
      caseId: c.caseId,
      subStatus: c.sub_status
    }))
    recipient.sections.todayMeetings = todayMeetings.map((meeting) => ({ ...meeting, caseId: meeting.cases?.caseId }))
  })

  pendingPaymentCases.forEach((c) => {
    const recipient = getRecipient(recipientMap, c.user_cases_first_partyTouser)
    if (!recipient) return
    const reason = c.sub_status === CaseSubTypes.PENDING_NOTICE_PAYMENT
      ? 'Notice payment pending'
      : 'Mediation payment pending'
    recipient.sections.pendingPayments.push({ caseId: c.caseId, reason })
  })

  pendingAcceptanceCases.forEach((c) => {
    const recipient = getRecipient(recipientMap, c.user_cases_second_partyTouser)
    if (!recipient) return
    recipient.sections.pendingCaseAcceptance.push({
      caseId: c.caseId,
      firstPartyName: c.user_cases_first_partyTouser?.name
    })
  })

  todayMeetings.forEach((meeting) => {
    const participants = [
      meeting.cases?.user_cases_mediatorTouser,
      meeting.cases?.user_cases_first_partyTouser,
      meeting.cases?.user_cases_second_partyTouser
    ]
    participants.forEach((user) => {
      const recipient = getRecipient(recipientMap, user)
      if (!recipient) return
      if (recipient.userType === 'ADMIN') return
      recipient.sections.todayMeetings.push({
        ...meeting,
        caseId: meeting.cases?.caseId
      })
    })
  })

  pendingSignatures.forEach((item) => {
    const users = [
      item.cases?.user_cases_first_partyTouser,
      item.cases?.user_cases_second_partyTouser,
      item.cases?.user_cases_mediatorTouser
    ]
    const matchedUser = users.find((u) => u?.id === item.user_id)
    const recipient = getRecipient(recipientMap, matchedUser)
    if (!recipient) return
    recipient.sections.pendingSignatures.push({
      caseId: item.cases?.caseId
    })
  })

  for (const event of feedbackCandidateMeetings) {
    const candidates = [
      {
        role: 'mediator',
        feedbackAt: event.mediator_feedback_at,
        user: event.cases?.user_cases_mediatorTouser
      },
      {
        role: 'first_party',
        feedbackAt: event.first_party_feedback_at,
        user: event.cases?.user_cases_first_partyTouser
      },
      {
        role: 'second_party',
        feedbackAt: event.second_party_feedback_at,
        user: event.cases?.user_cases_second_partyTouser
      }
    ]

    for (const candidate of candidates) {
      if (candidate.feedbackAt || !candidate.user?.id || !candidate.user?.email) continue
      const sent = await wasFeedbackReminderSent(candidate.user.id, event.id, candidate.role)
      if (sent) continue
      const recipient = getRecipient(recipientMap, candidate.user)
      recipient.sections.pendingFeedback.push({
        title: event.title,
        start_datetime: event.start_datetime,
        end_datetime: event.end_datetime,
        caseId: event.cases?.caseId
      })
      await markFeedbackReminderSent(candidate.user.id, event.id, candidate.role)
    }
  }

  return Array.from(recipientMap.values()).filter((recipient) => {
    const sections = recipient.sections
    if (recipient.userType === 'ADMIN') {
      return (sections.pendingApprovals && (sections.pendingApprovals.clients > 0 || sections.pendingApprovals.mediators > 0)) ||
        (sections.unassignedMediatorCases && sections.unassignedMediatorCases.length > 0) ||
        sections.todayMeetings.length
    }
    if (recipient.userType !== 'CLIENT' && recipient.userType !== 'MEDIATOR') return false
    return Boolean(
      sections.pendingPayments.length ||
      sections.pendingCaseAcceptance.length ||
      sections.todayMeetings.length ||
      sections.pendingFeedback.length ||
      sections.pendingSignatures.length
    )
  })
}

const runDailyReminderJob = async () => {
  await withSchedulerLock('daily-reminder', async () => {
    const recipients = await buildDailyReminders()
    for (const recipient of recipients) {
      await helper.sendTemplatedEmail('dailyDigest', recipient.email, {
        recipientName: recipient.name,
        sections: recipient.sections
      })
    }
    console.log(`[scheduler] Daily reminder job completed. Emails sent: ${recipients.length}`)
    return recipients.length
  }, 30 * 60 * 1000)
}

const scheduleDailyReminderJob = () => {
  cron.schedule('0 10 * * *', () => {
    runDailyReminderJob().catch((err) => {
      console.error('[scheduler] Daily reminder job failed:', err)
      alertSchedulerFailure({ jobName: 'daily-reminder', error: err })
    })
  }, {
    timezone: process.env.APP_TIMEZONE || 'Asia/Kolkata'
  })
  console.log(`[scheduler] Daily reminder job scheduled at 10:00 AM (${process.env.APP_TIMEZONE || 'Asia/Kolkata'})`)
}

module.exports = {
  scheduleDailyReminderJob,
  runDailyReminderJob
}
