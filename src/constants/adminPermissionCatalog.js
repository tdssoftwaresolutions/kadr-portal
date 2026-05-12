/** Keys must match server utils/adminPermissionHelpers.js */

export const ADMIN_PAGE_OPTIONS = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'users', label: 'Clients & experts' },
  { key: 'cases', label: 'Case management' },
  { key: 'messages', label: 'Message center' },
  { key: 'calendar', label: 'Meetings calendar' },
  { key: 'blog-taxonomy', label: 'Blog taxonomy' },
  { key: 'invoices', label: 'Payments & invoices' },
  { key: 'settings', label: 'Settings' },
  { key: 'admins', label: 'Admin management' }
]

export const ADMIN_COMPONENT_OPTIONS = [
  { key: 'stats', label: 'Dashboard: case/client/mediator counts' },
  { key: 'schedule', label: "Dashboard: today's meetings" },
  { key: 'approvals', label: 'Dashboard: approve new users & experts' },
  { key: 'cases', label: 'Dashboard: active case workspace' }
]

export function defaultAdminPermissionPayload () {
  return {
    pages: ADMIN_PAGE_OPTIONS.map((p) => p.key),
    components: ADMIN_COMPONENT_OPTIONS.map((c) => c.key)
  }
}
