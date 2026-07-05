/**
 * User-facing mediation phases. Maps internal case_events (by sub_status / status) into phases.
 * Adjust matchers when new case_events rows are added in the database.
 */
const PHASE_DEFINITIONS = [
  {
    id: 'filed',
    label: 'Case filed',
    icon: 'ri-file-add-line',
    statusIds: ['new', 'pending'],
    subStatusIds: []
  },
  {
    id: 'notice',
    label: 'Notice & opposite party',
    icon: 'ri-mail-send-line',
    statusIds: ['in_progress'],
    subStatusIds: ['pending_notice_payment', 'notice_sent_to_opposite_party']
  },
  {
    id: 'setup',
    label: 'Mediation setup',
    icon: 'ri-user-shared-line',
    statusIds: ['in_progress'],
    subStatusIds: ['pending_mediation_payment', 'mediator_assigned']
  },
  {
    id: 'meetings',
    label: 'Mediation meetings',
    icon: 'ri-calendar-event-line',
    statusIds: ['in_progress'],
    subStatusIds: ['meeting_scheduled']
  },
  {
    id: 'agreement',
    label: 'Agreement & signatures',
    icon: 'ri-quill-pen-line',
    statusIds: ['in_progress'],
    subStatusIds: ['pending_mediation_agreement_sign']
  },
  {
    id: 'closed',
    label: 'Case closed',
    icon: 'ri-checkbox-circle-line',
    statusIds: ['closed_success', 'closed_no_success', 'cancelled', 'failed', 'escalated', 'on_hold'],
    subStatusIds: []
  }
]

/** Sub-status / event hints for activity log labels */
const SUB_STATUS_LABELS = {
  pending_notice_payment: 'Notice payment',
  notice_sent_to_opposite_party: 'Notice sent to opposite party',
  pending_mediation_payment: 'Mediation fee payment',
  mediator_assigned: 'Mediator assigned',
  meeting_scheduled: 'Meeting scheduled',
  pending_mediation_agreement_sign: 'Agreement signatures'
}

module.exports = {
  PHASE_DEFINITIONS,
  SUB_STATUS_LABELS
}
