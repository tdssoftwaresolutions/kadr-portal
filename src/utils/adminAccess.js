import { ADMIN_PAGE_OPTIONS, ADMIN_COMPONENT_OPTIONS } from '../constants/adminPermissionCatalog'

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

const ROUTE_ADMIN_PAGE_FALLBACK = {
  'dashboard.home': 'dashboard',
  'app.users': 'users',
  'app.cases': 'cases',
  'app.messages': 'messages',
  'app.admin-calendar': 'calendar',
  'app.blog-taxonomy': 'blog-taxonomy',
  'app.invoices': 'invoices',
  'app.settings': 'settings',
  'app.admins': 'admins'
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

const ADMIN_ROUTE_ORDER = [
  { name: 'dashboard.home', page: 'dashboard' },
  { name: 'app.admin-calendar', page: 'calendar' },
  { name: 'app.users', page: 'users' },
  { name: 'app.cases', page: 'cases' },
  { name: 'app.messages', page: 'messages' },
  { name: 'app.blog-taxonomy', page: 'blog-taxonomy' },
  { name: 'app.invoices', page: 'invoices' },
  { name: 'app.settings', page: 'settings' },
  { name: 'app.admins', page: 'admins' }
]

export function firstAllowedAdminRouteName (user) {
  if (!user || user.type !== 'ADMIN') return 'dashboard.home'
  for (const { name, page } of ADMIN_ROUTE_ORDER) {
    if (adminUserHasPage(user, page)) return name
  }
  return null
}

export function filterAdminSidebarItems (items, user) {
  if (!user || user.type !== 'ADMIN' || !Array.isArray(items)) return items
  return items.filter((item) => {
    if (item.is_heading || !item.link || !item.link.name) return true
    const page = item.adminPage || ROUTE_ADMIN_PAGE_FALLBACK[item.link.name]
    if (!page) return true
    return adminUserHasPage(user, page)
  })
}

export { ADMIN_PAGE_OPTIONS, ADMIN_COMPONENT_OPTIONS }
