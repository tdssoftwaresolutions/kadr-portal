const { CaseSubTypes, CaseTypes } = require('../../utils/caseConstants')

const IN_PROGRESS = CaseTypes.IN_PROGRESS

async function findCaseEvent (prisma, statusId, subStatusId) {
  return prisma.case_events.findFirst({
    where: {
      status_id: statusId,
      sub_status_id: subStatusId
    }
  })
}

async function hasCaseMilestone (prisma, caseId, caseEventId) {
  const row = await prisma.case_history.findFirst({
    where: {
      case_id: caseId,
      case_event_id: caseEventId
    }
  })
  return Boolean(row)
}

/**
 * Append a case_history row for a catalogued milestone (idempotent when skipIfExists).
 */
async function recordCaseMilestone (prisma, {
  caseId,
  statusId = IN_PROGRESS,
  subStatusId,
  skipIfExists = true
}) {
  if (!caseId || !subStatusId) return null

  const caseEvent = await findCaseEvent(prisma, statusId, subStatusId)
  if (!caseEvent) return null

  if (skipIfExists && await hasCaseMilestone(prisma, caseId, caseEvent.id)) {
    return null
  }

  return prisma.case_history.create({
    data: {
      case_id: caseId,
      case_event_id: caseEvent.id
    }
  })
}

async function recordCaseMilestones (prisma, caseId, subStatusIds, statusId = IN_PROGRESS) {
  for (const subStatusId of subStatusIds) {
    await recordCaseMilestone(prisma, { caseId, statusId, subStatusId })
  }
}

async function updateCaseSubStatus (prisma, caseId, { status, sub_status: subStatus }) {
  const data = {}
  if (status !== undefined) data.status = status
  if (subStatus !== undefined) data.sub_status = subStatus
  if (!Object.keys(data).length) return null
  return prisma.cases.update({
    where: { id: caseId },
    data
  })
}

/** Backfill notice-phase milestones before moving to mediation payment. */
async function ensureNoticePhaseComplete (prisma, caseId) {
  await recordCaseMilestones(prisma, caseId, [
    CaseSubTypes.PENDING_NOTICE_PAYMENT,
    CaseSubTypes.NOTICE_SENT_TO_OPPOSITE_PARTY
  ])
}

/**
 * After a KADR meeting exists: mark mediator assigned + meeting scheduled in history and sub_status.
 */
async function syncMeetingScheduled (prisma, caseId) {
  await recordCaseMilestone(prisma, {
    caseId,
    subStatusId: CaseSubTypes.MEDIATOR_ASSIGNED
  })
  await updateCaseSubStatus(prisma, caseId, {
    status: IN_PROGRESS,
    sub_status: CaseSubTypes.MEETING_SCHEDULED
  })
  await recordCaseMilestone(prisma, {
    caseId,
    subStatusId: CaseSubTypes.MEETING_SCHEDULED
  })
}

module.exports = {
  recordCaseMilestone,
  recordCaseMilestones,
  updateCaseSubStatus,
  ensureNoticePhaseComplete,
  syncMeetingScheduled
}
