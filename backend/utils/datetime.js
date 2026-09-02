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

module.exports = {
  PLATFORM_FALLBACK,
  getAppTimezone,
  formatInZone,
  formatMeetingRange,
  formatDateTime,
  parseLocalDateTime
}
