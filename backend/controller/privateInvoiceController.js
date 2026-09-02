const { v4: uuidv4 } = require('uuid')
const { renderPdfFromHtml, sendPdfResponse } = require('../utils/pdfFromHtml')
const { success } = require('../utils/responses')
const { createError } = require('../utils/errors')
const errorCodes = require('../utils/errors/errorCodes')
const helper = require('../utils/helper')
const privateInvoiceService = require('../services/invoice/privateInvoiceService')
const { assertFeature } = require('../services/subscription/entitlementService')

const ALLOWED_ASSET_TYPES = new Set(['logo', 'signature'])

module.exports = {
  getInvoiceSettings: async function (req, res, next) {
    try {
      if (req.user.type !== 'MEDIATOR') throw createError(errorCodes.FORBIDDEN)
      const settings = await privateInvoiceService.getSettings(req.user.id)
      success(res, { settings })
    } catch (error) {
      next(error)
    }
  },

  uploadInvoiceAsset: async function (req, res, next) {
    try {
      if (req.user.type !== 'MEDIATOR') throw createError(errorCodes.FORBIDDEN)
      await assertFeature(req.user.id, 'enhanced_invoices')
      const { fileContent, assetType } = req.body
      if (!fileContent) throw createError(errorCodes.MISSING_REQUIRED_DETAIL)
      if (!ALLOWED_ASSET_TYPES.has(assetType)) throw createError(errorCodes.INVALID_REQUEST)
      const url = await helper.deployToS3Bucket(
        fileContent,
        `invoice-${assetType}-${uuidv4()}`
      )
      success(res, { url }, 'File uploaded.')
    } catch (error) {
      next(error)
    }
  },

  saveInvoiceSettings: async function (req, res, next) {
    try {
      if (req.user.type !== 'MEDIATOR') throw createError(errorCodes.FORBIDDEN)
      const settings = await privateInvoiceService.saveSettings(req.user.id, req.body)
      success(res, { settings }, 'Invoice settings saved.')
    } catch (error) {
      next(error)
    }
  },

  listPrivateInvoices: async function (req, res, next) {
    try {
      if (req.user.type !== 'MEDIATOR') throw createError(errorCodes.FORBIDDEN)
      const page = parseInt(req.query.page, 10) || 1
      const data = await privateInvoiceService.listPrivateInvoices(req.user.id, { page })
      success(res, data)
    } catch (error) {
      next(error)
    }
  },

  createPrivateInvoice: async function (req, res, next) {
    try {
      if (req.user.type !== 'MEDIATOR') throw createError(errorCodes.FORBIDDEN)
      const invoice = await privateInvoiceService.createPrivateInvoice(req.user.id, req.body)
      success(res, { invoice }, 'Invoice created.')
    } catch (error) {
      next(error)
    }
  },

  updatePrivateInvoice: async function (req, res, next) {
    try {
      if (req.user.type !== 'MEDIATOR') throw createError(errorCodes.FORBIDDEN)
      const invoice = await privateInvoiceService.updatePrivateInvoice(
        req.user.id,
        req.params.id,
        req.body
      )
      success(res, { invoice }, 'Invoice updated.')
    } catch (error) {
      next(error)
    }
  },

  downloadPrivateInvoicePdf: async function (req, res, next) {
    try {
      if (req.user.type !== 'MEDIATOR') throw createError(errorCodes.FORBIDDEN)
      await assertFeature(req.user.id, 'enhanced_invoices')
      const invoice = await privateInvoiceService.getPrivateInvoice(req.user.id, req.params.id)
      const html = await privateInvoiceService.getInvoiceHtmlForPdf(req.user.id, req.params.id)
      const buffer = await renderPdfFromHtml(html)
      const filename = `${invoice.invoice_number || 'private-invoice'}.pdf`.replace(/[^\w.-]+/g, '_')
      sendPdfResponse(res, buffer, filename)
    } catch (error) {
      next(error)
    }
  }
}
