import { ADMIN_PAGE_OPTIONS, ADMIN_COMPONENT_OPTIONS } from '../constants/adminPermissionCatalog'
import { orderedAdminRoutesFromSidebar, ROUTE_ADMIN_PAGE_FALLBACK } from './adminNavPermissions'

export { ROUTE_ADMIN_PAGE_FALLBACK }

export function adminUserHasPage (user, pageKey) {
  if (!user || user.type !== 'ADMIN') return true
  if (user.master) return true
  const raw = user.admin_permissions
  if (raw == null) return true
  if (typeof raw !== 'object' || !Array.isArray(raw.pages)) return false
  return raw.pages.includes(pageKey)
}

export function adminUserHasComponent (user, componentKey) {
  if (!user || user.type !== 'ADMIN') return true
  if (user.master) return true
  const raw = user.admin_permissions
  if (raw == null) return true
  if (typeof raw !== 'object' || !Array.isArray(raw.components)) return false
  return raw.components.includes(componentKey)
}

export function routeRequiredAdminPage (route) {
  if (!route || !route.meta || !route.meta.adminPage) {
    const name = route && route.name
    return ROUTE_ADMIN_PAGE_FALLBACK[name] || null
  }
  return route.meta.adminPage
}

export function adminCanAccessRoute (user, route) {
  if (!user || user.type !== 'ADMIN') return true
  const page = routeRequiredAdminPage(route)
  if (!page) return true
  return adminUserHasPage(user, page)
}

export function firstAllowedAdminRouteName (user, sidebarItems = null) {
  if (!user || user.type !== 'ADMIN') return 'dashboard.home'

  const routeOrder = sidebarItems
    ? orderedAdminRoutesFromSidebar(sidebarItems)
    : orderedAdminRoutesFromSidebar()

  for (const { name, page } of routeOrder) {
    if (adminUserHasPage(user, page)) return name
  }
  return null
}

export function firstAllowedAdminRouteFromFilteredSidebar (user, filteredSidebar) {
  return firstAllowedAdminRouteName(user, filteredSidebar)
}

function filterAdminSidebarItem (item, user) {
  if (!item) return null
  if (item.is_heading) return item

  if (item.children && item.children.length) {
    const children = item.children
      .map((child) => filterAdminSidebarItem(child, user))
      .filter(Boolean)
    if (!children.length) return null
    const next = { ...item, children }
    delete next.link
    return next
  }

  if (!item.link || !item.link.name) return null
  const page = item.adminPage || ROUTE_ADMIN_PAGE_FALLBACK[item.link.name]
  if (!page) return item
  return adminUserHasPage(user, page) ? item : null
}

export function filterAdminSidebarItems (items, user) {
  if (!user || user.type !== 'ADMIN' || !Array.isArray(items)) return items
  return items
    .map((item) => filterAdminSidebarItem(item, user))
    .filter(Boolean)
}

export function flattenSidebarItems (items) {
  if (!Array.isArray(items)) return []
  const result = []
  items.forEach((item) => {
    if (!item || item.is_heading) return
    if (item.children && item.children.length) {
      item.children.forEach((child) => {
        if (child && !child.is_heading && child.link) result.push(child)
      })
      return
    }
    if (item.link) result.push(item)
  })
  return result
}

export { ADMIN_PAGE_OPTIONS, ADMIN_COMPONENT_OPTIONS }
