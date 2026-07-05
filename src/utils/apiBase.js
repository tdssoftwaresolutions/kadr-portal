export function getApiBaseUrl () {
  const configured = process.env.VUE_APP_API_BASE_URL
  if (configured) {
    const trimmed = configured.replace(/\/$/, '')
    return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`
  }
  return '/api'
}
