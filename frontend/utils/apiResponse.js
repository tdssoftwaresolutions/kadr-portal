/**
 * Extract payload from API / store action result.
 * Supports:
 *   { success, data: { items, ... } }
 *   { success, items, ... }  (flattened by parseApiResponse)
 */
export function extractApiPayload (result) {
  if (!result || result.success === false) return null

  if (result.data != null && typeof result.data === 'object' && !Array.isArray(result.data)) {
    return result.data
  }

  const { success, message, error, data, ...rest } = result
  if (Object.keys(rest).length > 0) {
    return rest
  }

  return null
}

export function extractFeedItems (result) {
  const payload = extractApiPayload(result)
  if (!payload) return []
  return Array.isArray(payload.items) ? payload.items : []
}

export function extractFeedCatalog (result) {
  const payload = extractApiPayload(result)
  if (!payload) return []
  return Array.isArray(payload.feeds) ? payload.feeds : []
}

/** @deprecated use extractApiPayload */
export function pickApiPayload (result) {
  const payload = extractApiPayload(result)
  if (!payload) return null
  return { success: true, ...payload }
}

export function unwrapApiBody (body) {
  if (!body || typeof body !== 'object') return { success: false }
  if (body.success === false) return body
  if (body.data != null && typeof body.data === 'object' && !Array.isArray(body.data)) {
    return { success: body.success !== false, message: body.message, ...body.data }
  }
  const { data, error, ...rest } = body
  return { success: body.success !== false, ...rest }
}
