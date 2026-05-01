const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
const helper = require('../utils/helper')
const { CaseSubTypes, CaseTypes } = require('../utils/caseConstants')
const { success } = require('../utils/responses')
const CaseAssignmentService = require('../utils/caseAssignment')

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

      const htmlBody = `
      <p>We have recieved a mediation request on <strong>Kadr.live</strong> from ${caseDetails.user_cases_first_partyTouser.name}</p>
      <p style="margin-top: 20px;"><strong>Case Details:</strong></p>
      <table style="border-collapse: collapse; width: 100%; max-width: 600px;">
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;"><strong>Case ID</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd;">${caseDetails.caseId}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;"><strong>Case Type</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd;">${caseDetails.case_type}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;"><strong>Category</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd;">${caseDetails.category}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;"><strong>Description</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd;">${caseDetails.description}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;"><strong>Evidence</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd;">
            <a href="${caseDetails.evidence_document_url}" target="_blank">View Documents</a>
          </td>
        </tr>
      </table>
      <p style="margin-top: 20px;">
        To proceed and start the process, please register using the link below:
      </p>
      <p style="text-align: center; margin: 20px 0;">
        <a href="${uniqueSignUpLink}" 
          style="background-color: #4CAF50; color: #fff; padding: 10px 18px; text-decoration: none; border-radius: 4px; display: inline-block;">
          Register Now
        </a>
      </p>`
      await helper.sendEmail(caseDetails.user_cases_second_partyTouser.name, caseDetails.user_cases_second_partyTouser.email, 'Mediation Request on Kadr.live', htmlBody)

      await helper.sendEmail(caseDetails.user_cases_first_partyTouser.name, caseDetails.user_cases_first_partyTouser.email, 'Mediation Initiated on Kadr.live',
        `
      <p>We have recieved your payment of ${currency || 'INR'}.${amount}/- with reference #id ${referenceId} for initiating mediation and sending notice to other party through <strong>Kadr.live</strong> </p>
      <p style="margin-top: 20px;">
        Notice has been sent to other party and once they accept, you'll receive a confirmation email and the process will start.
      </p>
      `
      )

      await prisma.cases.update({
        where: {
          id: caseId
        },
        data: {
          sub_status: CaseSubTypes.NOTICE_SENT_TO_OPPOSITE_PARTY
        }
      })

      // Add case history
      const caseEvent = await prisma.case_events.findFirst({
        where: {
          status_id: CaseTypes.IN_PROGRESS,
          sub_status_id: CaseSubTypes.NOTICE_SENT_TO_OPPOSITE_PARTY
        }
      })
      if (caseEvent) {
        await prisma.case_history.create({
          data: {
            case_id: caseId,
            case_event_id: caseEvent.id
          }
        })
      }
    } else if (caseDetails.sub_status === CaseSubTypes.NOTICE_SENT_TO_OPPOSITE_PARTY) {
      await prisma.cases.update({
        where: {
          id: caseId
        },
        data: {
          status: CaseTypes.IN_PROGRESS,
          sub_status: CaseSubTypes.PENDING_MEDIATION_PAYMENT
        }
      })

      await helper.sendEmail(caseDetails.user_cases_first_partyTouser.name, caseDetails.user_cases_first_partyTouser.email, 'Opposite party has accepted the mediation request',
        `<p>Opposite party has accepted the mediation request, please go ahead and make the payment to start the mediation process and for mediator to be assigned.</p></p>
`
      )

      await helper.sendEmail(caseDetails.user_cases_second_partyTouser.name, caseDetails.user_cases_second_partyTouser.email, 'You have accepted the mediation request',
        `<p>You have accepted the mediation request. Waiting for first party to make the payment to start the mediation and mediator to be assigned.</p></p>
`
      )
      // Add case history
      const caseEvent = await prisma.case_events.findFirst({
        where: {
          status_id: CaseTypes.IN_PROGRESS,
          sub_status_id: CaseSubTypes.PENDING_MEDIATION_PAYMENT
        }
      })
      if (caseEvent) {
        await prisma.case_history.create({
          data: {
            case_id: caseId,
            case_event_id: caseEvent.id
          }
        })
      }
    } else if (caseDetails.sub_status === CaseSubTypes.PENDING_MEDIATION_PAYMENT) {
      // Second payment - assign mediator and schedule meeting
      const service = new CaseAssignmentService({ prisma })
      const response = await service.assign({
        caseId: caseDetails.caseId,
        clientLanguage: caseDetails.user_cases_first_partyTouser.preferred_languages,
        clientState: caseDetails.user_cases_first_partyTouser.state,
        category: caseDetails.category
      })
      // Assign mediator to case
      await prisma.cases.update({
        where: { id: caseId },
        data: {
          mediator: response.assignedTo.id,
          sub_status: CaseSubTypes.MEDIATOR_ASSIGNED
        }
      })

      // Schedule first meeting (1 hour from now)
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

      // Add case history for mediator assignment
      const caseEvent = await prisma.case_events.findFirst({
        where: {
          status_id: CaseTypes.IN_PROGRESS,
          sub_status_id: CaseSubTypes.MEDIATOR_ASSIGNED
        }
      })
      if (caseEvent) {
        await prisma.case_history.create({
          data: {
            case_id: caseId,
            case_event_id: caseEvent.id
          }
        })
      }
      await helper.sendEmail(caseDetails.user_cases_first_partyTouser.name, caseDetails.user_cases_first_partyTouser.email, 'Mediator assigned and meeting scheduled',
          `
      <p>We have recieved your payment of ${currency || 'INR'}.${amount}/- with reference #id ${referenceId} for starting the mediation on <strong>Kadr.live</strong> </p>
      <p>A Mediator has been assigned to your case and the first meeting has been scheduled. Please find the meeting details below:</p>
      <p><strong>Meeting Link:</strong> <a href="${scheduledMeeting?.meetingLink}" target="_blank">Join Meeting</a></p>
      <p><strong>Meeting Time:</strong> ${meetingStart.toLocaleString()}</p>
      `
      )

      await helper.sendEmail(caseDetails.user_cases_second_partyTouser.name, caseDetails.user_cases_second_partyTouser.email, 'Mediator assigned and meeting scheduled',
        `<p>A Mediator has been assigned to your case and the first meeting has been scheduled. Please find the meeting details below:</p>
      <p><strong>Meeting Link:</strong> <a href="${scheduledMeeting?.meetingLink}" target="_blank">Join Meeting</a></p>
      <p><strong>Meeting Time:</strong> ${meetingStart.toLocaleString()}</p>`
      )
    }
    success(res, { message: 'Payment recorded successfully' })
  }

}
