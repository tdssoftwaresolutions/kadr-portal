const { PHASE_DEFINITIONS, SUB_STATUS_LABELS } = require('../../config/caseProgressPhases')
const { CaseSubTypes } = require('../../utils/caseConstants')

function normalizeId (value) {
  return value == null ? '' : String(value).toLowerCase()
}

function resolveViewerRole (caseItem, viewer = {}) {
  const viewerId = viewer.userId || viewer.id
  const viewerType = (viewer.type || viewer.userType || '').toUpperCase()
  const firstPartyId = caseItem.first_party || caseItem.user_cases_first_partyTouser?.id
  const secondPartyId = caseItem.second_party || caseItem.user_cases_second_partyTouser?.id
  const firstPartyRepId = caseItem.first_party_representative || caseItem.user_cases_first_party_repTouser?.id
  const secondPartyRepId = caseItem.second_party_representative || caseItem.user_cases_second_party_repTouser?.id
  if (viewerType === 'MEDIATOR') return 'mediator'
  if (viewerType === 'ADMIN') return 'admin'
  if (viewerId && normalizeId(firstPartyId) === normalizeId(viewerId)) return 'first_party'
  if (viewerId && normalizeId(secondPartyId) === normalizeId(viewerId)) return 'second_party'
  // A representative inherits the effective role of the party they represent so
  // all downstream action-card logic treats them identically to that party.
  if (viewerId && normalizeId(firstPartyRepId) === normalizeId(viewerId)) return 'first_party'
  if (viewerId && normalizeId(secondPartyRepId) === normalizeId(viewerId)) return 'second_party'
  return 'observer'
}

/**
 * Whether the viewer is a representative on this case, and which party side they
 * represent ('first_party'|'second_party'|null). Used by the UI to show the
 * "you are tagged as Representative" label instead of the party label.
 */
function resolveRepresentativeContext (caseItem, viewer = {}) {
  const viewerId = viewer.userId || viewer.id
  if (!viewerId) return { isRepresentative: false, representingSide: null }
  const firstPartyRepId = caseItem.first_party_representative || caseItem.user_cases_first_party_repTouser?.id
  const secondPartyRepId = caseItem.second_party_representative || caseItem.user_cases_second_party_repTouser?.id
  if (normalizeId(firstPartyRepId) === normalizeId(viewerId)) {
    return { isRepresentative: true, representingSide: 'first_party' }
  }
  if (normalizeId(secondPartyRepId) === normalizeId(viewerId)) {
    return { isRepresentative: true, representingSide: 'second_party' }
  }
  return { isRepresentative: false, representingSide: null }
}

function getAgreementStatus (caseItem) {
  const tracking = caseItem.case_agreement_tracking
  if (!tracking) return null
  if (tracking.first_party_signature_datetime && tracking.second_party_signature_datetime) {
    return 'signed'
  }
  if (tracking.first_party_signature_datetime || tracking.second_party_signature_datetime) {
    return 'partial_signature'
  }
  return 'pending_signature'
}

function phaseForCase (caseItem) {
  const statusId = normalizeId(caseItem.case_statuses?.id || caseItem.status)
  const subStatusId = normalizeId(caseItem.case_sub_statuses?.id || caseItem.sub_status)

  for (let i = PHASE_DEFINITIONS.length - 1; i >= 0; i--) {
    const phase = PHASE_DEFINITIONS[i]
    if (phase.subStatusIds.some((id) => normalizeId(id) === subStatusId)) return phase.id
    if (phase.statusIds.some((id) => normalizeId(id) === statusId) && phase.subStatusIds.length === 0) {
      if (phase.id === 'closed') return phase.id
    }
  }

  for (const phase of PHASE_DEFINITIONS) {
    if (phase.subStatusIds.some((id) => normalizeId(id) === subStatusId)) return phase.id
    if (phase.statusIds.some((id) => normalizeId(id) === statusId) && !phase.subStatusIds.length) {
      return phase.id
    }
  }

  if (statusId.includes('closed')) return 'closed'
  return 'filed'
}

function historyByEventId (caseItem) {
  const map = new Map()
  ;(caseItem.case_history || []).forEach((row) => {
    const id = row.case_event_id || row.case_events?.id
    if (id) map.set(id, row.created_at || row.created_date)
  })
  return map
}

function isPhaseComplete (phaseId, caseItem, caseEvents, historyMap, currentPhaseId) {
  const phaseIndex = PHASE_DEFINITIONS.findIndex((p) => p.id === phaseId)
  const currentIndex = PHASE_DEFINITIONS.findIndex((p) => p.id === currentPhaseId)
  if (phaseIndex < 0 || currentIndex < 0) return false
  if (phaseIndex < currentIndex) return true
  if (phaseId === currentPhaseId) return false

  const phase = PHASE_DEFINITIONS[phaseIndex]
  const relatedEvents = caseEvents.filter((ev) => {
    const sub = normalizeId(ev.sub_status_id)
    const st = normalizeId(ev.status_id)
    return phase.subStatusIds.includes(sub) ||
      (phase.statusIds.includes(st) && !phase.subStatusIds.length)
  })

  if (!relatedEvents.length) return phaseIndex < currentIndex

  return relatedEvents.every((ev) => historyMap.has(ev.id))
}

function buildPhaseSteps (caseItem, caseEvents, currentPhaseId, historyMap) {
  return PHASE_DEFINITIONS.map((phase) => {
    const complete = isPhaseComplete(phase.id, caseItem, caseEvents, historyMap, currentPhaseId)
    const active = phase.id === currentPhaseId
    let state = 'upcoming'
    if (complete) state = 'done'
    else if (active) state = 'active'

    return {
      id: phase.id,
      label: phase.label,
      icon: phase.icon,
      state
    }
  })
}

function buildNowCard (caseItem, viewerRole) {
  const statusId = normalizeId(caseItem.case_statuses?.id || caseItem.status)
  const subStatusId = normalizeId(caseItem.case_sub_statuses?.id || caseItem.sub_status)
  const agreementStatus = getAgreementStatus(caseItem)
  const mediatorName = caseItem.user_cases_mediatorTouser?.name
  const oppositeName = viewerRole === 'first_party'
    ? caseItem.user_cases_second_partyTouser?.name
    : caseItem.user_cases_first_partyTouser?.name

  if (statusId === 'closed_success' || statusId === 'closed_no_success') {
    return {
      headline: statusId === 'closed_success' ? 'Case closed successfully' : 'Case closed without settlement',
      description: 'This mediation is complete. Review meetings and documents in the activity log below.',
      tone: statusId === 'closed_success' ? 'success' : 'muted',
      actionKey: null,
      actionLabel: null,
      waitingOn: null
    }
  }

  if (subStatusId === CaseSubTypes.PENDING_NOTICE_PAYMENT) {
    if (viewerRole === 'first_party') {
      return {
        headline: 'Pay notice fee to continue',
        description: 'The legal notice to the opposite party is sent after this payment (₹1,000).',
        tone: 'action',
        actionKey: 'notice_payment',
        actionLabel: 'Pay ₹1,000',
        waitingOn: null
      }
    }
    return {
      headline: 'Waiting for notice payment',
      description: 'The initiating party must pay the notice fee before the notice can be dispatched.',
      tone: 'waiting',
      actionKey: null,
      actionLabel: null,
      waitingOn: 'first_party'
    }
  }

  if (subStatusId === CaseSubTypes.NOTICE_SENT_TO_OPPOSITE_PARTY) {
    if (viewerRole === 'second_party') {
      return {
        headline: 'Your response is needed',
        description: 'Review the mediation notice and accept to join the process (₹1,000 notice fee).',
        tone: 'action',
        actionKey: 'accept_mediation',
        actionLabel: 'Review & accept',
        waitingOn: null
      }
    }
    return {
      headline: 'Waiting for opposite party',
      description: oppositeName
        ? `Waiting for ${oppositeName} to accept the mediation notice.`
        : 'Waiting for the opposite party to accept the mediation notice.',
      tone: 'waiting',
      actionKey: null,
      actionLabel: null,
      waitingOn: 'second_party'
    }
  }

  if (subStatusId === CaseSubTypes.PENDING_MEDIATION_PAYMENT) {
    if (viewerRole === 'first_party') {
      return {
        headline: 'Pay mediation fee',
        description: 'Pay ₹5,000 to assign a mediator and schedule sessions.',
        tone: 'action',
        actionKey: 'mediation_payment',
        actionLabel: 'Pay ₹5,000',
        waitingOn: null
      }
    }
    return {
      headline: 'Waiting for mediation fee',
      description: 'The initiating party must pay the mediation fee before a mediator is assigned.',
      tone: 'waiting',
      actionKey: null,
      actionLabel: null,
      waitingOn: 'first_party'
    }
  }

  if (subStatusId === CaseSubTypes.MEDIATOR_ASSIGNED || (statusId === 'in_progress' && mediatorName && subStatusId !== CaseSubTypes.MEETING_SCHEDULED)) {
    if (viewerRole === 'mediator') {
      return {
        headline: 'You are assigned to this case',
        description: 'Schedule mediation meetings and guide both parties toward resolution.',
        tone: 'info',
        actionKey: 'schedule_meeting',
        actionLabel: 'Schedule meeting',
        waitingOn: null
      }
    }
    return {
      headline: mediatorName ? `Mediator ${mediatorName} assigned` : 'Mediator assigned',
      description: 'Meetings will be scheduled soon. Check the Meetings section for updates.',
      tone: 'info',
      actionKey: null,
      actionLabel: null,
      waitingOn: null
    }
  }

  if (subStatusId === CaseSubTypes.MEETING_SCHEDULED) {
    const nextMeeting = (caseItem.events || [])
      .filter((e) => e.start_datetime && new Date(e.start_datetime) > new Date())
      .sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime))[0]
    return {
      headline: nextMeeting ? 'Upcoming mediation meeting' : 'Mediation in progress',
      description: nextMeeting
        ? `"${nextMeeting.title || 'Session'}" — ${formatDisplayDate(nextMeeting.start_datetime)}`
        : 'Sessions are being scheduled. See Meetings for details.',
      tone: 'info',
      actionKey: nextMeeting?.meeting_link ? 'join_meeting' : null,
      actionLabel: nextMeeting?.meeting_link ? 'Join meeting' : null,
      waitingOn: null,
      meetingLink: nextMeeting?.meeting_link || null
    }
  }

  if (agreementStatus === 'pending_signature' || subStatusId === CaseSubTypes.PENDING_MEDIATION_AGREEMENT_SIGN) {
    return {
      headline: 'Sign mediation agreement',
      description: 'Both parties must sign the agreement to formalize the outcome.',
      tone: 'action',
      actionKey: viewerRole === 'mediator' ? null : 'sign_agreement',
      actionLabel: viewerRole === 'mediator' ? null : 'Sign agreement',
      waitingOn: agreementStatus === 'partial_signature' ? 'other_party' : null
    }
  }

  if (statusId === 'new') {
    return {
      headline: 'Case submitted',
      description: 'Your case is being reviewed. You will be notified when the next step opens.',
      tone: 'info',
      actionKey: null,
      actionLabel: null,
      waitingOn: 'admin'
    }
  }

  return {
    headline: caseItem.case_sub_statuses?.name || caseItem.case_statuses?.name || 'Case in progress',
    description: 'See activity below for recent updates.',
    tone: 'info',
    actionKey: null,
    actionLabel: null,
    waitingOn: null
  }
}

function formatDisplayDate (value) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })
}

function buildActivityLog (caseItem, caseEvents, historyMap) {
  const items = []

  ;(caseItem.case_history || []).forEach((row) => {
    const ev = caseEvents.find((e) => e.id === row.case_event_id) || row.case_events
    if (!ev) return
    items.push({
      id: `history-${row.id || ev.id}`,
      at: row.created_at || row.created_date,
      title: ev.title,
      description: ev.description || null,
      kind: 'milestone'
    })
  })

  ;(caseItem.transactions || []).forEach((tx, idx) => {
    if (!tx.success) return
    items.push({
      id: `tx-${tx.transaction_id || idx}`,
      at: tx.transaction_date,
      title: tx.reason || 'Payment received',
      description: tx.amount != null ? `₹${Number(tx.amount).toLocaleString('en-IN')} via ${tx.payment_method || 'payment'}` : null,
      kind: 'payment'
    })
  })

  if (caseItem.user_cases_mediatorTouser?.name && caseItem.mediator) {
    const assignHistory = items.find((i) =>
      (i.title || '').toLowerCase().includes('mediator assigned')
    )
    if (!assignHistory) {
      items.push({
        id: 'mediator-assigned',
        at: caseItem.updated_at || caseItem.created_at,
        title: 'Mediator assigned',
        description: caseItem.user_cases_mediatorTouser.name,
        kind: 'assignment'
      })
    }
  }

  ;(caseItem.events || []).forEach((ev) => {
    if (!ev.start_datetime) return
    items.push({
      id: `meeting-${ev.id}`,
      at: ev.start_datetime,
      title: ev.title || 'Mediation meeting',
      description: ev.meeting_link ? 'Meeting link available in Meetings section' : (ev.description || null),
      kind: 'meeting'
    })
  })

  const tracking = caseItem.case_agreement_tracking
  if (tracking?.first_party_signature_datetime) {
    items.push({
      id: 'sig-first',
      at: tracking.first_party_signature_datetime,
      title: 'First party signed agreement',
      description: null,
      kind: 'signature'
    })
  }
  if (tracking?.second_party_signature_datetime) {
    items.push({
      id: 'sig-second',
      at: tracking.second_party_signature_datetime,
      title: 'Second party signed agreement',
      description: null,
      kind: 'signature'
    })
  }

  return items
    .filter((i) => i.at)
    .sort((a, b) => new Date(b.at) - new Date(a.at))
    .slice(0, 25)
}

function buildUpcomingSteps (caseEvents, currentPhaseId, historyMap, currentSubStatusId) {
  const currentIndex = PHASE_DEFINITIONS.findIndex((p) => p.id === currentPhaseId)
  const upcoming = []
  const currentEvent = caseEvents.find(
    (ev) => normalizeId(ev.sub_status_id) === normalizeId(currentSubStatusId)
  )
  const currentSequence = currentEvent?.sequence ?? 0

  caseEvents.forEach((ev) => {
    if (historyMap.has(ev.id)) return
    if (currentSequence && ev.sequence != null && ev.sequence < currentSequence) return
    const phase = PHASE_DEFINITIONS.find((p) =>
      p.subStatusIds.includes(normalizeId(ev.sub_status_id))
    )
    const phaseIndex = phase ? PHASE_DEFINITIONS.findIndex((p) => p.id === phase.id) : -1
    if (phaseIndex >= currentIndex) {
      upcoming.push({
        title: ev.title,
        description: ev.description || null
      })
    }
  })

  return upcoming.slice(0, 4)
}

function buildCaseProgress (caseItem, caseEventsCatalog, viewer = {}) {
  const caseEvents = Array.isArray(caseEventsCatalog) ? caseEventsCatalog : []
  const viewerRole = resolveViewerRole(caseItem, viewer)
  const representativeContext = resolveRepresentativeContext(caseItem, viewer)
  const historyMap = historyByEventId(caseItem)
  const currentPhaseId = phaseForCase(caseItem)

  const mergedHistory = caseEvents.map((event) => {
    const created = historyMap.get(event.id)
    const phaseIndex = PHASE_DEFINITIONS.findIndex((p) => p.id === currentPhaseId)
    const eventPhase = PHASE_DEFINITIONS.find((p) =>
      p.subStatusIds.includes(normalizeId(event.sub_status_id))
    )
    const eventPhaseIndex = eventPhase ? PHASE_DEFINITIONS.findIndex((p) => p.id === eventPhase.id) : -1

    let completed = false
    if (created) completed = true
    else if (eventPhaseIndex >= 0 && eventPhaseIndex < phaseIndex) completed = true

    return {
      ...event,
      created_date: created || null,
      completed,
      sub_status_label: SUB_STATUS_LABELS[event.sub_status_id] || null
    }
  })

  return {
    viewerRole,
    isRepresentative: representativeContext.isRepresentative,
    representingSide: representativeContext.representingSide,
    viewerLabel: representativeContext.isRepresentative ? 'Representative' : viewerRole,
    currentPhaseId,
    humanStatus: buildNowCard(caseItem, viewerRole).headline,
    now: buildNowCard(caseItem, viewerRole),
    phases: buildPhaseSteps(caseItem, caseEvents, currentPhaseId, historyMap),
    activity: buildActivityLog(caseItem, caseEvents, historyMap),
    upcomingSteps: buildUpcomingSteps(
      caseEvents,
      currentPhaseId,
      historyMap,
      caseItem.case_sub_statuses?.id || caseItem.sub_status
    ),
    case_history: mergedHistory
  }
}

module.exports = {
  buildCaseProgress,
  resolveViewerRole,
  resolveRepresentativeContext,
  formatDisplayDate
}
