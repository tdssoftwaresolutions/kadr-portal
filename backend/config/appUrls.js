function isDesktopMode () {
  return process.env.KADR_DESKTOP === '1'
}

function getBaseUrl (fallback = 'http://localhost:3000') {
  return String(process.env.BASE_URL || fallback).replace(/\/$/, '')
}

// The desktop build serves the portal at its own root, not under /admin.
function getPortalUrl (fallback) {
  const base = getBaseUrl(fallback)
  if (!base) return ''
  return isDesktopMode() ? base : `${base}/admin`
}

module.exports = { isDesktopMode, getBaseUrl, getPortalUrl }
