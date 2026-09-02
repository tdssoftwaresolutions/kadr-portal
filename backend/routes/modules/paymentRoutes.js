const express = require('express')
const paymentGatewayController = require('../../controller/paymentGatewayController')
const authMiddleware = require('../../middleware/authMiddleware')
const { authLimiter } = require('../../middleware/rateLimitMiddleware')

const router = express.Router()

router.get('/config', paymentGatewayController.getConfig)
router.get('/amounts', paymentGatewayController.getAmounts)

router.post('/initiate', authLimiter, authMiddleware, paymentGatewayController.initiate)
router.post('/verify', authLimiter, authMiddleware, paymentGatewayController.verify)

router.post('/return/payu', paymentGatewayController.payuReturn)
router.get('/return/payu', paymentGatewayController.payuReturn)
router.post('/webhook/cashfree', paymentGatewayController.cashfreeWebhook)
router.post('/webhook/phonepe', paymentGatewayController.phonepeWebhook)

module.exports = router
