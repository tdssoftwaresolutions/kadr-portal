const express = require('express')
const cookieParser = require('cookie-parser')
require('dotenv').config()
const { scheduleDailyReminderJob } = require('./services/scheduler/dailyReminderScheduler')
const { scheduleSubscriptionExpiryJob } = require('./services/scheduler/subscriptionExpiryScheduler')
const { ensurePremiumFeatureCatalog } = require('./services/subscription/entitlementService')
const blogRedirectMiddleware = require('./middleware/blogRedirectMiddleware')

const app = express()
const port = process.env.PORT || 3000

app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ limit: '10mb', extended: true }))
app.use(cookieParser())

app.use(blogRedirectMiddleware)

// API only
app.use('/api', require('./routes/apiRoutes'))
app.get('/health', (req, res) => res.send('OK'))

app.use((req, res, next) => {
  if (!req.path.startsWith('/api') && req.method === 'GET') {
    return res.status(404).redirect('/404.html')
  }
  next()
})

app.use(require('./middleware/errorHandler'))

app.listen(port, () => {
  console.log(`API running on ${port}`)
  scheduleDailyReminderJob()
  scheduleSubscriptionExpiryJob()
  ensurePremiumFeatureCatalog().catch((err) => {
    console.error('[startup] Premium feature catalog seed failed', err)
  })
})
