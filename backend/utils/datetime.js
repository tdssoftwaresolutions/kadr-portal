/**
 * Server-side date formatting with configurable timezone.
 * User-facing emails should pass the recipient's timezone when known.
 * Schedulers use APP_TIMEZONE (default Asia/Kolkata for India ops).
 */

const PLATFORM_FALLBACK = 'Asia/Kolkata'
const PLATFORM_LOCALE = 'en-IN'

function getAppTimezone () {
  return process.env.APP_TIMEZONE || PLATFORM_FALLBACK
}

function formatInZone (dateInput, { timeZone, locale = PLATFORM_LOCALE, ...options } = {}) {
  const date = new Date(dateInput)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat(locale, {
    timeZone: timeZone || getAppTimezone(),
    ...options
  }).format(date)
}

function formatMeetingRange (startDatetime, endDatetime, timeZone) {
  const start = new Date(startDatetime)
  const end = new Date(endDatetime)
  if (Number.isNaN(start.getTime())) return ''

  const zone = timeZone || getAppTimezone()
  const dateStr = formatInZone(start, {
    timeZone: zone,
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
  const startTime = formatInZone(start, {
    timeZone: zone,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })
  if (Number.isNaN(end.getTime())) return `${dateStr}, ${startTime}`
  const endTime = formatInZone(end, {
    timeZone: zone,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })
  return `${dateStr}, ${startTime} - ${endTime}`
}

function formatDateTime (datetime, timeZone) {
  return formatInZone(datetime, {
    timeZone: timeZone || getAppTimezone(),
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: 'numeric',
    minute: 'numeric',
    hour12: true
  })
}

/**
 * Parse calendar / flatpickr values into a valid Date for Prisma.
 * Accepts Date, ISO strings, and "YYYY-MM-DD HH:mm" / "YYYY-MM-DDTHH:mm".
 */
function parseLocalDateTime (value) {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value
  }
  if (value == null || value === '') return null
  if (typeof value === 'number') {
    const d = new Date(value)
    return Number.isNaN(d.getTime()) ? null : d
  }
  const raw = String(value).trim()
  if (!raw) return null

  // Flatpickr often emits "YYYY-MM-DD HH:mm" which Prisma rejects
  let normalized = raw
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/.test(raw)) {
    normalized = raw.replace(' ', 'T')
  }

  const d = new Date(normalized)
  return Number.isNaN(d.getTime()) ? null : d
}

/**
 * Parse a date-only string from an external, loosely-formatted source (e.g.
 * the eCourts partner API), which commonly uses DD-MM-YYYY (Indian
 * government sites) rather than ISO. Native `Date.parse` on dash/slash
 * dates is locale-ambiguous and unreliable across engines, so DD-MM-YYYY /
 * DD/MM/YYYY is checked explicitly first, with a sanity check against
 * rollover (e.g. "31-02-2024" is rejected rather than silently becoming
 * March). Falls back to native parsing for genuinely unambiguous formats
 * (ISO 8601, etc). Returns null — never throws — on anything unparseable,
 * so callers can skip bad entries instead of crashing a sync.
 */
function parseFlexibleDate (value) {
  if (value == null) return null
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value
  const raw = String(value).trim()
  if (!raw) return null

  const dmy = raw.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})/)
  if (dmy) {
    const day = parseInt(dmy[1], 10)
    const month = parseInt(dmy[2], 10)
    let year = parseInt(dmy[3], 10)
    if (year < 100) year += year < 70 ? 2000 : 1900
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      const d = new Date(Date.UTC(year, month - 1, day))
      if (!Number.isNaN(d.getTime()) && d.getUTCDate() === day && d.getUTCMonth() === month - 1) {
        return d
      }
    }
  }

  const d = new Date(raw)
  return Number.isNaN(d.getTime()) ? null : d
}

// India Standard Time has no DST, so a fixed +05:30 offset is safe to use
// directly rather than needing a timezone-aware date library.
const IST_OFFSET_MS = (5 * 60 + 30) * 60000

/**
 * Pick a random 30-minute-aligned meeting slot, tomorrow (IST calendar day),
 * between `startHour` and `endHour` IST — e.g. 9:00, 9:30, ... 17:00, never
 * an off-grid time like 9:31. The last possible start is chosen so the
 * meeting still ends by `endHour` (e.g. with a 60-minute duration and
 * endHour 18, the latest start is 17:00).
 */
function pickNextDayMeetingSlot ({ durationMinutes = 60, startHour = 9, endHour = 18 } = {}) {
  const now = new Date()
  const nowIstShifted = new Date(now.getTime() + IST_OFFSET_MS)
  const year = nowIstShifted.getUTCFullYear()
  const month = nowIstShifted.getUTCMonth()
  const day = nowIstShifted.getUTCDate()

  // UTC instant of tomorrow's midnight IST.
  const midnightTomorrowIst = Date.UTC(year, month, day + 1, 0, 0, 0) - IST_OFFSET_MS

  const lastStartMinutesFromWindowStart = (endHour - startHour) * 60 - durationMinutes
  const slotCount = Math.floor(lastStartMinutesFromWindowStart / 30) + 1
  const chosenSlotIndex = Math.floor(Math.random() * slotCount)
  const minutesFromMidnight = startHour * 60 + chosenSlotIndex * 30

  const start = new Date(midnightTomorrowIst + minutesFromMidnight * 60000)
  const end = new Date(start.getTime() + durationMinutes * 60000)
  return { start, end }
}

module.exports = {
  PLATFORM_FALLBACK,
  getAppTimezone,
  formatInZone,
  formatMeetingRange,
  formatDateTime,
  parseLocalDateTime,
  parseFlexibleDate,
  pickNextDayMeetingSlot
}
