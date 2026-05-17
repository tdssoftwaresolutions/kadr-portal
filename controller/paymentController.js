const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
const helper = require('../utils/helper')
const { CaseSubTypes, CaseTypes } = require('../utils/caseConstants')
const { success } = require('../utils/responses')
const CaseAssignmentService = require('../utils/caseAssignment')
const { getOrCreateSettings, settingsToMap } = require('../services/invoice/invoiceService')
const {
  recordCaseMilestone,
  updateCaseSubStatus,
  ensureNoticePhaseComplete,
  syncMeetingScheduled
} = require('../services/case/caseMilestoneService')

module.exports = {
  setClientPayment: async function (req, res) {
    const { paymentId, clientId, caseId, status, amount, currency, reason, paymentMethod, referenceId } = req.body
    await prisma.transactions.create({
      data: {
        payment_id: paymentId,
        client_id: clientId,
        case_id: caseId,
        success: status === 'success',
        amount,
        currency: currency || 'INR', // Defaults to USD if not provided
        reason,
        payment_method: paymentMethod,
        reference_id: referenceId,
        transaction_date: new Date()
      }
    })

    const caseDetails = await prisma.cases.findUnique({
      where: {
        id: caseId
      },
      select: {
        case_type: true,
        description: true,
        category: true,
        sub_status: true,
        caseId: true,
        evidence_document_url: true,
        user_cases_second_partyTouser: {
          select: {
            id: true,
            preferred_languages: true,
            name: true,
            state: true,
            email: true
          }
        },
        user_cases_first_partyTouser: {
          select: {
            id: true,
            state: true,
            email: true,
            preferred_languages: true,
            name: true
          }
        }
      }
    })

    if (caseDetails.sub_status === CaseSubTypes.PENDING_NOTICE_PAYMENT) {
      // First payment - send notice to opposite party
      const uniqueSignUpLink = helper.generateUniqueSignUpLink(caseDetails.user_cases_second_partyTouser.id)

      await helper.sendTemplatedEmail('paymentNoticeToSecondParty', caseDetails.user_cases_second_partyTouser.email, {
        recipientName: caseDetails.user_cases_second_partyTouser.name,
        firstPartyName: caseDetails.user_cases_first_partyTouser.name,
        caseId: caseDetails.caseId,
        caseType: caseDetails.case_type,
        category: caseDetails.category,
        description: caseDetails.description,
        evidenceUrl: caseDetails.evidence_document_url,
        registerUrl: uniqueSignUpLink
      })

      await helper.sendTemplatedEmail('paymentInitiatedByFirstParty', caseDetails.user_cases_first_partyTouser.email, {
        recipientName: caseDetails.user_cases_first_partyTouser.name,
        currency: currency || 'INR',
        amount,
        referenceId
      })

      await recordCaseMilestone(prisma, {
        caseId,
        subStatusId: CaseSubTypes.PENDING_NOTICE_PAYMENT
      })

      await updateCaseSubStatus(prisma, caseId, {
        status: CaseTypes.IN_PROGRESS,
        sub_status: CaseSubTypes.NOTICE_SENT_TO_OPPOSITE_PARTY
      })

      await recordCaseMilestone(prisma, {
        caseId,
        subStatusId: CaseSubTypes.NOTICE_SENT_TO_OPPOSITE_PARTY
      })
    } else if (caseDetails.sub_status === CaseSubTypes.NOTICE_SENT_TO_OPPOSITE_PARTY) {
      await ensureNoticePhaseComplete(prisma, caseId)

      await updateCaseSubStatus(prisma, caseId, {
        status: CaseTypes.IN_PROGRESS,
        sub_status: CaseSubTypes.PENDING_MEDIATION_PAYMENT
      })

      await helper.sendTemplatedEmail('mediationAcceptanceFirstParty', caseDetails.user_cases_first_partyTouser.email, {
        recipientName: caseDetails.user_cases_first_partyTouser.name
      })

      await helper.sendTemplatedEmail('mediationAcceptanceSecondParty', caseDetails.user_cases_second_partyTouser.email, {
        recipientName: caseDetails.user_cases_second_partyTouser.name
      })
    } else if (caseDetails.sub_status === CaseSubTypes.PENDING_MEDIATION_PAYMENT) {
      await ensureNoticePhaseComplete(prisma, caseId)

      await recordCaseMilestone(prisma, {
        caseId,
        subStatusId: CaseSubTypes.PENDING_MEDIATION_PAYMENT
      })

      const service = new CaseAssignmentService({ prisma })
      const response = await service.assign({
        caseId: caseDetails.caseId,
        clientLanguage: caseDetails.user_cases_first_partyTouser.preferred_languages,
        clientState: caseDetails.user_cases_first_partyTouser.state,
        category: caseDetails.category
      })
      const settingsRows = await getOrCreateSettings()
      const settingsMap = settingsToMap(settingsRows)

      await prisma.cases.update({
        where: { id: caseId },
        data: {
          mediator: response.assignedTo.id,
          mediator_commission: Number(settingsMap.mediator_commission || 5),
          sub_status: CaseSubTypes.MEDIATOR_ASSIGNED
        }
      })

      await recordCaseMilestone(prisma, {
        caseId,
        subStatusId: CaseSubTypes.MEDIATOR_ASSIGNED
      })

      const meetingStart = new Date()
      meetingStart.setHours(meetingStart.getHours() + 1)
      const meetingEnd = new Date(meetingStart)
      meetingEnd.setHours(meetingEnd.getHours() + 1)
      const title = 'First Mediation Meeting'
      const description = 'Initial mediation session'
      const scheduledMeeting = await helper.scheduleMeeting(title, description, meetingStart, meetingEnd)

      await prisma.events.create({
        data: {
          title,
          description,
          start_datetime: meetingStart,
          meeting_link: scheduledMeeting?.meetingLink,
          end_datetime: meetingEnd,
          type: 'KADR',
          cases: {
            connect: {
              id: caseId
            }
          }
        }
      })

      await syncMeetingScheduled(prisma, caseId)

      const google_calendar_link = helper.generateGoogleCalendarLink({
        title,
        description,
        start: meetingStart,
        end: meetingEnd,
        link: scheduledMeeting?.meetingLink,
        caseNumber: caseDetails.caseId
      })
      const attachments = [
        {
          filename: 'meeting-invite.ics',
          content: helper.generateICS({
            uid: `${Date.now()}@kadr.live`,
            title,
            description,
            start: meetingStart,
            end: meetingEnd,
            link: scheduledMeeting?.meetingLink,
            caseNumber: caseDetails.caseId
          }),
          contentType: 'text/calendar; method=REQUEST'
        }
      ]

      const meetingBody = `
          <table style="width:100%; border-collapse: collapse; font-family: Arial, sans-serif; font-size: 14px; color: #333;">
          <tr>
            <td style="padding: 8px 0; font-weight: bold; width: 180px;">Meeting Title:</td>
            <td style="padding: 8px 0;">${title}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold;">Date & Time:</td>
            <td style="padding: 8px 0;">${helper.formatMeetingRangeIST(meetingStart, meetingEnd)}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold;">Case Number:</td>
            <td style="padding: 8px 0;">${caseDetails.caseId}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold;">Description:</td>
            <td style="padding: 8px 0;">${description}</td>
          </tr>
        </table>
        <p style="margin-top:20px;">
          <a href="${google_calendar_link}" 
            style="display:inline-block;padding:10px 16px;background:#0b57d0;color:#fff;text-decoration:none;border-radius:4px;">
            Add to Google Calendar
          </a>
        </p>
        <p style="margin-top: 20px;">
          You can join the meeting using the link below:
        </p>
        <p>
          <a href="${scheduledMeeting?.meetingLink}" 
            style="display: inline-block; padding: 10px 16px; background-color: #1a73e8; color: #ffffff; text-decoration: none; border-radius: 4px;">
            Join Meeting
          </a>
        </p>
        <p>If the button above doesn’t work, copy and paste this link into your browser:</p>
        <p style="word-break: break-all;">${scheduledMeeting?.meetingLink}</p>
        <p>We look forward to your participation.</p>
      `

      await helper.sendTemplatedEmail('mediatorAssignedMeetingScheduled', caseDetails.user_cases_first_partyTouser.email, {
        recipientName: caseDetails.user_cases_first_partyTouser.name,
        paidMessage: `<p>We have received your payment of ${currency || 'INR'}.${amount}/- with reference #${referenceId} for starting mediation.</p>`,
        meetingBodyHtml: meetingBody
      }, attachments)

      await helper.sendTemplatedEmail('mediatorAssignedMeetingScheduled', caseDetails.user_cases_second_partyTouser.email, {
        recipientName: caseDetails.user_cases_second_partyTouser.name,
        meetingBodyHtml: meetingBody
      }, attachments)
    }
    success(res, { message: 'Payment recorded successfully' })
  }

}
