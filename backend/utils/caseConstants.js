const CaseSubTypes = Object.freeze({
  MEDIATOR_ASSIGNED: 'mediator_assigned',
  MEETING_SCHEDULED: 'meeting_scheduled',
  NOTICE_SENT_TO_OPPOSITE_PARTY: 'notice_sent_to_opposite_party',
  PENDING_MEDIATION_AGREEMENT_SIGN: 'pending_mediation_agreement_sign',
  PENDING_MEDIATION_PAYMENT: 'pending_mediation_payment',
  PENDING_MEDIATION_PAYMENT_SECOND_PARTY: 'pending_mediation_payment_second_party',
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

// The only statuses a case is ever actually closed to (see generalController.
// markCaseResolved — the sole place a case is closed). FAILED/CANCELLED/
// ESCALATED/ON_HOLD are not written anywhere in the codebase today and are
// deliberately excluded — reminders should keep firing for them.
const CLOSED_CASE_STATUSES = Object.freeze([CaseTypes.CLOSED_SUCCESS, CaseTypes.CLOSED_NO_SUCCESS])

module.exports = {
  CaseSubTypes,
  CaseTypes,
  CLOSED_CASE_STATUSES
}
