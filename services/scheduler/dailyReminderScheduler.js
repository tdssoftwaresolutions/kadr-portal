const cron = require('node-cron')
const { PrismaClient } = require('@prisma/client')
const helper = require('../../utils/helper')
const { CaseSubTypes } = require('../../utils/caseConstants')

const prisma = new PrismaClient()

const DAILY_FEEDBACK_REMINDER_TITLE = 'DAILY_FEEDBACK_REMINDER'

const getISTDayBounds = (offsetDays = 0) => {
  const now = new Date()
  const nowIst = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }))
  const target = new Date(nowIst)
  target.setDate(target.getDate() + offsetDays)
  const startIst = new Date(target.setHours(0, 0, 0, 0))
  const endIst = new Date(target.setHours(23, 59, 59, 999))

  const startUtc = new Date(startIst.getTime() - (5.5 * 60 * 60 * 1000))
  const endUtc = new Date(endIst.getTime() - (5.5 * 60 * 60 * 1000))
  return { startUtc, endUtc }
}

const getRecipient = (recipientMap, user) => {
  if (!user?.id || !user?.email || user.active === false) return null
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
        todayMeetings: [],
        pendingFeedback: [],
        pendingSignatures: []
      }
    })
  }
  return recipientMap.get(user.id)
}

const markFeedbackReminderSent = async (userId, eventId, role) => {
  await prisma.notifications.create({
    data: {
      user_id: userId,
      title: DAILY_FEEDBACK_REMINDER_TITLE,
      description: `Feedback reminder sent for event ${eventId} role ${role}`
    }
  })
}

const wasFeedbackReminderSent = async (userId, eventId, role) => {
  const existing = await prisma.notifications.findFirst({
    where: {
      user_id: userId,
      title: DAILY_FEEDBACK_REMINDER_TITLE,
      description: {
        contains: `event ${eventId} role ${role}`
      }
    },
    select: { id: true }
  })
  return Boolean(existing)
}

const buildDailyReminders = async () => {
  const recipientMap = new Map()
  const { startUtc: todayStart, endUtc: todayEnd } = getISTDayBounds(0)
  const { startUtc: yesterdayStart, endUtc: yesterdayEnd } = getISTDayBounds(-1)

  const [admins, pendingClientApprovals, pendingMediatorApprovals, pendingPaymentCases, pendingAcceptanceCases, todayMeetings, feedbackCandidateMeetings, pendingSignatures] = await Promise.all([
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
  try {
    const recipients = await buildDailyReminders()
    for (const recipient of recipients) {
      await helper.sendTemplatedEmail('dailyDigest', recipient.email, {
        recipientName: recipient.name,
        sections: recipient.sections
      })
    }
    console.log(`[scheduler] Daily reminder job completed. Emails sent: ${recipients.length}`)
  } catch (error) {
    console.error('[scheduler] Daily reminder job failed', error)
  }
}

const scheduleDailyReminderJob = () => {
  cron.schedule('0 10 * * *', runDailyReminderJob, {
    timezone: 'Asia/Kolkata'
  })
  console.log('[scheduler] Daily reminder job scheduled at 10:00 AM IST')
}

module.exports = {
  scheduleDailyReminderJob,
  runDailyReminderJob
}
