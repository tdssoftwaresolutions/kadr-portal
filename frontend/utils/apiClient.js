import axios from 'axios'
import VueCookies from 'vue-cookies'
import { getApiBaseUrl } from './apiBase'
import { getAccessToken, getRefreshToken, setTokens } from './tokenStorage'
import { getMobileClientHeaders, isNativeApp } from './platform'
import { notifyRequestStart, notifyRequestEnd } from './loadingBridge'

export const REFRESH_TOKEN_ENDPOINT = '/refresh-token'

const LOGIN_ENDPOINT = '/login'
const EXCLUDED_ENDPOINTS = [
  LOGIN_ENDPOINT,
  '/google-login',
  '/getExistingUser',
  '/resetPassword',
  '/confirmPasswordChange',
  '/newUserSignup',
  '/newMediatorSignup',
  '/signup/upload-url',
  '/isEmailExist',
  '/website-contact',
  '/public/coupon-lookup'
]

export const apiClient = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 100000
})

function isExcludedUrl (url = '') {
  return EXCLUDED_ENDPOINTS.some((endpoint) => url.includes(endpoint))
}

function parseRefreshResponse (data) {
  if (data?.data?.accessToken) return data.data.accessToken
  if (data?.accessToken) return data.accessToken
  return null
}

// Global loading tracking. Every request through apiClient shows the global
// spinner unless it opts out via `config.meta.silent = true` (used for
// background/silent calls like token refresh, polling, or debounced lookups).
function isSilentRequest (config) {
  return Boolean(config && config.meta && config.meta.silent)
}

apiClient.interceptors.request.use(async (config) => {
  config.headers = {
    ...getMobileClientHeaders(),
    ...config.headers
  }

  if (!isSilentRequest(config)) {
    config.__loadingTracked = true
    notifyRequestStart()
  }
  if (!isExcludedUrl(config.url)) {
    const token = await getAccessToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
  }

  // Add CSRF token for state-changing requests (from cookie set by server)
  const method = (config.method || '').toUpperCase()
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    const csrfToken = VueCookies.get('_csrf_token')
    if (csrfToken) {
      config.headers['X-CSRF-Token'] = csrfToken
    }
  }

  return config
})

// Balances the loading counter for a finished request (once per tracked
// request). Clears the flag so the E102 retry below can re-track cleanly.
function endLoadingFor (config) {
  if (config && config.__loadingTracked) {
    config.__loadingTracked = false
    notifyRequestEnd()
  }
}

apiClient.interceptors.response.use(
  (response) => {
    endLoadingFor(response.config)
    return response
  },
  async (error) => {
    // End tracking for the failed request up front. If this was an E102 and we
    // retry below, the retried request passes through the request interceptor
    // again and gets its own fresh start/end pair — so the counter stays
    // balanced either way.
    endLoadingFor(error.config)

    const errorCode = error.response && error.response.data && error.response.data.errorCode
    if (errorCode !== 'E102') {
      return Promise.reject(error)
    }
    try {
      const refreshToken = await getRefreshToken()
      const body = refreshToken ? { refreshToken } : {}
      // The silent flag keeps the token refresh out of the global spinner.
      const { data } = await apiClient.post(REFRESH_TOKEN_ENDPOINT, body, {
        headers: getMobileClientHeaders(),
        withCredentials: !isNativeApp(),
        meta: { silent: true }
      })
      const accessToken = parseRefreshResponse(data)
      if (!accessToken) throw new Error('Refresh failed')
      await setTokens({ accessToken })
      if (!isNativeApp()) {
        const secure = typeof window !== 'undefined' && window.location.protocol === 'https:'
        VueCookies.set('accessToken', accessToken, '1d', '/', '', secure, secure ? 'None' : 'Lax')
      }
      const originalRequest = error.config
      originalRequest.headers.Authorization = `Bearer ${accessToken}`
      return apiClient(originalRequest)
    } catch (refreshError) {
      console.error('Refreshing tokens failed:', refreshError)
      return Promise.reject(refreshError)
    }
  }
)
