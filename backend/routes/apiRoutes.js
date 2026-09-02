const express = require('express')
const authRoutes = require('./modules/authRoutes')
const publicRoutes = require('./modules/publicRoutes')
const userRoutes = require('./modules/userRoutes')
const caseRoutes = require('./modules/caseRoutes')
const mediatorRoutes = require('./modules/mediatorRoutes')
const adminRoutes = require('./modules/adminRoutes')
const financeRoutes = require('./modules/financeRoutes')
const paymentRoutes = require('./modules/paymentRoutes')
const sseRoutes = require('./modules/sseRoutes')

const router = express.Router()

router.use(authRoutes)
router.use(publicRoutes)
router.use(sseRoutes)
router.use(userRoutes)
router.use('/payment', paymentRoutes)
router.use(caseRoutes)
router.use(mediatorRoutes)
router.use(financeRoutes)
router.use(adminRoutes)

module.exports = router
