/**
 * Enterprise timezone / locale resolution for the Kadr SPA.
 *
 * Priority for display:
 * 1. Manual override saved by the user (localStorage + synced to profile when logged in)
 * 2. Auto = device timezone from Intl / navigator
 * 3. Platform fallback (env or Asia/Kolkata for India-first ops)
 */

const STORAGE_KEY = 'kadr.prefs'
const CHANGE_EVENT = 'kadr-preferences-changed'

export const PLATFORM_FALLBACK_TIMEZONE = 'Asia/Kolkata'
export const PLATFORM_FALLBACK_LOCALE = 'en-IN'

const DEFAULT_PREFS = {
  /** 'auto' follows device; 'manual' uses timezone field */
  timezoneMode: 'auto',
  timezone: null,
  localeMode: 'auto',
  locale: null,
  notificationEmail: true
}

export function detectDeviceTimezone () {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    if (tz && typeof tz === 'string') return tz
  } catch (_) { /* ignore */ }
  return PLATFORM_FALLBACK_TIMEZONE
}

export function detectDeviceLocale () {
  try {
    if (typeof navigator !== 'undefined' && navigator.language) {
      return navigator.language
    }
  } catch (_) { /* ignore */ }
  return PLATFORM_FALLBACK_LOCALE
}

function readRawPrefs () {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch (_) {
    return {}
  }
}

/**
 * Normalize legacy prefs (timezone string only) into mode-aware shape.
 */
export function getUserPreferences () {
  const stored = readRawPrefs()
  const merged = {
    ...DEFAULT_PREFS,
    ...stored
  }

  // Legacy: timezone set without mode → treat as manual override
  if (!stored.timezoneMode && stored.timezone) {
    merged.timezoneMode = 'manual'
  }

  if (!merged.timezone) {
    merged.timezone = detectDeviceTimezone()
  }
  if (!merged.locale) {
    merged.locale = detectDeviceLocale()
  }

  return merged
}

export function setUserPreferences (partial) {
  const current = getUserPreferences()
  const next = {
    ...current,
    ...(partial && typeof partial === 'object' ? partial : {})
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: next }))
  }
  return next
}

/** Effective IANA timezone for all UI formatting. */
export function getEffectiveTimezone () {
  const prefs = getUserPreferences()
  if (prefs.timezoneMode === 'manual' && prefs.timezone) {
    return prefs.timezone
  }
  return detectDeviceTimezone()
}

/** Effective BCP 47 locale for formatting. */
export function getEffectiveLocale () {
  const prefs = getUserPreferences()
  if (prefs.localeMode === 'manual' && prefs.locale) {
    return prefs.locale
  }
  return detectDeviceLocale()
}

/**
 * Seed prefs from device once (first visit) without forcing manual mode.
 * Call after login / app boot.
 */
export function ensureTimezoneInitialized () {
  const stored = readRawPrefs()
  if (stored.timezoneMode || stored.timezone) {
    return getUserPreferences()
  }
  return setUserPreferences({
    timezoneMode: 'auto',
    timezone: detectDeviceTimezone(),
    localeMode: 'auto',
    locale: detectDeviceLocale()
  })
}

/**
 * Apply timezone/locale returned from the API profile (server of record when set).
 */
export function applyServerPreferences ({ timezone, locale, timezoneMode } = {}) {
  const patch = {}
  if (timezone) {
    patch.timezone = timezone
    patch.timezoneMode = timezoneMode === 'auto' ? 'auto' : 'manual'
  }
  if (locale) {
    patch.locale = locale
    patch.localeMode = 'manual'
  }
  if (Object.keys(patch).length) {
    return setUserPreferences(patch)
  }
  return getUserPreferences()
}

export function onPreferencesChanged (handler) {
  if (typeof window === 'undefined') return () => {}
  const listener = (e) => handler(e.detail || getUserPreferences())
  window.addEventListener(CHANGE_EVENT, listener)
  return () => window.removeEventListener(CHANGE_EVENT, listener)
}

/** Curated list + device timezone always available for the picker. */
export function getTimezoneOptions () {
  const device = detectDeviceTimezone()
  const curated = [
    { value: 'Asia/Kolkata', text: 'Asia/Kolkata (India Standard Time)' },
    { value: 'Asia/Dubai', text: 'Asia/Dubai (Gulf)' },
    { value: 'Asia/Singapore', text: 'Asia/Singapore' },
    { value: 'Asia/Tokyo', text: 'Asia/Tokyo' },
    { value: 'Europe/London', text: 'Europe/London' },
    { value: 'Europe/Paris', text: 'Europe/Paris' },
    { value: 'America/New_York', text: 'America/New_York (Eastern)' },
    { value: 'America/Chicago', text: 'America/Chicago (Central)' },
    { value: 'America/Los_Angeles', text: 'America/Los_Angeles (Pacific)' },
    { value: 'Australia/Sydney', text: 'Australia/Sydney' },
    { value: 'UTC', text: 'UTC' }
  ]
  const seen = new Set(curated.map((o) => o.value))
  if (!seen.has(device)) {
    curated.unshift({ value: device, text: `${device} (detected on this device)` })
  } else {
    curated.forEach((o) => {
      if (o.value === device) o.text = `${o.text} — device`
    })
  }
  return curated
}

/** @deprecated Prefer getTimezoneOptions() so device TZ is always current */
export const TIMEZONE_OPTIONS = [
  { value: 'Asia/Kolkata', text: 'Asia/Kolkata (India Standard Time)' },
  { value: 'Asia/Dubai', text: 'Asia/Dubai (Gulf)' },
  { value: 'Asia/Singapore', text: 'Asia/Singapore' },
  { value: 'Asia/Tokyo', text: 'Asia/Tokyo' },
  { value: 'Europe/London', text: 'Europe/London' },
  { value: 'Europe/Paris', text: 'Europe/Paris' },
  { value: 'America/New_York', text: 'America/New_York (Eastern)' },
  { value: 'America/Chicago', text: 'America/Chicago (Central)' },
  { value: 'America/Los_Angeles', text: 'America/Los_Angeles (Pacific)' },
  { value: 'Australia/Sydney', text: 'Australia/Sydney' },
  { value: 'UTC', text: 'UTC' }
]

export {
  STORAGE_KEY as PREFS_STORAGE_KEY,
  CHANGE_EVENT as PREFS_CHANGE_EVENT,
  DEFAULT_PREFS
}
