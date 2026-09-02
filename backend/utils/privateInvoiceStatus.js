const PRIVATE_INVOICE_STATUSES = ['ISSUED', 'SENT', 'PAID']

/** Treat null, undefined, '', and string "null" as no filter. */
function normalizeFilterParam (value) {
  if (value == null) return null
  const s = String(value).trim()
  if (!s || s.toLowerCase() === 'null' || s.toLowerCase() === 'undefined') return null
  return s
}

function labelForPrivateStatus (status) {
  switch (String(status || '').toUpperCase()) {
    case 'PAID':
      return 'Paid'
    case 'SENT':
      return 'Sent to client'
    case 'ISSUED':
      return 'Unpaid'
    case 'DRAFT':
      return 'Unpaid'
    default:
      return status || '—'
  }
}

function isPrivateInvoicePaid (status) {
  return String(status || '').toUpperCase() === 'PAID'
}

function resolvePrivateInvoiceStatus (status, fallback = 'ISSUED') {
  const key = String(status || '').trim().toUpperCase()
  if (PRIVATE_INVOICE_STATUSES.includes(key)) return key
  if (key === 'DRAFT' || !key) return fallback
  return fallback
}

/** Map unified income filter to private invoice DB statuses. */
function privateStatusesForFilter (filterStatus) {
  const normalized = normalizeFilterParam(filterStatus)
  if (!normalized) return null
  const key = normalized.toUpperCase()
  if (key === 'PENDING' || key === 'UNPAID') return ['ISSUED', 'SENT']
  if (key === 'DRAFT') return ['ISSUED']
  if (PRIVATE_INVOICE_STATUSES.includes(key)) return [key]
  return null
}

function kadrStatusForFilter (filterStatus) {
  const normalized = normalizeFilterParam(filterStatus)
  if (!normalized) return null
  const key = normalized.toUpperCase()
  if (key === 'PAID' || key === 'PENDING') return key
  return null
}

/** Fix legacy rows before Prisma reads (DRAFT / empty after enum migration). */
async function repairInvalidPrivateInvoiceStatuses (prisma) {
  try {
    await prisma.$executeRawUnsafe(`
      UPDATE \`mediator_private_invoices\`
      SET \`status\` = 'ISSUED'
      WHERE \`status\` = 'DRAFT'
         OR \`status\` = ''
         OR \`status\` IS NULL
    `)
  } catch (err) {
    // Enum may no longer include DRAFT — try ISSUED-only repair via cast
    try {
      await prisma.$executeRawUnsafe(`
        UPDATE \`mediator_private_invoices\`
        SET \`status\` = 'ISSUED'
        WHERE CAST(\`status\` AS CHAR) IN ('DRAFT', '')
           OR \`status\` IS NULL
      `)
    } catch (_) {
      console.warn('[private-invoice] status repair skipped:', err?.message || err)
    }
  }
}

module.exports = {
  PRIVATE_INVOICE_STATUSES,
  normalizeFilterParam,
  resolvePrivateInvoiceStatus,
  labelForPrivateStatus,
  isPrivateInvoicePaid,
  privateStatusesForFilter,
  kadrStatusForFilter,
  repairInvalidPrivateInvoiceStatuses
}
