const prisma = require('../lib/prisma.js')
const { createError } = require('../utils/errors')
const errorCodes = require('../utils/errors/errorCodes')
const { success } = require('../utils/responses')
const helper = require('../utils/helper')
const { renderPdfFromHtml, sendPdfResponse } = require('../utils/pdfFromHtml')
const { assertAdminPage } = require('../utils/adminPermissionHelpers')
const { getMediatorIncomeOverview } = require('../services/invoice/mediatorIncomeService')

const {
  toNumber,
  toMoney,
  getOrCreateSettings,
  createInvoiceForCase
} = require('../services/invoice/invoiceService')

function buildDateRange (range) {
  const now = new Date()
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  if (range === 'THIS_MONTH') return { gte: new Date(now.getFullYear(), now.getMonth(), 1), lt: end }
  if (range === 'LAST_MONTH') return { gte: new Date(now.getFullYear(), now.getMonth() - 1, 1), lt: new Date(now.getFullYear(), now.getMonth(), 1) }
  if (range === 'LAST_3_MONTHS') return { gte: new Date(now.getFullYear(), now.getMonth() - 2, 1), lt: end }
  if (range === 'LAST_6_MONTHS') return { gte: new Date(now.getFullYear(), now.getMonth() - 5, 1), lt: end }
  return null
}

module.exports = {
  getAdminSettings: async function (req, res, next) {
    try {
      if (req.user.type !== 'ADMIN') throw createError(errorCodes.FORBIDDEN)
      await assertAdminPage(req, 'settings')
      const settings = await getOrCreateSettings()
      success(res, { settings })
    } catch (error) {
      next(error)
    }
  },
  saveAdminSettings: async function (req, res, next) {
    try {
      if (req.user.type !== 'ADMIN') throw createError(errorCodes.FORBIDDEN)
      await assertAdminPage(req, 'settings')
      const settings = Array.isArray(req.body.settings) ? req.body.settings : []
      if (!settings.length) throw createError(errorCodes.MISSING_REQUIRED_DETAIL)

      for (const row of settings) {
        const key = String(row.key || '').trim()
        const label = String(row.label || '').trim()
        const value = String(row.value ?? '').trim()
        if (!key || !label || value === '') throw createError(errorCodes.INVALID_REQUEST)
        await prisma.admin_settings.upsert({
          where: { key },
          update: { label, value },
          create: { key, label, value }
        })
      }
      const latest = await getOrCreateSettings()
      success(res, { settings: latest }, 'Settings saved successfully')
    } catch (error) {
      next(error)
    }
  },
  updateCaseMediatorCommission: async function (req, res, next) {
    try {
      if (req.user.type !== 'ADMIN') throw createError(errorCodes.FORBIDDEN)
      await assertAdminPage(req, 'cases')
      const { caseId, mediator_commission } = req.body
      const commission = toNumber(mediator_commission, NaN)
      if (!caseId || Number.isNaN(commission) || commission < 0) throw createError(errorCodes.INVALID_REQUEST)

      await prisma.cases.update({
        where: { id: caseId },
        data: { mediator_commission: commission }
      })
      success(res, {}, 'Mediator revenue share for this case has been updated')
    } catch (error) {
      next(error)
    }
  },
  saveMediatorBankAccount: async function (req, res, next) {
    try {
      if (req.user.type !== 'MEDIATOR') throw createError(errorCodes.FORBIDDEN)
      const { bank_name, account_holder, account_number, ifsc_code, branch_name, upi_id } = req.body
      if (!bank_name || !account_holder || !account_number || !ifsc_code) throw createError(errorCodes.MISSING_REQUIRED_DETAIL)
      const saved = await prisma.mediator_bank_accounts.upsert({
        where: { mediator_id: req.user.id },
        update: { bank_name, account_holder, account_number, ifsc_code, branch_name, upi_id },
        create: {
          mediator_id: req.user.id,
          bank_name,
          account_holder,
          account_number,
          ifsc_code,
          branch_name,
          upi_id
        }
      })
      success(res, { bankAccount: saved }, 'Bank details saved successfully')
    } catch (error) {
      next(error)
    }
  },
  getMediatorBankAccount: async function (req, res, next) {
    try {
      const mediatorId = req.query.mediatorId || req.user.id
      if (req.user.type === 'ADMIN') await assertAdminPage(req, 'invoices')
      if (req.user.type === 'MEDIATOR' && mediatorId !== req.user.id) throw createError(errorCodes.FORBIDDEN)
      const bankAccount = await prisma.mediator_bank_accounts.findUnique({
        where: { mediator_id: mediatorId }
      })
      success(res, { bankAccount })
    } catch (error) {
      next(error)
    }
  },
  syncMediatorInvoices: async function (req, res, next) {
    try {
      if (req.user.type !== 'ADMIN') throw createError(errorCodes.FORBIDDEN)
      await assertAdminPage(req, 'invoices')
      const settings = await getOrCreateSettings()
      const transactions = await prisma.transactions.findMany({
        where: {
          success: true,
          reason: { contains: 'Mediation payment' }
        },
        include: { cases: true }
      })
      let created = 0
      for (const tx of transactions) {
        if (!tx.cases || !tx.cases.mediator) continue
        const inv = await createInvoiceForCase({ caseRecord: tx.cases, transaction: tx, settings })
        if (inv && inv.id) created += 1
      }
      success(res, { created }, 'Invoices synced successfully')
    } catch (error) {
      next(error)
    }
  },
  getMediatorIncome: async function (req, res, next) {
    try {
      if (req.user.type !== 'MEDIATOR') throw createError(errorCodes.FORBIDDEN)
      const { normalizeFilterParam } = require('../utils/privateInvoiceStatus')
      const data = await getMediatorIncomeOverview(req.user.id, {
        range: req.query.range || null,
        status: normalizeFilterParam(req.query.status),
        source: normalizeFilterParam(req.query.source)
      })
      success(res, data)
    } catch (error) {
      next(error)
    }
  },

  listInvoices: async function (req, res, next) {
    try {
      if (req.user.type === 'ADMIN') await assertAdminPage(req, 'invoices')
      const mediatorId = req.user.type === 'MEDIATOR' ? req.user.id : (req.query.mediatorId || undefined)
      const where = {}
      if (mediatorId) where.mediator_id = mediatorId
      if (req.query.status) where.status = req.query.status
      const range = buildDateRange(req.query.range)
      if (range) where.invoice_month = range
      const invoices = await prisma.mediator_invoices.findMany({
        where,
        orderBy: [{ invoice_month: 'desc' }, { created_at: 'desc' }],
        include: {
          user: { select: { id: true, name: true, email: true } },
          cases: { select: { id: true, caseId: true, mediator_commission: true } }
        }
      })

      const mediatorIds = [...new Set(invoices.map(i => i.mediator_id))]
      const bankByMediator = mediatorIds.length
        ? await prisma.mediator_bank_accounts.findMany({ where: { mediator_id: { in: mediatorIds } } })
        : []
      const bankMap = bankByMediator.reduce((acc, row) => {
        acc[row.mediator_id] = row
        return acc
      }, {})

      const totals = invoices.reduce((acc, inv) => {
        const net = toNumber(inv.net_payable)
        acc.total += net
        if (inv.status === 'PAID') acc.paid += net
        else acc.pending += net
        return acc
      }, { total: 0, paid: 0, pending: 0 })

      success(res, {
        invoices: invoices.map(inv => ({
          ...inv,
          bank_details: bankMap[inv.mediator_id] || null
        })),
        totals: {
          total: toMoney(totals.total),
          paid: toMoney(totals.paid),
          pending: toMoney(totals.pending)
        }
      })
    } catch (error) {
      next(error)
    }
  },
  listTransactionsForAdmin: async function (req, res, next) {
    try {
      if (req.user.type !== 'ADMIN') throw createError(errorCodes.FORBIDDEN)
      await assertAdminPage(req, 'invoices')
      const range = buildDateRange(req.query.range)
      const where = {}
      if (range) where.transaction_date = range
      const transactions = await prisma.transactions.findMany({
        where,
        orderBy: { transaction_date: 'desc' },
        include: {
          user: { select: { id: true, name: true, email: true, phone_number: true } },
          cases: { select: { id: true, caseId: true } }
        }
      })
      const totalIncome = transactions
        .filter(t => t.success)
        .reduce((sum, t) => sum + toNumber(t.amount), 0)
      success(res, {
        totalIncome: toMoney(totalIncome),
        transactions
      })
    } catch (error) {
      next(error)
    }
  },
  markInvoicePaid: async function (req, res, next) {
    try {
      if (req.user.type !== 'ADMIN') throw createError(errorCodes.FORBIDDEN)
      await assertAdminPage(req, 'invoices')
      const { invoiceId, notes } = req.body
      if (!invoiceId) throw createError(errorCodes.MISSING_REQUIRED_DETAIL)
      const existing = await prisma.mediator_invoices.findUnique({
        where: { id: invoiceId },
        include: { user: { select: { name: true, email: true } }, cases: { select: { caseId: true } } }
      })
      if (!existing) throw createError(errorCodes.NOT_FOUND)

      const invoice = await prisma.mediator_invoices.update({
        where: { id: invoiceId },
        data: {
          status: 'PAID',
          paid_at: new Date(),
          paid_by: req.user.id,
          notes: notes || null
        }
      })

      await helper.sendTemplatedEmail('mediatorInvoicePaymentDone', existing.user.email, {
        recipientName: existing.user.name,
        invoiceNumber: existing.invoice_number,
        caseId: existing.cases.caseId || existing.case_id,
        netPayable: existing.net_payable
      })

      success(res, { invoice }, 'Invoice marked as paid')
    } catch (error) {
      next(error)
    }
  },
  downloadInvoicePdf: async function (req, res, next) {
    try {
      const invoiceId = req.params.id
      if (!invoiceId) throw createError(errorCodes.MISSING_REQUIRED_DETAIL)
      if (req.user.type === 'ADMIN') await assertAdminPage(req, 'invoices')
      const invoice = await prisma.mediator_invoices.findUnique({
        where: { id: invoiceId },
        include: {
          user: { select: { id: true, name: true, email: true } },
          cases: { select: { caseId: true } }
        }
      })
      if (!invoice) throw createError(errorCodes.NOT_FOUND)
      if (req.user.type === 'MEDIATOR' && invoice.mediator_id !== req.user.id) throw createError(errorCodes.FORBIDDEN)

      const bankAccount = await prisma.mediator_bank_accounts.findUnique({
        where: { mediator_id: invoice.mediator_id }
      })
      const html = `
        <div style="font-family: Arial, sans-serif; padding: 24px; color: #222;">
          <h2 style="margin:0;">kADR.live</h2>
          <h3 style="margin-top: 6px;">Invoice</h3>
          <p><strong>Invoice #:</strong> ${invoice.invoice_number}</p>
          <p><strong>Mediator:</strong> ${invoice.user.name}</p>
          <p><strong>Case:</strong> ${invoice.cases.caseId || ''}</p>
          <table style="width:100%; border-collapse: collapse; margin-top: 12px;">
            <tr><th style="text-align:left; border:1px solid #ddd; padding:8px;">Item</th><th style="text-align:right; border:1px solid #ddd; padding:8px;">Amount (INR)</th></tr>
            <tr><td style="border:1px solid #ddd; padding:8px;">Mediation amount</td><td style="border:1px solid #ddd; padding:8px; text-align:right;">${invoice.mediation_amount}</td></tr>
            <tr><td style="border:1px solid #ddd; padding:8px;">Mediator revenue share (${invoice.commission_percentage}% of mediation amount)</td><td style="border:1px solid #ddd; padding:8px; text-align:right;">${invoice.commission_amount}</td></tr>
            <tr><td style="border:1px solid #ddd; padding:8px;">GST (${invoice.gst_percentage}%)</td><td style="border:1px solid #ddd; padding:8px; text-align:right;">-${invoice.gst_amount}</td></tr>
            <tr><td style="border:1px solid #ddd; padding:8px;">Tax (${invoice.tax_percentage}%)</td><td style="border:1px solid #ddd; padding:8px; text-align:right;">-${invoice.tax_amount}</td></tr>
            <tr><td style="border:1px solid #ddd; padding:8px;"><strong>Net payable</strong></td><td style="border:1px solid #ddd; padding:8px; text-align:right;"><strong>${invoice.net_payable}</strong></td></tr>
          </table>
          <h4 style="margin-top:16px;">Bank details</h4>
          <p style="margin: 0;">${bankAccount ? `${bankAccount.bank_name} | ${bankAccount.account_holder} | ${bankAccount.account_number} | ${bankAccount.ifsc_code}` : 'Not provided'}</p>
        </div>
      `
      const buffer = await renderPdfFromHtml(html)
      const filename = `${invoice.invoice_number || 'invoice'}.pdf`.replace(/[^\w.-]+/g, '_')
      sendPdfResponse(res, buffer, filename)
    } catch (error) {
      next(error)
    }
  }
}
