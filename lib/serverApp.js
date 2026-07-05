const path = require('path')
const express = require('express')
const cookieParser = require('cookie-parser')
const { scheduleDailyReminderJob } = require('../services/scheduler/dailyReminderScheduler')
const { scheduleSubscriptionExpiryJob } = require('../services/scheduler/subscriptionExpiryScheduler')
const { ensurePremiumFeatureCatalog } = require('../services/subscription/entitlementService')
const blogRedirectMiddleware = require('../middleware/blogRedirectMiddleware')
const corsMiddleware = require('../middleware/corsMiddleware')

function isDesktopMode () {
  return process.env.KADR_DESKTOP === '1'
}

function resolveDistPath (distPath) {
  return distPath || path.join(__dirname, '..', 'dist')
}

function createApp (options = {}) {
  const app = express()
  const distPath = resolveDistPath(options.distPath)

  app.use(corsMiddleware)
  app.use(express.json({ limit: '10mb' }))
  app.use(express.urlencoded({ limit: '10mb', extended: true }))
  app.use(cookieParser())
  app.use(blogRedirectMiddleware)

  app.use('/api', require('../routes/apiRoutes'))
  app.get('/health', (req, res) => res.send('OK'))

  if (isDesktopMode() || options.serveDesktopStatic) {
    app.use('/admin', express.static(distPath, { index: false }))
    app.get(/^\/admin(\/.*)?$/, (req, res, next) => {
      if (req.method !== 'GET') return next()
      res.sendFile(path.join(distPath, 'index.html'), (err) => {
        if (err) next(err)
      })
    })
  }

  app.use((req, res, next) => {
    if (!req.path.startsWith('/api') && req.method === 'GET') {
      if (isDesktopMode() && req.path.startsWith('/admin')) {
        return res.sendFile(path.join(distPath, 'index.html'))
      }
      return res.status(404).redirect('/404.html')
    }
    next()
  })

  app.use(require('../middleware/errorHandler'))
  return app
}

function runStartupTasks () {
  scheduleDailyReminderJob()
  scheduleSubscriptionExpiryJob()
  ensurePremiumFeatureCatalog().catch((err) => {
    console.error('[startup] Premium feature catalog seed failed', err)
  })
  if (process.env.WEBSITE_CONTENT_SEED_ON_STARTUP !== '0') {
    setTimeout(() => {
      const { ensureWebsiteDefaults } = require('../services/website/websiteContentService')
      ensureWebsiteDefaults().catch((err) => {
        if (!String(err?.message || '').includes('max_connections_per_hour')) {
          console.error('[startup] Website content seed failed', err)
        }
      })
    }, 3000)
  }
}

function startServer (options = {}) {
  const port = options.port ?? (Number(process.env.PORT) || 3000)
  const host = options.host ?? process.env.HOST ?? '0.0.0.0'
  const app = createApp(options)

  return new Promise((resolve, reject) => {
    const server = app.listen(port, host, () => {
      console.log(`API running on http://${host === '0.0.0.0' ? 'localhost' : host}:${port}`)
      if (options.runStartupTasks !== false) {
        runStartupTasks()
      }
      resolve({ app, server, port, host })
    })
    server.on('error', reject)
  })
}

module.exports = {
  createApp,
  startServer,
  isDesktopMode,
  runStartupTasks
}
