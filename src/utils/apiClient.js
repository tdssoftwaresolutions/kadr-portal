import axios from 'axios'
import VueCookies from 'vue-cookies'
import { getApiBaseUrl } from './apiBase'
import { getAccessToken, getRefreshToken, setTokens } from './tokenStorage'
import { getMobileClientHeaders, isNativeApp } from './platform'

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
  '/isEmailExist',
  '/website-contact'
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

apiClient.interceptors.request.use(async (config) => {
  config.headers = {
    ...getMobileClientHeaders(),
    ...config.headers
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

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const errorCode = error.response && error.response.data && error.response.data.errorCode
    if (errorCode !== 'E102') {
      return Promise.reject(error)
    }
    try {
      const refreshToken = await getRefreshToken()
      const body = refreshToken ? { refreshToken } : {}
      const { data } = await apiClient.post(REFRESH_TOKEN_ENDPOINT, body, {
        headers: getMobileClientHeaders(),
        withCredentials: !isNativeApp()
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
