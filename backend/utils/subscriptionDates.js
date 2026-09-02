const IST_TIMEZONE = 'Asia/Kolkata'
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000

function getIstCalendarParts (date = new Date()) {
  const shifted = new Date(date.getTime() + IST_OFFSET_MS)
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth(),
    day: shifted.getUTCDate()
  }
}

/** UTC instant for 00:00:00.000 IST on the given calendar day. */
function istMidnightUtc (year, month, day) {
  return new Date(Date.UTC(year, month, day) - IST_OFFSET_MS)
}

/** Last millisecond of the given calendar day in IST. */
function endOfIstCalendarDay (year, month, day) {
  return new Date(istMidnightUtc(year, month, day + 1).getTime() - 1)
}

function addIstCalendarDays (parts, days) {
  const n = Math.max(0, parseInt(days, 10) || 0)
  const anchor = new Date(Date.UTC(parts.year, parts.month, parts.day + n))
  return {
    year: anchor.getUTCFullYear(),
    month: anchor.getUTCMonth(),
    day: anchor.getUTCDate()
  }
}

/**
 * Pro access lasts through the end of the calendar day that is `durationDays`
 * after the base day (IST). E.g. start 18 May + 2 days → end of 20 May.
 */
function computeProExpiresAt (baseDate, durationDays) {
  const parts = getIstCalendarParts(baseDate)
  const target = addIstCalendarDays(parts, durationDays)
  return endOfIstCalendarDay(target.year, target.month, target.day)
}

/** Start of today 00:00 IST — subscriptions with expires_at before this are due for expiry job. */
function startOfTodayIst () {
  const parts = getIstCalendarParts(new Date())
  return istMidnightUtc(parts.year, parts.month, parts.day)
}

function isProActiveAt (expiresAt, now = new Date()) {
  if (!expiresAt) return true
  return new Date(expiresAt).getTime() >= now.getTime()
}

function formatSubscriptionExpiryDate (value) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: IST_TIMEZONE
  })
}

module.exports = {
  IST_TIMEZONE,
  getIstCalendarParts,
  computeProExpiresAt,
  startOfTodayIst,
  isProActiveAt,
  formatSubscriptionExpiryDate
}
