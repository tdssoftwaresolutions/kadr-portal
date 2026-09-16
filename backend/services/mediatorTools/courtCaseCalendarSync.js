const { parseFlexibleDate } = require('../../utils/datetime')

// Court hearings only have a date, no time, so every synced entry gets this
// fixed placeholder slot on the mediator's personal calendar.
const DEFAULT_HEARING_HOUR = 10

function externalRefPrefix (trackerId) {
  return `courtHearing:${trackerId}:`
}

// `parseFlexibleDate` may return a Date built from a UTC-based parse (ISO
// strings, or our own DD-MM-YYYY branch which uses Date.UTC). Extracting the
// calendar day via the UTC getters — rather than local getters — keeps the
// "which day" answer stable regardless of the server's own timezone, so the
// dedup key and the constructed event time always agree on the same day.
function dateKey (date) {
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, '0')
  const d = String(date.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function toLocalEventTime (date, hour) {
  return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), hour, 0, 0, 0)
}

/**
 * Merge hearingHistory[] entries (past + future, whatever the source
 * returns) with profile.nextHearingDate into one candidate per distinct
 * calendar day. History entries carry purpose/judge; a next-hearing date
 * not already present in the history gets its own bare candidate.
 */
function buildCandidates (snapshot) {
  const candidates = new Map()

  const history = Array.isArray(snapshot?.hearingHistory) ? snapshot.hearingHistory : []
  for (const h of history) {
    const parsed = parseFlexibleDate(h.hearingDate || h.businessOnDate)
    if (!parsed) continue
    const key = dateKey(parsed)
    const purpose = h.purposeOfListing && h.purposeOfListing !== '—' ? h.purposeOfListing : null
    const judge = h.judge && h.judge !== '—' ? h.judge : null
    const existing = candidates.get(key)
    if (existing) {
      if (purpose && existing.purpose !== purpose) {
        existing.purpose = existing.purpose ? `${existing.purpose}; ${purpose}` : purpose
      }
      if (!existing.judge && judge) existing.judge = judge
    } else {
      candidates.set(key, { date: parsed, purpose, judge, isNext: false })
    }
  }

  const nextParsed = parseFlexibleDate(snapshot?.profile?.nextHearingDate)
  if (nextParsed) {
    const key = dateKey(nextParsed)
    const existing = candidates.get(key)
    if (existing) {
      existing.isNext = true
    } else {
      candidates.set(key, {
        date: nextParsed,
        purpose: null,
        judge: snapshot?.profile?.judge || null,
        isNext: true
      })
    }
  }

  return candidates
}

function buildEventFields (tracker, candidate) {
  const caseLabel = tracker.case_title || tracker.cnr
  const title = candidate.isNext ? `Hearing — ${caseLabel} (Next)` : `Hearing — ${caseLabel}`
  const description = [
    tracker.court_name ? `Court: ${tracker.court_name}` : null,
    candidate.judge ? `Judge: ${candidate.judge}` : null,
    candidate.purpose ? `Purpose: ${candidate.purpose}` : null,
    `CNR: ${tracker.cnr}`
  ].filter(Boolean).join('\n')

  const start = toLocalEventTime(candidate.date, DEFAULT_HEARING_HOUR)
  const end = toLocalEventTime(candidate.date, DEFAULT_HEARING_HOUR + 1)

  return { title, description, start_datetime: start, end_datetime: end }
}

/**
 * Upserts one `events` row (type PERSONAL, case_id null) per distinct
 * hearing date found in the snapshot, keyed by a stable `external_ref`
 * (`courtHearing:<trackerId>:<YYYY-MM-DD>`), and removes any previously
 * synced event for this tracker whose date is no longer present — so
 * re-running this on every refresh never duplicates and self-corrects when
 * a hearing is rescheduled or drops off the source data. Never throws —
 * calendar sync failing must not block adding/refreshing the tracker itself.
 */
async function syncTrackerHearingsToCalendar (prisma, tracker, snapshot) {
  try {
    const candidates = buildCandidates(snapshot)
    const prefix = externalRefPrefix(tracker.id)

    const existingEvents = await prisma.events.findMany({
      where: {
        created_by: tracker.mediator_id,
        type: 'PERSONAL',
        external_ref: { startsWith: prefix }
      },
      select: { id: true, external_ref: true }
    })
    const existingByRef = new Map(existingEvents.map((e) => [e.external_ref, e]))

    let created = 0
    let updated = 0

    for (const [key, candidate] of candidates.entries()) {
      const externalRef = `${prefix}${key}`
      const fields = buildEventFields(tracker, candidate)
      const existing = existingByRef.get(externalRef)
      if (existing) {
        await prisma.events.update({ where: { id: existing.id }, data: fields })
        existingByRef.delete(externalRef)
        updated += 1
      } else {
        await prisma.events.create({
          data: {
            ...fields,
            type: 'PERSONAL',
            created_by: tracker.mediator_id,
            case_id: null,
            external_ref: externalRef
          }
        })
        created += 1
      }
    }

    // Whatever's left in existingByRef is a previously-synced hearing that
    // no longer appears in the fresh data — remove it.
    const staleIds = Array.from(existingByRef.values()).map((e) => e.id)
    if (staleIds.length) {
      await prisma.events.deleteMany({ where: { id: { in: staleIds } } })
    }

    return { created, updated, removed: staleIds.length }
  } catch (err) {
    console.error('[courtCaseCalendarSync] sync failed for tracker', tracker?.id, err.message)
    return { created: 0, updated: 0, removed: 0, error: err.message }
  }
}

/** Deletes every synced calendar event for a tracker (called on tracker removal). */
async function removeTrackerCalendarEvents (prisma, trackerId) {
  try {
    await prisma.events.deleteMany({
      where: { type: 'PERSONAL', external_ref: { startsWith: externalRefPrefix(trackerId) } }
    })
  } catch (err) {
    console.error('[courtCaseCalendarSync] cleanup failed for tracker', trackerId, err.message)
  }
}

module.exports = {
  syncTrackerHearingsToCalendar,
  removeTrackerCalendarEvents
}
