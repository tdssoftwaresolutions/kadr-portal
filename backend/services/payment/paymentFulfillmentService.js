const prisma = require('../../lib/prisma')
const helper = require('../../utils/helper')
const { CaseSubTypes, CaseTypes } = require('../../utils/caseConstants')
const CaseAssignmentService = require('../../utils/caseAssignment')
const { getOrCreateSettings, settingsToMap } = require('../invoice/invoiceService')
const {
  recordCaseMilestone,
  updateCaseSubStatus,
  ensureNoticePhaseComplete,
  syncMeetingScheduled
} = require('../case/caseMilestoneService')
const { PAYMENT_PURPOSES } = require('./paymentConstants')
const { activatePro, PRO_DURATION_DAYS } = require('../subscription/subscriptionService')
const {
  buildFirstMeetingCopy,
  createAndInviteCaseMeeting
} = require('../meeting/meetingInvitationService')
const { copyEmailToRepresentative, PARTY_SIDES } = require('../case/representativeService')

async function fulfillClientCasePayment ({
  caseId,
  clientId,
  paymentId,
  amount,
  currency = 'INR',
  reason,
  paymentMethod,
  referenceId
}) {
  await prisma.transactions.create({
    data: {
      payment_id: paymentId,
      client_id: clientId,
      case_id: caseId,
      success: true,
      amount,
      currency,
      reason,
      payment_method: paymentMethod,
      reference_id: referenceId,
      transaction_date: new Date()
    }
  })

  const caseDetails = await prisma.cases.findUnique({
    where: { id: caseId },
    select: {
      case_type: true,
      description: true,
      category: true,
      sub_status: true,
      caseId: true,
      evidence_document_url: true,
      user_cases_second_partyTouser: {
        select: { id: true, preferred_languages: true, name: true, state: true, email: true }
      },
      user_cases_first_partyTouser: {
        select: { id: true, state: true, email: true, preferred_languages: true, name: true }
      }
    }
  })
  if (!caseDetails) return

  if (caseDetails.sub_status === CaseSubTypes.PENDING_NOTICE_PAYMENT) {
    const uniqueSignUpLink = helper.generateUniqueSignUpLink(caseDetails.user_cases_second_partyTouser.id)
    // Build the evidence row as pre-rendered HTML so the template doesn't need
    // conditional logic. Empty string when no document was uploaded.
    const evidenceRowHtml = caseDetails.evidence_document_url
      ? `<tr>
          <td style="padding:8px 12px;color:#6b7280;font-size:14px;white-space:nowrap;vertical-align:top;">Evidence document</td>
          <td style="padding:8px 12px;font-size:14px;vertical-align:top;"><a href="${caseDetails.evidence_document_url}" target="_blank" rel="noopener noreferrer">View document</a></td>
        </tr>`
      : ''
    const noticeToSecondPartyVars = {
      recipientName: caseDetails.user_cases_second_partyTouser.name,
      firstPartyName: caseDetails.user_cases_first_partyTouser.name,
      caseId: caseDetails.caseId,
      caseType: caseDetails.case_type,
      category: caseDetails.category,
      description: caseDetails.description,
      evidenceRowHtml,
      registerUrl: uniqueSignUpLink
    }
    await helper.sendTemplatedEmail('paymentNoticeToSecondParty', caseDetails.user_cases_second_partyTouser.email, noticeToSecondPartyVars)
    await copyEmailToRepresentative({ caseId, side: PARTY_SIDES.SECOND, templateKey: 'paymentNoticeToSecondParty', variables: noticeToSecondPartyVars })

    const paymentInitiatedVars = {
      recipientName: caseDetails.user_cases_first_partyTouser.name,
      currency,
      amount,
      referenceId
    }
    await helper.sendTemplatedEmail('paymentInitiatedByFirstParty', caseDetails.user_cases_first_partyTouser.email, paymentInitiatedVars)
    await copyEmailToRepresentative({ caseId, side: PARTY_SIDES.FIRST, templateKey: 'paymentInitiatedByFirstParty', variables: paymentInitiatedVars })
    await recordCaseMilestone(prisma, { caseId, subStatusId: CaseSubTypes.PENDING_NOTICE_PAYMENT })
    await updateCaseSubStatus(prisma, caseId, {
      status: CaseTypes.IN_PROGRESS,
      sub_status: CaseSubTypes.NOTICE_SENT_TO_OPPOSITE_PARTY
    })
    await recordCaseMilestone(prisma, { caseId, subStatusId: CaseSubTypes.NOTICE_SENT_TO_OPPOSITE_PARTY })
  } else if (caseDetails.sub_status === CaseSubTypes.NOTICE_SENT_TO_OPPOSITE_PARTY) {
    await ensureNoticePhaseComplete(prisma, caseId)
    await updateCaseSubStatus(prisma, caseId, {
      status: CaseTypes.IN_PROGRESS,
      sub_status: CaseSubTypes.PENDING_MEDIATION_PAYMENT
    })
    await helper.sendTemplatedEmail('mediationAcceptanceFirstParty', caseDetails.user_cases_first_partyTouser.email, {
      recipientName: caseDetails.user_cases_first_partyTouser.name
    })
    await copyEmailToRepresentative({ caseId, side: PARTY_SIDES.FIRST, templateKey: 'mediationAcceptanceFirstParty', variables: { recipientName: caseDetails.user_cases_first_partyTouser.name } })
    await helper.sendTemplatedEmail('mediationAcceptanceSecondParty', caseDetails.user_cases_second_partyTouser.email, {
      recipientName: caseDetails.user_cases_second_partyTouser.name
    })
    await copyEmailToRepresentative({ caseId, side: PARTY_SIDES.SECOND, templateKey: 'mediationAcceptanceSecondParty', variables: { recipientName: caseDetails.user_cases_second_partyTouser.name } })
  } else if (caseDetails.sub_status === CaseSubTypes.PENDING_MEDIATION_PAYMENT) {
    await ensureNoticePhaseComplete(prisma, caseId)
    await recordCaseMilestone(prisma, { caseId, subStatusId: CaseSubTypes.PENDING_MEDIATION_PAYMENT })

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
    await recordCaseMilestone(prisma, { caseId, subStatusId: CaseSubTypes.MEDIATOR_ASSIGNED })

    const caseWithMediator = await prisma.cases.findUnique({
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

    const meetingStart = new Date()
    meetingStart.setHours(meetingStart.getHours() + 1)
    const meetingEnd = new Date(meetingStart)
    meetingEnd.setHours(meetingEnd.getHours() + 1)
    const { title, description } = buildFirstMeetingCopy({
      caseNumber: caseDetails.caseId,
      firstPartyName: caseDetails.user_cases_first_partyTouser.name,
      secondPartyName: caseDetails.user_cases_second_partyTouser.name,
      category: caseDetails.category
    })

    const currencyLabel = currency === 'INR' ? '₹' : `${currency} `
    const paidMessage = `<p>We have received your payment of ${currencyLabel}${amount}/- with reference #${referenceId} for starting mediation.</p>`
    const mediatorName = caseWithMediator?.user_cases_mediatorTouser?.name || ''

    await createAndInviteCaseMeeting({
      caseId,
      title,
      description,
      start: meetingStart,
      end: meetingEnd,
      persistEvent: true,
      notifyParties: true,
      notifyMediator: true,
      notifyAdmins: true,
      partyTemplateKey: 'mediatorAssignedMeetingScheduled',
      partyTemplateVars: {
        mediatorName
      },
      firstPartyExtraVars: {
        paidMessage
      },
      secondPartyExtraVars: {
        paidMessage: ''
      },
      mediatorTemplateKey: 'mediatorCaseAssigned',
      mediatorTemplateVars: {
        bodyHtml: `
          <p>You have been assigned as the dispute resolution expert for case <strong>${caseDetails.caseId}</strong>.</p>
          <p><strong>Parties:</strong> ${caseDetails.user_cases_first_partyTouser.name} vs ${caseDetails.user_cases_second_partyTouser.name}</p>
          <p>Your first mediation meeting has been scheduled automatically. Details:</p>
        `,
        firstPartyName: caseDetails.user_cases_first_partyTouser.name,
        secondPartyName: caseDetails.user_cases_second_partyTouser.name
      },
      caseDetails: caseWithMediator
    })

    await syncMeetingScheduled(prisma, caseId)
  }
}

async function fulfillPaymentOrder (order) {
  if (order.purpose === PAYMENT_PURPOSES.MEDIATOR_PRO) {
    await activatePro({
      mediatorId: order.user_id,
      durationDays: PRO_DURATION_DAYS,
      source: 'PAYMENT',
      amountInr: Number(order.amount),
      paymentRef: order.gateway_payment_id || order.order_id
    })
    return
  }

  const reasonMap = {
    [PAYMENT_PURPOSES.CLIENT_NOTICE]: 'Notice payment',
    [PAYMENT_PURPOSES.CLIENT_MEDIATION]: 'Mediation payment'
  }

  await fulfillClientCasePayment({
    caseId: order.case_id,
    clientId: order.user_id,
    paymentId: order.gateway_payment_id || order.order_id,
    amount: order.amount,
    currency: order.currency || 'INR',
    reason: reasonMap[order.purpose] || order.purpose,
    paymentMethod: order.gateway,
    referenceId: order.order_id
  })
}

module.exports = {
  fulfillClientCasePayment,
  fulfillPaymentOrder
}
