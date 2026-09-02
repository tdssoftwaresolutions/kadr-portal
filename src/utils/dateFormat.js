import {
  getEffectiveLocale,
  getEffectiveTimezone
} from './timezone'

/**
 * Shared date/time helpers — always use the user's effective timezone/locale.
 * Import these (or use Vue.prototype.$format*) instead of ad-hoc toLocaleString.
 */

export function formatDateTime (dateString, options = {}) {
  if (dateString == null || dateString === '') return '—'
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString(getEffectiveLocale(), {
    timeZone: getEffectiveTimezone(),
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    ...options
  })
}

export function formatDate (dateString, options = {}) {
  if (dateString == null || dateString === '') return '—'
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString(getEffectiveLocale(), {
    timeZone: getEffectiveTimezone(),
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options
  })
}

export function formatTime (dateString, options = {}) {
  if (dateString == null || dateString === '') return '—'
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleTimeString(getEffectiveLocale(), {
    timeZone: getEffectiveTimezone(),
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    ...options
  })
}

export function formatRelativeDay (dateString) {
  if (dateString == null || dateString === '') return '—'
  const inputDate = new Date(dateString)
  if (Number.isNaN(inputDate.getTime())) return '—'

  const tz = getEffectiveTimezone()
  const dayKey = (d) => {
    try {
      return new Intl.DateTimeFormat('en-CA', {
        timeZone: tz,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(d)
    } catch (_) {
      return d.toISOString().slice(0, 10)
    }
  }

  const today = dayKey(new Date())
  const target = dayKey(inputDate)
  const todayMs = Date.parse(`${today}T12:00:00Z`)
  const targetMs = Date.parse(`${target}T12:00:00Z`)
  const diffDays = Math.round((targetMs - todayMs) / 86400000)

  if (diffDays === 0) return 'Today'
  if (diffDays === -1) return 'Yesterday'
  if (diffDays === 1) return 'Tomorrow'
  return formatDateTime(dateString)
}

export function formatMeetingRange (startDatetime, endDatetime) {
  if (!startDatetime) return '—'
  const start = new Date(startDatetime)
  const end = endDatetime ? new Date(endDatetime) : null
  if (Number.isNaN(start.getTime())) return '—'

  const dateStr = formatDate(start, { month: 'long' })
  const startTime = formatTime(start)
  if (!end || Number.isNaN(end.getTime())) return `${dateStr}, ${startTime}`
  return `${dateStr}, ${startTime} - ${formatTime(end)}`
}

export function getTimezoneLabel () {
  return getEffectiveTimezone()
}
