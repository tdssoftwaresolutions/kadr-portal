export function isCapacitorBuild () {
  return process.env.VUE_APP_CAPACITOR === '1'
}

export function isNativeApp () {
  if (typeof window === 'undefined') return isCapacitorBuild()
  try {
    const { Capacitor } = require('@capacitor/core')
    return Capacitor.isNativePlatform()
  } catch (_) {
    return false
  }
}

export function getMobileClientHeaders () {
  if (!isNativeApp() && !isCapacitorBuild()) return {}
  return { 'X-Kadr-Client': 'mobile' }
}
