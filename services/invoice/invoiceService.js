const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const { REWARD_SETTING_DEFAULTS } = require('../reward/rewardService')

const DEFAULT_SETTINGS = [
  { key: 'mediator_commission', label: 'Default mediator revenue share (% of mediation amount)', value: '5' },
  { key: 'invoice_gst_percentage', label: 'GST on invoice (%)', value: '0' },
  { key: 'invoice_tax_percentage', label: 'Tax on invoice (%)', value: '0' },
  ...REWARD_SETTING_DEFAULTS
]

function toNumber (value, fallback = 0) {
  const num = Number(value)
  return Number.isFinite(num) ? num : fallback
}

function toMoney (value) {
  return Number(toNumber(value).toFixed(2))
}

async function getOrCreateSettings () {
  for (const row of DEFAULT_SETTINGS) {
    await prisma.admin_settings.upsert({
      where: { key: row.key },
      update: { label: row.label },
      create: row
    })
  }
  return prisma.admin_settings.findMany({ orderBy: { label: 'asc' } })
}

function settingsToMap (settingsRows = []) {
  return settingsRows.reduce((acc, row) => {
    acc[row.key] = row.value
    return acc
  }, {})
}

async function createInvoiceForCase ({ caseRecord, transaction, settings }) {
  const alreadyCreated = await prisma.mediator_invoices.findFirst({
    where: { case_id: caseRecord.id }
  })
  if (alreadyCreated) return alreadyCreated

  if (!caseRecord.mediator) return null
  const amount = toNumber(transaction.amount, 0)
  const settingsMap = Array.isArray(settings) ? settingsToMap(settings) : settings
  const commissionPct = toNumber(caseRecord.mediator_commission, toNumber(settingsMap.mediator_commission, 5))
  const gstPct = toNumber(settingsMap.invoice_gst_percentage, 0)
  const taxPct = toNumber(settingsMap.invoice_tax_percentage, 0)
  const commissionAmount = toMoney((amount * commissionPct) / 100)
  const gstAmount = toMoney((commissionAmount * gstPct) / 100)
  const taxAmount = toMoney((commissionAmount * taxPct) / 100)
  const netPayable = toMoney(commissionAmount - gstAmount - taxAmount)

  const invoiceDate = transaction.transaction_date ? new Date(transaction.transaction_date) : new Date()
  const invoiceMonth = new Date(invoiceDate.getFullYear(), invoiceDate.getMonth(), 1)
  const invoiceNumber = `INV-${invoiceMonth.getFullYear()}${String(invoiceMonth.getMonth() + 1).padStart(2, '0')}-${caseRecord.caseId || caseRecord.id.slice(0, 8)}`

  return prisma.mediator_invoices.create({
    data: {
      case_id: caseRecord.id,
      mediator_id: caseRecord.mediator,
      invoice_month: invoiceMonth,
      invoice_number: invoiceNumber,
      mediation_amount: amount,
      commission_percentage: commissionPct,
      gst_percentage: gstPct,
      tax_percentage: taxPct,
      commission_amount: commissionAmount,
      gst_amount: gstAmount,
      tax_amount: taxAmount,
      net_payable: netPayable
    }
  })
}

async function ensureInvoiceForCase (caseId) {
  if (!caseId) return null
  const caseRecord = await prisma.cases.findUnique({
    where: { id: caseId },
    select: { id: true, caseId: true, mediator: true, mediator_commission: true }
  })
  if (!caseRecord || !caseRecord.mediator) return null

  const existing = await prisma.mediator_invoices.findFirst({ where: { case_id: caseId } })
  if (existing) return existing

  const transaction = await prisma.transactions.findFirst({
    where: {
      case_id: caseId,
      success: true,
      reason: { contains: 'Mediation payment' }
    },
    orderBy: { transaction_date: 'desc' }
  })
  if (!transaction) return null

  const settings = await getOrCreateSettings()
  return createInvoiceForCase({ caseRecord, transaction, settings })
}

module.exports = {
  toNumber,
  toMoney,
  getOrCreateSettings,
  settingsToMap,
  createInvoiceForCase,
  ensureInvoiceForCase
}
