const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
const helper = require('../utils/helper')
const { CaseSubTypes, CaseTypes } = require('../utils/caseConstants')

module.exports = {
  setClientPayment: async function (req, res) {
    const { paymentId, clientId, caseId, success, amount, currency, reason, paymentMethod, referenceId } = req.body
    await prisma.transactions.create({
      data: {
        payment_id: paymentId,
        client_id: clientId,
        case_id: caseId,
        success,
        amount,
        currency: currency || 'INR', // Defaults to USD if not provided
        reason,
        payment_method: paymentMethod,
        reference_id: referenceId,
        transaction_date: new Date()
      }
    })

    // Get current case status
    const currentCase = await prisma.cases.findUnique({
      where: { id: caseId },
      select: { sub_status: true, first_party: true, second_party: true }
    })

    if (currentCase.sub_status === CaseSubTypes.PENDING_NOTICE_PAYMENT) {
      // First payment - send notice to opposite party
      const caseDetails = await prisma.cases.findUnique({
        where: {
          id: caseId
        },
        select: {
          user_cases_second_partyTouser: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          user_cases_first_partyTouser: {
            select: {
              name: true
            }
          }
        }
      })

      const uniqueSignUpLink = helper.generateUniqueSignUpLink(caseDetails.user_cases_second_partyTouser.id)

      const htmlBody = `
      <p>Hi ${caseDetails.user_cases_second_partyTouser.name}, we have recieved a mediation request from ${caseDetails.user_cases_first_partyTouser.name} on kADR.live.</p>
      <p>To go ahead and start the mediation, please click on below links <br/> Link to register - ${uniqueSignUpLink}</p>`
      await helper.sendEmail(caseDetails.user_cases_second_partyTouser.email, htmlBody)

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
    } else if (currentCase.sub_status === CaseSubTypes.PENDING_MEDIATION_PAYMENT) {
      // Second payment - assign mediator and schedule meeting
      // Assign random mediator
      const availableMediators = await prisma.user.findMany({
        where: {
          user_type: 'MEDIATOR',
          active: true
        },
        select: { id: true }
      })

      if (availableMediators.length > 0) {
        const randomMediator = availableMediators[Math.floor(Math.random() * availableMediators.length)]

        // Assign mediator to case
        await prisma.cases.update({
          where: { id: caseId },
          data: {
            mediator: randomMediator.id,
            sub_status: CaseSubTypes.MEDIATOR_ASSIGNED
          }
        })

        // Schedule first meeting (1 hour from now)
        const meetingStart = new Date()
        meetingStart.setHours(meetingStart.getHours() + 1)
        const meetingEnd = new Date(meetingStart)
        meetingEnd.setHours(meetingEnd.getHours() + 1)

        await prisma.events.create({
          data: {
            title: 'First Mediation Meeting',
            description: 'Initial mediation session',
            start_datetime: meetingStart,
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

        // Create notifications for both parties
        await prisma.notifications.create({
          data: {
            user_id: currentCase.first_party,
            title: 'Mediator Assigned and Meeting Scheduled',
            description: 'A mediator has been assigned to your case and the first meeting has been scheduled.'
          }
        })

        await prisma.notifications.create({
          data: {
            user_id: currentCase.second_party,
            title: 'Mediator Assigned and Meeting Scheduled',
            description: 'A mediator has been assigned to your case and the first meeting has been scheduled.'
          }
        })
      }
    }

    success(res, { message: 'Payment recorded successfully' })
  }

}
