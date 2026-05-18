function buildInvoiceDateRange (range) {
  const now = new Date()
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  if (range === 'THIS_MONTH') return { gte: new Date(now.getFullYear(), now.getMonth(), 1), lt: end }
  if (range === 'LAST_MONTH') return { gte: new Date(now.getFullYear(), now.getMonth() - 1, 1), lt: new Date(now.getFullYear(), now.getMonth(), 1) }
  if (range === 'LAST_3_MONTHS') return { gte: new Date(now.getFullYear(), now.getMonth() - 2, 1), lt: end }
  if (range === 'LAST_6_MONTHS') return { gte: new Date(now.getFullYear(), now.getMonth() - 5, 1), lt: end }
  return null
}

module.exports = { buildInvoiceDateRange }
