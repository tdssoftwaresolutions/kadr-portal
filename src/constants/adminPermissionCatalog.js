/** Keys must match server utils/adminPermissionHelpers.js and SideBarAdmin.json adminPage fields */

import {
  buildAdminPagePermissionLayout,
  getAllAdminPageKeysFromSidebar
} from '../utils/adminNavPermissions'

const adminPageLayout = buildAdminPagePermissionLayout()

export const ADMIN_PAGE_GROUPS = adminPageLayout.groups

export const ADMIN_STANDALONE_PAGES = adminPageLayout.standalone

export const ADMIN_PAGE_OPTIONS = [
  ...ADMIN_STANDALONE_PAGES,
  ...ADMIN_PAGE_GROUPS.flatMap((g) => g.pages)
]

export const ALL_ADMIN_PAGE_KEYS = getAllAdminPageKeysFromSidebar()

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
