const prisma = require('../lib/prisma.js')
const { createError } = require('./errors')
const errorCodes = require('./errors/errorCodes')

const ALL_ADMIN_PAGES = [
  'dashboard',
  'users',
  'cases',
  'messages',
  'calendar',
  'blog-taxonomy',
  'invoices',
  'reward-orders',
  'settings',
  'notifications',
  'website-content',
  'admins'
]

const ALL_ADMIN_COMPONENTS = ['stats', 'schedule', 'approvals', 'cases']

function isMasterAdmin (row) {
  return Boolean(row && row.master)
}

function isLegacyUnrestricted (row) {
  if (process.env.KADR_STRICT_ADMIN_PERMISSIONS === '1') return false
  if (!row || row.admin_permissions == null) return true
  return false
}

function adminHasPage (row, pageKey) {
  if (!row || row.user_type !== 'ADMIN') return false
  if (isMasterAdmin(row)) return true
  if (isLegacyUnrestricted(row)) return true
  const p = row.admin_permissions
  if (!p || typeof p !== 'object') return false
  if (!Array.isArray(p.pages)) return false
  return p.pages.includes(pageKey)
}

function adminHasComponent (row, componentKey) {
  if (!row || row.user_type !== 'ADMIN') return false
  if (isMasterAdmin(row)) return true
  if (isLegacyUnrestricted(row)) return true
  const p = row.admin_permissions
  if (!p || typeof p !== 'object') return false
  if (!Array.isArray(p.components)) return false
  return p.components.includes(componentKey)
}

function normalizeIncomingPermissions (body) {
  if (body == null) return null
  if (typeof body !== 'object') throw createError(errorCodes.INVALID_REQUEST)
  const pages = Array.isArray(body.pages) ? body.pages.filter((k) => ALL_ADMIN_PAGES.includes(k)) : []
  const components = Array.isArray(body.components) ? body.components.filter((k) => ALL_ADMIN_COMPONENTS.includes(k)) : []
  return { pages, components }
}

function defaultFullPermissions () {
  return { pages: [...ALL_ADMIN_PAGES], components: [...ALL_ADMIN_COMPONENTS] }
}

async function loadAdminPermRow (userId) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { master: true, admin_permissions: true, user_type: true }
  })
}

async function assertAdminPage (req, pageKey) {
  if (req.user.type !== 'ADMIN') throw createError(errorCodes.FORBIDDEN)
  const row = await loadAdminPermRow(req.user.id)
  if (!row || row.user_type !== 'ADMIN') throw createError(errorCodes.FORBIDDEN)
  if (!adminHasPage(row, pageKey)) throw createError(errorCodes.FORBIDDEN)
}

async function assertAdminPageAny (req, pageKeys) {
  if (req.user.type !== 'ADMIN') throw createError(errorCodes.FORBIDDEN)
  const row = await loadAdminPermRow(req.user.id)
  if (!row || row.user_type !== 'ADMIN') throw createError(errorCodes.FORBIDDEN)
  const keys = Array.isArray(pageKeys) ? pageKeys : []
  for (const k of keys) {
    if (adminHasPage(row, k)) return
  }
  throw createError(errorCodes.FORBIDDEN)
}

async function assertAdminComponent (req, componentKey) {
  if (req.user.type !== 'ADMIN') throw createError(errorCodes.FORBIDDEN)
  const row = await loadAdminPermRow(req.user.id)
  if (!row || row.user_type !== 'ADMIN') throw createError(errorCodes.FORBIDDEN)
  if (!adminHasComponent(row, componentKey)) throw createError(errorCodes.FORBIDDEN)
}

async function assertAdminUsersOrApprovals (req) {
  if (req.user.type !== 'ADMIN') throw createError(errorCodes.FORBIDDEN)
  const row = await loadAdminPermRow(req.user.id)
  if (!row || row.user_type !== 'ADMIN') throw createError(errorCodes.FORBIDDEN)
  if (adminHasPage(row, 'users') || adminHasComponent(row, 'approvals')) return
  throw createError(errorCodes.FORBIDDEN)
}

module.exports = {
  ALL_ADMIN_PAGES,
  ALL_ADMIN_COMPONENTS,
  adminHasPage,
  adminHasComponent,
  normalizeIncomingPermissions,
  defaultFullPermissions,
  loadAdminPermRow,
  assertAdminPage,
  assertAdminPageAny,
  assertAdminComponent,
  assertAdminUsersOrApprovals
}
