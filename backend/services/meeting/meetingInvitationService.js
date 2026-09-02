const prisma = require('../../lib/prisma')
const helper = require('../../utils/helper')
const { adminHasPage } = require('../../utils/adminPermissionHelpers')

function escapeHtml (value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function buildFirstMeetingCopy ({ caseNumber, firstPartyName, secondPartyName, category }) {
  const parties = `${firstPartyName || 'First party'} vs ${secondPartyName || 'Second party'}`
  const title = `First mediation meeting — Case ${caseNumber}`
  const description = [
    `Initial mediation session for Case ${caseNumber}.`,
    `Parties: ${parties}.`,
    category ? `Category: ${category}.` : null,
    'Please join on time using the meeting link in this email.'
  ].filter(Boolean).join('\n')
  return { title, description }
}

function buildMeetingBodyHtml ({ title, start, end, caseNumber, meetingLink, mediatorName }) {
  const rows = [
    ['Meeting Title', title],
    ['Date & Time', helper.formatMeetingRangeIST(start, end)],
    ['Case Number', caseNumber]
  ]
  if (mediatorName) rows.push(['Mediator', mediatorName])

  const tableRows = rows.map(([label, value]) => `
    <tr>
      <td style="padding: 8px 0; font-weight: bold; width: 180px;">${escapeHtml(label)}:</td>
      <td style="padding: 8px 0;">${escapeHtml(value)}</td>
    </tr>`).join('')

  const joinLink = meetingLink
    ? `<p><a href="${escapeHtml(meetingLink)}">Join Meeting</a></p>`
    : ''

  return `
    <table style="width:100%; border-collapse: collapse; font-family: Arial, sans-serif; font-size: 14px; color: #333;">
      ${tableRows}
    </table>
    ${joinLink}`
}

function buildIcsAttachment ({ title, description, start, end, meetingLink, caseNumber }) {
  return {
    filename: 'meeting-invite.ics',
    content: helper.generateICS({
      uid: `${Date.now()}@kadr.live`,
      title,
      description,
      start,
      end,
      link: meetingLink,
      caseNumber
    }),
    contentType: 'text/calendar; method=REQUEST'
  }
}

async function getAdminMeetingRecipients () {
  const admins = await prisma.user.findMany({
    where: { user_type: 'ADMIN', active: true, is_deleted: false },
    select: { id: true, email: true, name: true, master: true, admin_permissions: true }
  })
  return admins.filter((admin) => {
    if (!admin.email) return false
    if (admin.master) return true
    return adminHasPage(admin, 'dashboard') || adminHasPage(admin, 'schedule') || adminHasPage(admin, 'cases')
  })
}

async function notifyAdminsMeetingScheduled ({
  caseNumber,
  title,
  description,
  start,
  end,
  meetingLink,
  firstPartyName,
  secondPartyName,
  mediatorName
}) {
  const admins = await getAdminMeetingRecipients()
  if (!admins.length) return

  const meetingBodyHtml = buildMeetingBodyHtml({
    title,
    start,
    end,
    caseNumber,
    meetingLink,
    mediatorName
  })
  const bodyHtml = `
    <p>A mediation meeting has been scheduled.</p>
    <p><strong>Parties:</strong> ${escapeHtml(firstPartyName || '-')} vs ${escapeHtml(secondPartyName || '-')}</p>
    ${mediatorName ? `<p><strong>Mediator:</strong> ${escapeHtml(mediatorName)}</p>` : ''}
    ${meetingBodyHtml}
    ${description ? `<p><strong>Description:</strong> ${escapeHtml(description)}</p>` : ''}
  `

  await Promise.all(
    admins.map((admin) =>
      helper.sendTemplatedEmail('meetingScheduledAdmin', admin.email, {
        recipientName: admin.name,
        caseId: caseNumber,
        title,
        bodyHtml
      }).catch((err) => {
        console.error('[meetingInvitation] admin email failed', admin.email, err.message)
      })
    )
  )
}

/**
 * Schedule a Zoom meeting, optionally persist an events row, and email parties / mediator / admins.
 */
async function createAndInviteCaseMeeting ({
  caseId,
  title,
  description,
  start,
  end,
  createdBy = null,
  persistEvent = true,
  notifyParties = true,
  notifyMediator = true,
  notifyAdmins = true,
  partyTemplateKey = 'meetingInvite',
  partyTemplateVars = {},
  firstPartyExtraVars = {},
  secondPartyExtraVars = {},
  mediatorTemplateKey = 'meetingInvite',
  mediatorTemplateVars = {},
  caseDetails = null
}) {
  const { parseLocalDateTime } = require('../../utils/datetime')
  const startDate = parseLocalDateTime(start)
  const endDate = parseLocalDateTime(end)
  if (!startDate || !endDate) {
    throw new Error('Invalid meeting start/end datetime')
  }

  const caseRecord = caseDetails || await prisma.cases.findUnique({
    where: { id: caseId },
    select: {
      id: true,
      caseId: true,
      category: true,
      user_cases_first_partyTouser: { select: { email: true, name: true } },
      user_cases_second_partyTouser: { select: { email: true, name: true } },
      user_cases_mediatorTouser: { select: { email: true, name: true } }
    }
  })
  if (!caseRecord) throw new Error(`Case not found: ${caseId}`)

  const firstParty = caseRecord.user_cases_first_partyTouser
  const secondParty = caseRecord.user_cases_second_partyTouser
  const mediator = caseRecord.user_cases_mediatorTouser
  const caseNumber = caseRecord.caseId

  const attendees = []
  if (firstParty?.email) attendees.push({ email: firstParty.email })
  if (secondParty?.email) attendees.push({ email: secondParty.email })
  if (mediator?.email) attendees.push({ email: mediator.email })

  const scheduledMeeting = await helper.scheduleMeeting(title, description, startDate, attendees)
  const meetingLink = scheduledMeeting?.meetingLink || ''

  const googleCalendarLink = helper.generateGoogleCalendarLink({
    title,
    description,
    start: startDate,
    end: endDate,
    link: meetingLink,
    caseNumber
  })
  const attachments = [buildIcsAttachment({
    title,
    description,
    start: startDate,
    end: endDate,
    meetingLink,
    caseNumber
  })]

  const scheduleRange = helper.formatMeetingRangeIST(startDate, endDate)
  const meetingBodyHtml = buildMeetingBodyHtml({
    title,
    start: startDate,
    end: endDate,
    caseNumber,
    meetingLink,
    mediatorName: mediator?.name
  })

  const baseInviteVars = {
    caseId: caseNumber,
    title,
    meetingType: 'KADR',
    description,
    scheduleRange,
    googleCalendarLink,
    meetingLink,
    mediatorName: mediator?.name || '',
    meetingBodyHtml,
    firstPartyName: firstParty?.name || '',
    secondPartyName: secondParty?.name || ''
  }

  const emailJobs = []

  if (notifyParties) {
    if (firstParty?.email) {
      emailJobs.push(
        helper.sendTemplatedEmail(partyTemplateKey, firstParty.email, {
          recipientName: firstParty.name,
          ...baseInviteVars,
          ...partyTemplateVars,
          ...firstPartyExtraVars
        }, attachments)
      )
    }
    if (secondParty?.email) {
      emailJobs.push(
        helper.sendTemplatedEmail(partyTemplateKey, secondParty.email, {
          recipientName: secondParty.name,
          ...baseInviteVars,
          ...partyTemplateVars,
          ...secondPartyExtraVars
        }, attachments)
      )
    }
  }

  if (notifyMediator && mediator?.email) {
    emailJobs.push(
      helper.sendTemplatedEmail(mediatorTemplateKey, mediator.email, {
        recipientName: mediator.name,
        ...baseInviteVars,
        ...mediatorTemplateVars
      }, attachments)
    )
  }

  await Promise.all(
    emailJobs.map((job) =>
      job.catch((err) => {
        console.error('[meetingInvitation] invite email failed', err.message)
      })
    )
  )

  if (notifyAdmins) {
    await notifyAdminsMeetingScheduled({
      caseNumber,
      title,
      description,
      start: startDate,
      end: endDate,
      meetingLink,
      firstPartyName: firstParty?.name,
      secondPartyName: secondParty?.name,
      mediatorName: mediator?.name
    }).catch((err) => {
      console.warn('[meetingInvitation] admin notify skipped:', err.message)
    })
  }

  let event = null
  if (persistEvent) {
    event = await prisma.events.create({
      data: {
        title,
        description,
        start_datetime: startDate,
        end_datetime: endDate,
        type: 'KADR',
        meeting_link: meetingLink,
        created_by: createdBy || null,
        case_id: caseId
      }
    })
  }

  return {
    meetingLink,
    meetingId: scheduledMeeting?.meetingId || null,
    event,
    title,
    description,
    caseNumber,
    mediatorName: mediator?.name || null,
    meetingBodyHtml,
    attachments
  }
}

async function emailMediatorCaseAssigned ({
  mediatorEmail,
  mediatorName,
  caseNumber,
  firstPartyName,
  secondPartyName,
  category = null,
  isReassignment = false
}) {
  if (!mediatorEmail) return
  const action = isReassignment ? 'reassigned' : 'assigned'
  const bodyHtml = `
    <p>You have been ${action} as the dispute resolution expert for case <strong>${escapeHtml(caseNumber)}</strong>.</p>
    <p><strong>Parties:</strong> ${escapeHtml(firstPartyName || '-')} vs ${escapeHtml(secondPartyName || '-')}</p>
    ${category ? `<p><strong>Category:</strong> ${escapeHtml(category)}</p>` : ''}
    <p>Please sign in to the Kadr portal to review the case and schedule meetings as needed.</p>
  `
  await helper.sendTemplatedEmail('mediatorCaseAssigned', mediatorEmail, {
    recipientName: mediatorName,
    caseId: caseNumber,
    firstPartyName: firstPartyName || '',
    secondPartyName: secondPartyName || '',
    bodyHtml
  })
}

async function emailPartiesMediatorAssigned ({
  parties = [],
  mediatorName,
  caseNumber
}) {
  await Promise.all(
    parties
      .filter((p) => p?.email)
      .map((party) =>
        helper.sendTemplatedEmail('caseMediatorAssigned', party.email, {
          recipientName: party.name,
          caseId: caseNumber,
          mediatorName: mediatorName || 'your assigned mediator',
          bodyHtml: `
            <p>A dispute resolution expert (<strong>${escapeHtml(mediatorName || 'assigned')}</strong>) has been assigned to case <strong>${escapeHtml(caseNumber)}</strong>.</p>
            <p>You will receive a separate email when a mediation meeting is scheduled.</p>
          `
        }).catch((err) => {
          console.error('[meetingInvitation] party assignment email failed', party.email, err.message)
        })
      )
  )
}

module.exports = {
  buildFirstMeetingCopy,
  buildMeetingBodyHtml,
  createAndInviteCaseMeeting,
  notifyAdminsMeetingScheduled,
  emailMediatorCaseAssigned,
  emailPartiesMediatorAssigned,
  getAdminMeetingRecipients
}
