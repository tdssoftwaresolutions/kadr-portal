function useSecureCookies () {
  if (process.env.COOKIE_SECURE === '1') return true
  if (process.env.COOKIE_SECURE === '0') return false
  return String(process.env.BASE_URL || '').startsWith('https://')
}

function getRefreshCookieOptions (maxAgeMs) {
  const secure = useSecureCookies()
  return {
    httpOnly: true,
    secure,
    maxAge: maxAgeMs,
    sameSite: secure ? 'None' : 'Lax',
    path: '/'
  }
}

function getRefreshCookieClearOptions () {
  const secure = useSecureCookies()
  return {
    httpOnly: true,
    secure,
    sameSite: secure ? 'None' : 'Lax',
    path: '/'
  }
}

module.exports = {
  useSecureCookies,
  getRefreshCookieOptions,
  getRefreshCookieClearOptions
}
