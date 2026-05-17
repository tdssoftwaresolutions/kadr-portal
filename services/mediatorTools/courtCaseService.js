const { createError } = require('../../utils/errors')
const errorCodes = require('../../utils/errors/errorCodes')
const { fetchCaseByCnr, officialEcourtsUrl } = require('./ecourtsIndiaPartnerService')

const MAX_TRACKERS_PER_MEDIATOR = 25
const CNR_PATTERN = /^[A-Z0-9]{16}$/

function normalizeCnr (raw) {
  return String(raw || '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]/g, '')
}

function validateCnr (cnr) {
  if (!cnr || cnr.length !== 16) {
    throw createError(errorCodes.INVALID_CNR_FORMAT)
  }
  if (!CNR_PATTERN.test(cnr)) {
    throw createError(errorCodes.INVALID_CNR_FORMAT)
  }
}

async function fetchCnrDetails (cnr) {
  validateCnr(cnr)
  return fetchCaseByCnr(cnr)
}

function summaryFromFullCase (full) {
  return {
    case_title: full.caseTitle ? String(full.caseTitle).slice(0, 500) : null,
    court_name: full.courtName ? String(full.courtName).slice(0, 200) : null,
    case_status: full.caseStatus ? String(full.caseStatus).slice(0, 64) : null
  }
}

function summaryFromSnapshot (snap) {
  if (!snap || typeof snap !== 'object') {
    return { case_title: null, court_name: null, case_status: null }
  }
  return {
    case_title: snap.caseTitle ? String(snap.caseTitle).slice(0, 500) : null,
    court_name: snap.courtName ? String(snap.courtName).slice(0, 200) : null,
    case_status: snap.caseStatus ? String(snap.caseStatus).slice(0, 64) : null
  }
}

function serializeTracker (row, { includeSnapshot = false } = {}) {
  const snap = row.case_snapshot
  const fromSnap = summaryFromSnapshot(snap)
  const out = {
    id: row.id,
    cnr: row.cnr,
    label: row.label,
    caseTitle: row.case_title || fromSnap.case_title || null,
    courtName: row.court_name || fromSnap.court_name || null,
    caseStatus: row.case_status || fromSnap.case_status || null,
    lastFetchedAt: row.last_fetched_at,
    updatedAt: row.updated_at,
    createdAt: row.created_at,
    hasSnapshot: !!(snap && typeof snap === 'object')
  }
  if (includeSnapshot) {
    out.caseSnapshot = snap || null
  }
  return out
}

async function listTrackers (prisma, mediatorId) {
  const rows = await prisma.mediator_court_case_trackers.findMany({
    where: { mediator_id: mediatorId },
    orderBy: { updated_at: 'desc' }
  })
  return rows.map((row) => serializeTracker(row))
}

async function addTracker (prisma, mediatorId, { cnr: rawCnr, label }) {
  const cnr = normalizeCnr(rawCnr)
  validateCnr(cnr)

  const count = await prisma.mediator_court_case_trackers.count({
    where: { mediator_id: mediatorId }
  })
  if (count >= MAX_TRACKERS_PER_MEDIATOR) {
    throw createError(errorCodes.COURT_TRACKER_LIMIT_REACHED)
  }

  const existing = await prisma.mediator_court_case_trackers.findUnique({
    where: { mediator_id_cnr: { mediator_id: mediatorId, cnr } }
  })
  if (existing) throw createError(errorCodes.COURT_TRACKER_ALREADY_EXISTS)

  const snapshot = await fetchCnrDetails(cnr)
  const summary = summaryFromFullCase(snapshot)
  const now = new Date()

  const row = await prisma.mediator_court_case_trackers.create({
    data: {
      mediator_id: mediatorId,
      cnr,
      label: label ? String(label).trim().slice(0, 120) : null,
      ...summary,
      case_snapshot: snapshot,
      last_fetched_at: now
    }
  })

  return serializeTracker(row)
}

/** Fetch live data from eCourts, persist snapshot + summary + timestamps. */
async function refreshTracker (prisma, mediatorId, trackerId) {
  const row = await prisma.mediator_court_case_trackers.findFirst({
    where: { id: trackerId, mediator_id: mediatorId }
  })
  if (!row) throw createError(errorCodes.NOT_FOUND)

  const snapshot = await fetchCnrDetails(row.cnr)
  const summary = summaryFromFullCase(snapshot)
  const now = new Date()

  const updated = await prisma.mediator_court_case_trackers.update({
    where: { id: trackerId },
    data: {
      ...summary,
      case_snapshot: snapshot,
      last_fetched_at: now
    }
  })

  return {
    tracker: serializeTracker(updated),
    details: snapshot
  }
}

/** Return cached snapshot from DB only (no external API). */
async function getTrackerDetails (prisma, mediatorId, trackerId) {
  const row = await prisma.mediator_court_case_trackers.findFirst({
    where: { id: trackerId, mediator_id: mediatorId }
  })
  if (!row) throw createError(errorCodes.NOT_FOUND)

  return {
    tracker: serializeTracker(row),
    details: row.case_snapshot || null
  }
}

async function removeTracker (prisma, mediatorId, trackerId) {
  const row = await prisma.mediator_court_case_trackers.findFirst({
    where: { id: trackerId, mediator_id: mediatorId }
  })
  if (!row) throw createError(errorCodes.NOT_FOUND)
  await prisma.mediator_court_case_trackers.delete({ where: { id: trackerId } })
}

module.exports = {
  normalizeCnr,
  validateCnr,
  fetchCnrDetails,
  listTrackers,
  addTracker,
  refreshTracker,
  getTrackerDetails,
  removeTracker,
  officialEcourtsUrl
}
