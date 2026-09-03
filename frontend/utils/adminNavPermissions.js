import SideBarAdmin from '../config/navigation/SideBarAdmin.json'

export const ROUTE_ADMIN_PAGE_FALLBACK = {
  'dashboard.home': 'dashboard',
  'app.users': 'users',
  'app.cases': 'cases',
  'app.messages': 'messages',
  'app.admin-calendar': 'calendar',
  'app.blog-taxonomy': 'blog-taxonomy',
  'app.invoices': 'invoices',
  'app.settings': 'settings',
  'app.admins': 'admins',
  'app.reward-orders': 'reward-orders'
}

function pageKeyForNavItem (item) {
  if (!item) return null
  return item.adminPage || (item.link && ROUTE_ADMIN_PAGE_FALLBACK[item.link.name]) || null
}

function isNavGroup (item) {
  return !!(item && item.children && item.children.length && (!item.link || item.is_group))
}

/**
 * Page permission groups aligned with compact admin sidebar (SideBarAdmin.json).
 */
export function buildAdminPagePermissionLayout (sidebar = SideBarAdmin) {
  const standalone = []
  const groups = []

  sidebar.forEach((item) => {
    if (!item || item.is_heading) return

    if (isNavGroup(item)) {
      const pages = item.children
        .map((child) => {
          const key = pageKeyForNavItem(child)
          if (!key) return null
          return { key, label: child.title }
        })
        .filter(Boolean)

      if (pages.length) {
        groups.push({
          key: item.name,
          label: item.title,
          pages
        })
      }
      return
    }

    const key = pageKeyForNavItem(item)
    if (key && item.link) {
      standalone.push({ key, label: item.title })
    }
  })

  return { standalone, groups }
}

export function getAllAdminPageKeysFromSidebar (sidebar = SideBarAdmin) {
  const keys = new Set()
  const { standalone, groups } = buildAdminPagePermissionLayout(sidebar)
  standalone.forEach((p) => keys.add(p.key))
  groups.forEach((g) => g.pages.forEach((p) => keys.add(p.key)))
  return [...keys]
}

export function orderedAdminRoutesFromSidebar (sidebar = SideBarAdmin) {
  const routes = []
  sidebar.forEach((item) => {
    if (!item || item.is_heading) return
    if (isNavGroup(item)) {
      item.children.forEach((child) => {
        if (child && child.link && child.link.name) {
          const page = pageKeyForNavItem(child)
          if (page) routes.push({ name: child.link.name, page })
        }
      })
      return
    }
    if (item.link && item.link.name) {
      const page = pageKeyForNavItem(item)
      if (page) routes.push({ name: item.link.name, page })
    }
  })
  return routes
}
