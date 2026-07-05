import VueCookies from 'vue-cookies'
import { isNativeApp } from './platform'

const ACCESS_KEY = 'kadr.accessToken'
const REFRESH_KEY = 'kadr.refreshToken'

let secureStorage = null

async function getSecureStorage () {
  if (!isNativeApp()) return null
  if (secureStorage) return secureStorage
  try {
    const { SecureStoragePlugin } = await import(
      /* webpackChunkName: "secure-storage" */ 'capacitor-secure-storage-plugin'
    )
    secureStorage = SecureStoragePlugin
    return secureStorage
  } catch (e) {
    console.warn('[tokenStorage] Secure storage unavailable', e)
    return null
  }
}

function setWebAccessCookie (token) {
  VueCookies.set('accessToken', token, '1d', '/', '', true, 'None')
}

export async function getAccessToken () {
  const secure = await getSecureStorage()
  if (secure) {
    try {
      const { value } = await secure.get({ key: ACCESS_KEY })
      if (value) return value
    } catch (_) { /* empty */ }
  }
  return VueCookies.get('accessToken') || null
}

export async function getRefreshToken () {
  const secure = await getSecureStorage()
  if (secure) {
    try {
      const { value } = await secure.get({ key: REFRESH_KEY })
      if (value) return value
    } catch (_) { /* empty */ }
  }
  return null
}

export async function setTokens ({ accessToken, refreshToken }) {
  const secure = await getSecureStorage()
  if (accessToken) {
    setWebAccessCookie(accessToken)
    if (secure) {
      await secure.set({ key: ACCESS_KEY, value: accessToken })
    }
  }
  if (refreshToken && secure) {
    await secure.set({ key: REFRESH_KEY, value: refreshToken })
  }
}

export async function clearTokens () {
  VueCookies.remove('accessToken')
  const secure = await getSecureStorage()
  if (secure) {
    try {
      await secure.remove({ key: ACCESS_KEY })
      await secure.remove({ key: REFRESH_KEY })
    } catch (_) { /* empty */ }
  }
}

export async function hasStoredSession () {
  const access = await getAccessToken()
  if (access) return true
  const refresh = await getRefreshToken()
  return !!refresh
}
