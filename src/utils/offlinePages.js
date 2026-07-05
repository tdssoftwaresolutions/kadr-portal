import { isNativeApp } from './platform'

const STORAGE_KEY = 'kadr.offlinePages'
const MAX_PAGES = 40

async function preferences () {
  const { Preferences } = await import('@capacitor/preferences')
  return Preferences
}

/**
 * Save a snapshot of page data for offline viewing (native app).
 */
export async function saveOfflinePage ({ id, title, route, payload }) {
  if (!isNativeApp()) return null
  const pages = await listOfflinePages()
  const entry = {
    id: id || route || `page-${Date.now()}`,
    title: title || 'Saved page',
    route: route || '',
    savedAt: new Date().toISOString(),
    payload
  }
  const next = [entry, ...pages.filter((p) => p.id !== entry.id)].slice(0, MAX_PAGES)
  const Prefs = await preferences()
  await Prefs.set({
    key: STORAGE_KEY,
    value: JSON.stringify(next)
  })
  return entry
}

export async function listOfflinePages () {
  if (!isNativeApp()) return []
  const Prefs = await preferences()
  const { value } = await Prefs.get({ key: STORAGE_KEY })
  if (!value) return []
  try {
    return JSON.parse(value)
  } catch (_) {
    return []
  }
}

export async function getOfflinePage (id) {
  const pages = await listOfflinePages()
  return pages.find((p) => p.id === id) || null
}

export async function removeOfflinePage (id) {
  const pages = await listOfflinePages()
  const next = pages.filter((p) => p.id !== id)
  const Prefs = await preferences()
  await Prefs.set({
    key: STORAGE_KEY,
    value: JSON.stringify(next)
  })
}
