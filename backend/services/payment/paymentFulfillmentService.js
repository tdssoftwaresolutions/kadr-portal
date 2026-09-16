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
const { sendNoticeEmailsToSecondParty } = require('../case/noticeEmailService')
const analytics = require('../../utils/analytics')

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

  // Product analytics: transaction volume/value over time, by gateway/purpose.
  // Money detail of record stays in the DB (transactions table).
  analytics.trackPaymentSucceeded({
    payerUserId: clientId,
    amount,
    currency,
    gateway: paymentMethod,
    purpose: reason,
    caseId,
    transactionId: paymentId
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
    await sendNoticeEmailsToSecondParty({ caseId, caseDetails })

    const paymentInitiatedVars = {
      recipientName: caseDetails.user_cases_first_partyTouser.name,
      currency,
      amount,
      referenceId
    }
    await helper.sendTemplatedEmail('paymentInitiatedByFirstParty', caseDetails.user_cases_first_partyTouser.email, paymentInitiatedVars, [], { caseId })
    await copyEmailToRepresentative({ caseId, side: PARTY_SIDES.FIRST, templateKey: 'paymentInitiatedByFirstParty', variables: paymentInitiatedVars })
    await recordCaseMilestone(prisma, { caseId, subStatusId: CaseSubTypes.PENDING_NOTICE_PAYMENT })
    await updateCaseSubStatus(prisma, caseId, {
      status: CaseTypes.IN_PROGRESS,
      sub_status: CaseSubTypes.NOTICE_SENT_TO_OPPOSITE_PARTY
    })
    await recordCaseMilestone(prisma, { caseId, subStatusId: CaseSubTypes.NOTICE_SENT_TO_OPPOSITE_PARTY })
  } else if (caseDetails.sub_status === CaseSubTypes.PENDING_MEDIATION_PAYMENT) {
    // First party's mediation fee. Acceptance itself (NOTICE_SENT_TO_OPPOSITE_PARTY ->
    // PENDING_MEDIATION_PAYMENT) is now free and handled by generalController.acceptMediationRequest,
    // so this branch only ever fires for the first party's payment here on.
    if (clientId !== caseDetails.user_cases_first_partyTouser.id) {
      console.error('[paymentFulfillment] unexpected payer for PENDING_MEDIATION_PAYMENT', { caseId, clientId })
      return
    }
    await ensureNoticePhaseComplete(prisma, caseId)
    await recordCaseMilestone(prisma, { caseId, subStatusId: CaseSubTypes.PENDING_MEDIATION_PAYMENT })
    await updateCaseSubStatus(prisma, caseId, {
      status: CaseTypes.IN_PROGRESS,
      sub_status: CaseSubTypes.PENDING_MEDIATION_PAYMENT_SECOND_PARTY
    })
    await recordCaseMilestone(prisma, { caseId, subStatusId: CaseSubTypes.PENDING_MEDIATION_PAYMENT_SECOND_PARTY })

    const firstPartyVars = {
      recipientName: caseDetails.user_cases_first_partyTouser.name,
      currency,
      amount,
      referenceId
    }
    await helper.sendTemplatedEmail('mediationFeeFirstPartyPaidAwaitingSecond', caseDetails.user_cases_first_partyTouser.email, firstPartyVars, [], { caseId })
    await copyEmailToRepresentative({ caseId, side: PARTY_SIDES.FIRST, templateKey: 'mediationFeeFirstPartyPaidAwaitingSecond', variables: firstPartyVars })

    const secondPartyVars = { recipientName: caseDetails.user_cases_second_partyTouser.name }
    await helper.sendTemplatedEmail('mediationFeeSecondPartyActionNeeded', caseDetails.user_cases_second_partyTouser.email, secondPartyVars, [], { caseId })
    await copyEmailToRepresentative({ caseId, side: PARTY_SIDES.SECOND, templateKey: 'mediationFeeSecondPartyActionNeeded', variables: secondPartyVars })
  } else if (caseDetails.sub_status === CaseSubTypes.PENDING_MEDIATION_PAYMENT_SECOND_PARTY) {
    // Second party's mediation fee — this is what now triggers mediator assignment
    // and first-meeting scheduling (previously done immediately after the single,
    // first-party-only mediation payment).
    if (clientId !== caseDetails.user_cases_second_partyTouser.id) {
      console.error('[paymentFulfillment] unexpected payer for PENDING_MEDIATION_PAYMENT_SECOND_PARTY', { caseId, clientId })
      return
    }
    await recordCaseMilestone(prisma, { caseId, subStatusId: CaseSubTypes.PENDING_MEDIATION_PAYMENT_SECOND_PARTY })

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

    // Auto-scheduled for a random 30-minute-aligned slot tomorrow, 9 AM-6 PM
    // IST, rather than a fixed offset from "now" — gives parties/mediator a
    // reasonable heads-up and lands on a normal working-hours time.
    const { pickNextDayMeetingSlot } = require('../../utils/datetime')
    const { start: meetingStart, end: meetingEnd } = pickNextDayMeetingSlot({ durationMinutes: 60 })
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

    analytics.trackPaymentSucceeded({
      payerUserId: order.user_id,
      amount: order.amount,
      currency: order.currency || 'INR',
      gateway: order.gateway,
      purpose: order.purpose,
      transactionId: order.gateway_payment_id || order.order_id
    })
    analytics.trackSubscriptionActivated({
      userId: order.user_id,
      amount: order.amount,
      currency: order.currency || 'INR',
      source: 'PAYMENT',
      durationDays: PRO_DURATION_DAYS
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
