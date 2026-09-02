const express = require('express')
const financeController = require('../../controller/financeController')
const authMiddleware = require('../../middleware/authMiddleware')

const router = express.Router()

router.use(authMiddleware)

router.get('/invoices', financeController.listInvoices)
router.get('/invoices/:id/pdf', financeController.downloadInvoicePdf)

module.exports = router
