const { PrismaClient } = require('@prisma/client')
const { createError } = require('../../utils/errors')
const errorCodes = require('../../utils/errors/errorCodes')
const { assertFeature } = require('../subscription/entitlementService')
const {
  resolvePrivateInvoiceStatus,
  repairInvalidPrivateInvoiceStatuses
} = require('../../utils/privateInvoiceStatus')

const prisma = new PrismaClient()

function roundMoney (n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100
}

function toNumber (value) {
  if (value == null) return 0
  if (typeof value === 'object' && typeof value.toNumber === 'function') {
    return value.toNumber()
  }
  return Number(value) || 0
}

function serializeInvoice (invoice) {
  if (!invoice) return invoice
  return {
    ...invoice,
    subtotal: toNumber(invoice.subtotal),
    cgst_total: toNumber(invoice.cgst_total),
    sgst_total: toNumber(invoice.sgst_total),
    grand_total: toNumber(invoice.grand_total),
    line_items: (invoice.line_items || []).map((line) => ({
      ...line,
      quantity: toNumber(line.quantity),
      unit_amount: toNumber(line.unit_amount),
      cgst_pct: toNumber(line.cgst_pct),
      sgst_pct: toNumber(line.sgst_pct),
      cgst_amount: toNumber(line.cgst_amount),
      sgst_amount: toNumber(line.sgst_amount),
      line_total: toNumber(line.line_total)
    }))
  }
}

function computeLine (line) {
  const qty = Number(line.quantity) || 1
  const unit = Number(line.unit_amount) || 0
  const taxable = roundMoney(qty * unit)
  const cgstPct = Number(line.cgst_pct) || 0
  const sgstPct = Number(line.sgst_pct) || 0
  const cgstAmount = roundMoney(taxable * (cgstPct / 100))
  const sgstAmount = roundMoney(taxable * (sgstPct / 100))
  const lineTotal = roundMoney(taxable + cgstAmount + sgstAmount)
  return {
    taxable,
    cgstAmount,
    sgstAmount,
    lineTotal
  }
}

function computeInvoiceTotals (lines) {
  let subtotal = 0
  let cgstTotal = 0
  let sgstTotal = 0
  for (const line of lines) {
    const c = computeLine(line)
    subtotal += c.taxable
    cgstTotal += c.cgstAmount
    sgstTotal += c.sgstAmount
  }
  subtotal = roundMoney(subtotal)
  cgstTotal = roundMoney(cgstTotal)
  sgstTotal = roundMoney(sgstTotal)
  const grandTotal = roundMoney(subtotal + cgstTotal + sgstTotal)
  return { subtotal, cgstTotal, sgstTotal, grandTotal }
}

async function nextInvoiceNumber (mediatorId, tx = null) {
  const db = tx || prisma
  const count = await db.mediator_private_invoices.count({ where: { mediator_id: mediatorId } })
  const year = new Date().getFullYear()
  return `PI-${year}-${String(count + 1).padStart(4, '0')}`
}

async function getSettings (mediatorId) {
  let row = await prisma.mediator_invoice_settings.findUnique({
    where: { mediator_id: mediatorId }
  })
  if (!row) {
    const user = await prisma.user.findUnique({
      where: { id: mediatorId },
      select: { name: true, email: true, phone_number: true }
    })
    return {
      business_name: user?.name || '',
      email: user?.email || '',
      phone: user?.phone_number || '',
      gstin: '',
      address: '',
      logo_url: '',
      terms: '',
      signature_url: ''
    }
  }
  return row
}

async function saveSettings (mediatorId, payload) {
  await assertFeature(mediatorId, 'enhanced_invoices')
  const data = {
    business_name: payload.business_name != null ? String(payload.business_name).trim() : null,
    gstin: payload.gstin != null ? String(payload.gstin).trim() : null,
    email: payload.email != null ? String(payload.email).trim() : null,
    phone: payload.phone != null ? String(payload.phone).trim() : null,
    address: payload.address != null ? String(payload.address).trim() : null,
    logo_url: payload.logo_url != null ? String(payload.logo_url).trim() : null,
    terms: payload.terms != null ? String(payload.terms).trim() : null,
    signature_url: payload.signature_url != null ? String(payload.signature_url).trim() : null
  }
  return prisma.mediator_invoice_settings.upsert({
    where: { mediator_id: mediatorId },
    update: data,
    create: { mediator_id: mediatorId, ...data }
  })
}

async function listPrivateInvoices (mediatorId, { page = 1, perPage = 100, range, status } = {}) {
  await assertFeature(mediatorId, 'enhanced_invoices')
  const { buildInvoiceDateRange } = require('../../utils/invoiceDateRange')
  const {
    privateStatusesForFilter,
    normalizeFilterParam,
    repairInvalidPrivateInvoiceStatuses
  } = require('../../utils/privateInvoiceStatus')
  await repairInvalidPrivateInvoiceStatuses(prisma)
  const dateRange = buildInvoiceDateRange(range)
  const where = { mediator_id: mediatorId }
  const privateStatuses = privateStatusesForFilter(normalizeFilterParam(status))
  if (privateStatuses) {
    where.status = privateStatuses.length === 1 ? privateStatuses[0] : { in: privateStatuses }
  }
  if (dateRange) where.issue_date = dateRange
  const skip = (Math.max(1, page) - 1) * perPage
  const [items, total] = await Promise.all([
    prisma.mediator_private_invoices.findMany({
      where,
      orderBy: { created_at: 'desc' },
      skip,
      take: perPage,
      include: { line_items: { orderBy: { sort_order: 'asc' } } }
    }),
    prisma.mediator_private_invoices.count({ where })
  ])
  return {
    items: items.map(serializeInvoice),
    total,
    page: Math.max(1, page),
    perPage
  }
}

async function getPrivateInvoice (mediatorId, invoiceId, tx = null) {
  const db = tx || prisma
  if (!tx) await repairInvalidPrivateInvoiceStatuses(prisma)
  const inv = await db.mediator_private_invoices.findFirst({
    where: { id: invoiceId, mediator_id: mediatorId },
    include: { line_items: { orderBy: { sort_order: 'asc' } } }
  })
  if (!inv) throw createError(errorCodes.NOT_FOUND)
  return serializeInvoice(inv)
}

async function createPrivateInvoice (mediatorId, payload) {
  await assertFeature(mediatorId, 'enhanced_invoices')
  const lines = Array.isArray(payload.line_items) ? payload.line_items : []
  if (!lines.length) throw createError(errorCodes.MISSING_REQUIRED_DETAIL)
  if (!payload.client_name) throw createError(errorCodes.MISSING_REQUIRED_DETAIL)

  const totals = computeInvoiceTotals(lines)

  return prisma.$transaction(async (tx) => {
    const invoiceNumber = payload.invoice_number || await nextInvoiceNumber(mediatorId, tx)
    const inv = await tx.mediator_private_invoices.create({
      data: {
        mediator_id: mediatorId,
        invoice_number: invoiceNumber,
        client_name: String(payload.client_name).trim(),
        client_email: payload.client_email ? String(payload.client_email).trim() : null,
        issue_date: new Date(payload.issue_date || Date.now()),
        due_date: payload.due_date ? new Date(payload.due_date) : null,
        status: resolvePrivateInvoiceStatus(payload.status),
        subtotal: totals.subtotal,
        cgst_total: totals.cgstTotal,
        sgst_total: totals.sgstTotal,
        grand_total: totals.grandTotal,
        notes: payload.notes != null ? String(payload.notes).trim() : null
      }
    })

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const c = computeLine(line)
      await tx.mediator_private_invoice_lines.create({
        data: {
          invoice_id: inv.id,
          description: String(line.description || '').trim(),
          quantity: line.quantity ?? 1,
          unit_amount: line.unit_amount,
          cgst_pct: line.cgst_pct ?? 9,
          sgst_pct: line.sgst_pct ?? 9,
          cgst_amount: c.cgstAmount,
          sgst_amount: c.sgstAmount,
          line_total: c.lineTotal,
          sort_order: i
        }
      })
    }

    return getPrivateInvoice(mediatorId, inv.id, tx)
  })
}

async function updatePrivateInvoice (mediatorId, invoiceId, payload) {
  await assertFeature(mediatorId, 'enhanced_invoices')
  const lines = Array.isArray(payload.line_items) ? payload.line_items : null
  const totals = lines ? computeInvoiceTotals(lines) : null

  return prisma.$transaction(async (tx) => {
    await tx.mediator_private_invoices.update({
      where: { id: invoiceId },
      data: {
        ...(payload.client_name != null ? { client_name: String(payload.client_name).trim() } : {}),
        ...(payload.client_email != null ? { client_email: String(payload.client_email).trim() } : {}),
        ...(payload.issue_date != null ? { issue_date: new Date(payload.issue_date) } : {}),
        ...(payload.due_date !== undefined ? { due_date: payload.due_date ? new Date(payload.due_date) : null } : {}),
        ...(payload.status != null ? { status: resolvePrivateInvoiceStatus(payload.status) } : {}),
        ...(payload.notes !== undefined ? { notes: payload.notes } : {}),
        ...(totals
          ? {
              subtotal: totals.subtotal,
              cgst_total: totals.cgstTotal,
              sgst_total: totals.sgstTotal,
              grand_total: totals.grandTotal
            }
          : {})
      }
    })

    if (lines) {
      await tx.mediator_private_invoice_lines.deleteMany({ where: { invoice_id: invoiceId } })
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        const c = computeLine(line)
        await tx.mediator_private_invoice_lines.create({
          data: {
            invoice_id: invoiceId,
            description: String(line.description || '').trim(),
            quantity: line.quantity ?? 1,
            unit_amount: line.unit_amount,
            cgst_pct: line.cgst_pct ?? 9,
            sgst_pct: line.sgst_pct ?? 9,
            cgst_amount: c.cgstAmount,
            sgst_amount: c.sgstAmount,
            line_total: c.lineTotal,
            sort_order: i
          }
        })
      }
    }

    return getPrivateInvoice(mediatorId, invoiceId, tx)
  })
}

function buildInvoiceHtml (invoice, settings) {
  const linesHtml = (invoice.line_items || []).map((l) => `
    <tr>
      <td>${l.description}</td>
      <td style="text-align:right">${l.quantity}</td>
      <td style="text-align:right">₹${Number(l.unit_amount).toFixed(2)}</td>
      <td style="text-align:right">${l.cgst_pct}% / ${l.sgst_pct}%</td>
      <td style="text-align:right">₹${Number(l.cgst_amount).toFixed(2)}</td>
      <td style="text-align:right">₹${Number(l.sgst_amount).toFixed(2)}</td>
      <td style="text-align:right">₹${Number(l.line_total).toFixed(2)}</td>
    </tr>
  `).join('')

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Invoice ${invoice.invoice_number}</title>
  <style>
    body{font-family:Arial,sans-serif;color:#222;padding:24px;font-size:13px}
    .header{display:flex;justify-content:space-between;margin-bottom:24px}
    table{width:100%;border-collapse:collapse;margin:16px 0}
    th,td{border:1px solid #ddd;padding:8px}
    th{background:#f4f6f8}
    .totals{text-align:right;margin-top:12px}
    .footer{margin-top:32px;font-size:11px;color:#666;border-top:1px solid #eee;padding-top:12px}
    .sig{margin-top:24px}
  </style></head><body>
  <div class="header">
    <div>
      ${settings.logo_url ? `<img src="${settings.logo_url}" alt="Logo" style="max-height:48px"/>` : ''}
      <h2>${settings.business_name || ''}</h2>
      <p>${settings.address || ''}</p>
      <p>GSTIN: ${settings.gstin || '—'}</p>
      <p>${settings.email || ''} · ${settings.phone || ''}</p>
    </div>
    <div style="text-align:right">
      <h3>INVOICE</h3>
      <p><strong>${invoice.invoice_number}</strong></p>
      <p>Date: ${new Date(invoice.issue_date).toLocaleDateString('en-IN')}</p>
      ${invoice.due_date ? `<p>Due: ${new Date(invoice.due_date).toLocaleDateString('en-IN')}</p>` : ''}
    </div>
  </div>
  <p><strong>Bill To:</strong> ${invoice.client_name}${invoice.client_email ? ` (${invoice.client_email})` : ''}</p>
  <table>
    <thead><tr>
      <th>Description</th><th>Qty</th><th>Rate</th><th>CGST/SGST %</th><th>CGST</th><th>SGST</th><th>Total</th>
    </tr></thead>
    <tbody>${linesHtml}</tbody>
  </table>
  <div class="totals">
    <p>Subtotal: ₹${Number(invoice.subtotal).toFixed(2)}</p>
    <p>CGST: ₹${Number(invoice.cgst_total).toFixed(2)}</p>
    <p>SGST: ₹${Number(invoice.sgst_total).toFixed(2)}</p>
    <p><strong>Grand Total: ₹${Number(invoice.grand_total).toFixed(2)}</strong></p>
  </div>
  ${settings.terms ? `<p><strong>Terms:</strong><br/>${settings.terms.replace(/\n/g, '<br/>')}</p>` : ''}
  ${settings.signature_url ? `<div class="sig"><img src="${settings.signature_url}" alt="Signature" style="max-height:64px"/></div>` : ''}
  <div class="footer">Generated through Kadr Invoice Management</div>
</body></html>`
}

async function getInvoiceHtmlForPdf (mediatorId, invoiceId) {
  const [invoice, settings] = await Promise.all([
    getPrivateInvoice(mediatorId, invoiceId),
    getSettings(mediatorId)
  ])
  return buildInvoiceHtml(invoice, settings)
}

module.exports = {
  computeLine,
  computeInvoiceTotals,
  serializeInvoice,
  getSettings,
  saveSettings,
  listPrivateInvoices,
  getPrivateInvoice,
  createPrivateInvoice,
  updatePrivateInvoice,
  buildInvoiceHtml,
  getInvoiceHtmlForPdf
}
