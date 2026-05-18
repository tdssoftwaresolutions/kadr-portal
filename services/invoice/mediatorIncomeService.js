const { PrismaClient } = require('@prisma/client')
const { buildInvoiceDateRange } = require('../../utils/invoiceDateRange')
const { hasFeature } = require('../subscription/entitlementService')
const { serializeInvoice } = require('./privateInvoiceService')
const {
  labelForPrivateStatus,
  isPrivateInvoicePaid,
  privateStatusesForFilter,
  kadrStatusForFilter,
  normalizeFilterParam,
  repairInvalidPrivateInvoiceStatuses
} = require('../../utils/privateInvoiceStatus')

const prisma = new PrismaClient()

function toNumber (value) {
  if (value == null) return 0
  if (typeof value === 'object' && typeof value.toNumber === 'function') return value.toNumber()
  return Number(value) || 0
}

function roundMoney (n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100
}

function mapKadrRow (inv) {
  const net = toNumber(inv.net_payable)
  return {
    id: inv.id,
    source: 'KADR',
    invoice_number: inv.invoice_number,
    label: inv.cases?.caseId ? `Case #${inv.cases.caseId}` : 'Kadr mediation',
    client_name: null,
    amount: net,
    status: inv.status,
    issue_date: inv.invoice_month || inv.created_at,
    mediation_amount: toNumber(inv.mediation_amount),
    commission_amount: toNumber(inv.commission_amount),
    gst_amount: toNumber(inv.gst_amount),
    tax_amount: toNumber(inv.tax_amount),
    net_payable: net,
    canMarkPaid: false,
    raw: inv
  }
}

function mapPrivateRow (inv) {
  const total = toNumber(inv.grand_total)
  return {
    id: inv.id,
    source: 'PRIVATE',
    invoice_number: inv.invoice_number,
    label: inv.client_name,
    client_name: inv.client_name,
    client_email: inv.client_email,
    amount: total,
    status: inv.status,
    status_label: labelForPrivateStatus(inv.status),
    issue_date: inv.issue_date,
    grand_total: total,
    line_items: inv.line_items,
    canMarkPaid: false,
    raw: inv
  }
}

async function getMediatorIncomeOverview (mediatorId, { range, status, source } = {}) {
  status = normalizeFilterParam(status)
  source = normalizeFilterParam(source)
  const dateRange = buildInvoiceDateRange(range)
  const normalizedSource = source || 'ALL'
  const wantKadr = normalizedSource === 'ALL' || normalizedSource === 'KADR'
  const wantPrivate = normalizedSource === 'ALL' || normalizedSource === 'PRIVATE'
  const hasPrivate = wantPrivate ? await hasFeature(mediatorId, 'enhanced_invoices') : false

  if (wantPrivate && hasPrivate) {
    await repairInvalidPrivateInvoiceStatuses(prisma)
  }

  const kadrWhere = { mediator_id: mediatorId }
  const kadrStatus = kadrStatusForFilter(status)
  if (kadrStatus && wantKadr) kadrWhere.status = kadrStatus
  if (dateRange) kadrWhere.invoice_month = dateRange

  const privateWhere = { mediator_id: mediatorId }
  const privateStatuses = privateStatusesForFilter(status)
  if (privateStatuses && wantPrivate && hasPrivate) {
    privateWhere.status = privateStatuses.length === 1 ? privateStatuses[0] : { in: privateStatuses }
  }
  if (dateRange && hasPrivate) privateWhere.issue_date = dateRange

  const [kadrRows, privateRows] = await Promise.all([
    wantKadr
      ? prisma.mediator_invoices.findMany({
        where: kadrWhere,
        orderBy: [{ invoice_month: 'desc' }, { created_at: 'desc' }],
        include: {
          cases: { select: { id: true, caseId: true } }
        }
      })
      : Promise.resolve([]),
    wantPrivate && hasPrivate
      ? prisma.mediator_private_invoices.findMany({
        where: privateWhere,
        orderBy: { issue_date: 'desc' },
        include: { line_items: { orderBy: { sort_order: 'asc' } } }
      })
      : Promise.resolve([])
  ])

  const kadrItems = kadrRows.map(mapKadrRow)
  const privateItems = privateRows.map((inv) => mapPrivateRow(serializeInvoice(inv)))

  let items = []
  if (normalizedSource === 'KADR') items = kadrItems
  else if (normalizedSource === 'PRIVATE') items = privateItems
  else items = kadrItems.concat(privateItems).sort((a, b) => new Date(b.issue_date) - new Date(a.issue_date))

  const kadrStats = kadrItems.reduce((acc, row) => {
    acc.total += row.amount
    if (row.status === 'PAID') acc.paid += row.amount
    else acc.pending += row.amount
    return acc
  }, { total: 0, paid: 0, pending: 0 })

  const privateStats = privateItems.reduce((acc, row) => {
    acc.total += row.amount
    if (isPrivateInvoicePaid(row.status)) acc.paid += row.amount
    else acc.pending += row.amount
    return acc
  }, { total: 0, paid: 0, pending: 0 })

  const summary = {
    kadr: {
      total: roundMoney(kadrStats.total),
      paid: roundMoney(kadrStats.paid),
      pending: roundMoney(kadrStats.pending)
    },
    private: {
      total: roundMoney(privateStats.total),
      paid: roundMoney(privateStats.paid),
      pending: roundMoney(privateStats.pending),
      enabled: hasPrivate
    },
    combined: {
      total: roundMoney(kadrStats.total + privateStats.total),
      paid: roundMoney(kadrStats.paid + privateStats.paid),
      pending: roundMoney(kadrStats.pending + privateStats.pending)
    },
    transferredToAccount: roundMoney(kadrStats.paid),
    pendingFromKadr: roundMoney(kadrStats.pending),
    earnedFromKadr: roundMoney(kadrStats.total),
    earnedPrivate: roundMoney(privateStats.total)
  }

  return { items, summary, hasPrivateInvoices: hasPrivate }
}

module.exports = { getMediatorIncomeOverview }
