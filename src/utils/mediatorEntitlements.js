/** Route name → premium feature key (must match backend premium_feature_catalog). */
export const ROUTE_PREMIUM_FEATURES = {}

export function hasUnlockedFeature (features, featureKey) {
  if (!featureKey || !Array.isArray(features)) return false
  return features.some((f) => f.featureKey === featureKey && f.unlocked)
}

export function isPremiumGateError (error) {
  const apiErr = error?.response?.data?.error
  const code = apiErr?.errorCode
  const message = apiErr?.message || error?.message || ''
  return code === 'E320' || /pro subscription/i.test(message)
}

export function routeRequiresPremium (route) {
  return route?.meta?.premiumFeature || ROUTE_PREMIUM_FEATURES[route?.name] || null
}

export function mediatorCanAccessRoute (features, route) {
  const featureKey = routeRequiresPremium(route)
  if (!featureKey) return true
  return hasUnlockedFeature(features, featureKey)
}

/** Remove sidebar links for locked premium features; drop empty groups. */
export function filterMediatorSidebar (items, features) {
  if (!Array.isArray(items)) return []
  return items
    .map((item) => {
      if (item.children && item.children.length) {
        const children = item.children.filter((child) => {
          if (!child.premiumFeature) return true
          return hasUnlockedFeature(features, child.premiumFeature)
        })
        if (!children.length) return null
        return { ...item, children }
      }
      if (item.premiumFeature && !hasUnlockedFeature(features, item.premiumFeature)) {
        return null
      }
      return item
    })
    .filter(Boolean)
}
