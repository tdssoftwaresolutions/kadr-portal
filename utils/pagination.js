function parsePagination (query, { defaultPerPage = 20, maxPerPage = 100 } = {}) {
  const page = Math.max(1, parseInt(query.page, 10) || 1)
  const perPage = Math.min(maxPerPage, Math.max(1, parseInt(query.perPage, 10) || defaultPerPage))
  const skip = (page - 1) * perPage
  return { page, perPage, skip, take: perPage }
}

function parseDateRange (query) {
  const start = query.start ? new Date(query.start) : null
  const end = query.end ? new Date(query.end) : null
  if (start && Number.isNaN(start.getTime())) return { start: null, end: null }
  if (end && Number.isNaN(end.getTime())) return { start, end: null }
  return { start, end }
}

function paginatedResponse (items, total, { page, perPage }) {
  return {
    items,
    total,
    page,
    perPage,
    totalPages: Math.ceil(total / perPage) || 1
  }
}

module.exports = {
  parsePagination,
  parseDateRange,
  paginatedResponse
}
