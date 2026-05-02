const CaseSubTypes = Object.freeze({
  MEDIATOR_ASSIGNED: 'mediator_assigned',
  MEETING_SCHEDULED: 'meeting_scheduled',
  NOTICE_SENT_TO_OPPOSITE_PARTY: 'notice_sent_to_opposite_party',
  PENDING_MEDIATION_AGREEMENT_SIGN: 'pending_mediation_agreement_sign',
  PENDING_MEDIATION_PAYMENT: 'pending_mediation_payment',
  PENDING_NOTICE_PAYMENT: 'pending_notice_payment'
})

const CaseTypes = Object.freeze({
  FAILED: 'failed',
  IN_PROGRESS: 'in_progress',
  CANCELLED: 'cancelled',
  CLOSED_NO_SUCCESS: 'closed_no_success',
  CLOSED_SUCCESS: 'closed_success',
  ESCALATED: 'escalated',
  NEW: 'new',
  ON_HOLD: 'on_hold',
  PENDING: 'pending'
})

module.exports = {
  CaseSubTypes,
  CaseTypes
}
