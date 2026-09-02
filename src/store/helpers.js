import { isPremiumGateError } from '../utils/mediatorEntitlements'

export function dispatchApiErrorAlert (dispatch, error, fallback = 'Something went wrong') {
  if (isPremiumGateError(error)) return
  const msg = error.response?.data?.error?.message || error.message || fallback
  dispatch('alert/showAlert', { message: msg, type: 'danger' }, { root: true })
}

export async function triggerPdfBlobDownload (response, filename) {
  const contentType = (response.headers && response.headers['content-type']) || ''
  if (contentType.includes('application/json') || contentType.includes('text/html')) {
    const text = typeof response.data.text === 'function'
      ? await response.data.text()
      : String(response.data)
    let message = 'PDF download failed'
    try {
      const json = JSON.parse(text)
      message = json.error?.message || json.message || message
    } catch (_) {
      if (text) message = text.slice(0, 200)
    }
    throw new Error(message)
  }
  const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }))
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}

export const debug = process.env.NODE_ENV !== 'production'

export const getDefaultState = () => {
  return {
    loader: false,
    user: null,
    availableLanguages: null,
    availableStates: null,
    allLanguages: null,
    dashboardContent: null,
    calendarInit: null,
    mediatorFeatures: [],
    mediatorSubscriptionTier: 'FREE'
  }
}

export function parseApiResponse (body) {
  if (!body?.success) {
    const message = body?.error?.message || body?.message || 'Request failed'
    throw new Error(message)
  }
  const payload = body.data || {}
  return {
    success: true,
    message: body.message,
    ...payload,
    data: payload
  }
}
