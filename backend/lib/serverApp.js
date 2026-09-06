const path = require('path')
const express = require('express')
const compression = require('compression')
const cookieParser = require('cookie-parser')
const { scheduleDailyReminderJob } = require('../services/scheduler/dailyReminderScheduler')
const { scheduleSubscriptionExpiryJob } = require('../services/scheduler/subscriptionExpiryScheduler')
const { scheduleMeetingReminderPushJob } = require('../services/scheduler/meetingReminderPushScheduler')
const { ensurePremiumFeatureCatalog } = require('../services/subscription/entitlementService')
const blogRedirectMiddleware = require('../middleware/blogRedirectMiddleware')
const corsMiddleware = require('../middleware/corsMiddleware')
const securityMiddleware = require('../middleware/securityMiddleware')
const { globalLimiter } = require('../middleware/rateLimitMiddleware')
const requestLogger = require('../middleware/requestLogger')
const { verifyCsrfToken, setCsrfCookie } = require('../middleware/csrfMiddleware')
const httpsRedirectMiddleware = require('../middleware/httpsRedirectMiddleware')
const { validateEnv } = require('../config/envValidation')
const { alertDatabaseFailure } = require('../services/alerting/criticalAlertService')
const prisma = require('./prisma')

function isDesktopMode () {
  return process.env.KADR_DESKTOP === '1'
}

function shouldServeAdminStatic (options = {}) {
  if (isDesktopMode() || options.serveDesktopStatic) return true
  if (process.env.SERVE_ADMIN_STATIC === '1') return true
  if (process.env.NODE_ENV === 'production' && process.env.SERVE_ADMIN_STATIC !== '0') return true
  return false
}

function shouldServeWebsiteStatic (options = {}) {
  if (options.serveWebsiteStatic) return true
  if (process.env.SERVE_WEBSITE_STATIC === '1') return true
  if (process.env.NODE_ENV === 'production' && process.env.SERVE_WEBSITE_STATIC !== '0') return true
  return false
}

function resolveDistPath (distPath) {
  return distPath || path.join(__dirname, '..', '..', 'dist')
}

function resolveWebsitePath (websitePath) {
  return websitePath || path.join(__dirname, '..', '..', 'public', 'website')
}

function createApp (options = {}) {
  validateEnv({ exitOnError: process.env.NODE_ENV === 'production' })
  const app = express()
  const distPath = resolveDistPath(options.distPath)
  const bodyLimit = process.env.REQUEST_BODY_LIMIT || '4mb'

  app.use(httpsRedirectMiddleware)
  app.use(securityMiddleware())
  app.use(compression())
  app.use(requestLogger)
  app.use(corsMiddleware)
  app.use(globalLimiter)

  // Capture raw body for webhook signature verification (Cashfree HMAC-SHA256).
  // Must be registered before express.json() so the raw buffer is still available.
  app.use('/api/payment/webhook/cashfree', (req, res, next) => {
    let data = ''
    req.setEncoding('utf8')
    req.on('data', (chunk) => { data += chunk })
    req.on('end', () => {
      req.rawBody = data
      try {
        req.body = JSON.parse(data)
      } catch (e) {
        req.body = {}
      }
      next()
    })
  })

  app.use(express.json({ limit: bodyLimit }))
  app.use(express.urlencoded({ limit: bodyLimit, extended: true }))
  app.use(cookieParser())
  app.use(verifyCsrfToken)
  app.use(setCsrfCookie)
  app.use(blogRedirectMiddleware)

  app.use('/api', require('../routes/apiRoutes'))
  app.get('/health', (req, res) => res.json({ status: 'ok', uptime: process.uptime() }))
  app.get('/health/ready', async (req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`
      res.json({ status: 'ready', database: 'ok' })
    } catch (err) {
      alertDatabaseFailure(err)
      res.status(503).json({ status: 'not_ready', database: 'error' })
    }
  })

  const serveAdmin = shouldServeAdminStatic(options)
  const serveWebsite = shouldServeWebsiteStatic(options)
  const websitePath = resolveWebsitePath(options.websitePath)

  if (serveAdmin) {
    app.use('/admin', express.static(distPath, { index: false }))
    app.get(/^\/admin(\/.*)?$/, (req, res, next) => {
      if (req.method !== 'GET') return next()
      res.sendFile(path.join(distPath, 'index.html'), (err) => {
        if (err) next(err)
      })
    })
  }

  if (serveWebsite) {
    app.use(express.static(websitePath))
  }

  app.use((req, res, next) => {
    if (!req.path.startsWith('/api') && req.method === 'GET') {
      if (serveAdmin && req.path.startsWith('/admin')) {
        return res.sendFile(path.join(distPath, 'index.html'))
      }
      if (serveWebsite) {
        return res.status(404).sendFile(path.join(websitePath, '404.html'))
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
  scheduleMeetingReminderPushJob()
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

      // Graceful shutdown
      const gracefulShutdown = (signal) => {
        console.log(`[shutdown] ${signal} received. Closing server gracefully...`)
        server.close(async () => {
          console.log('[shutdown] HTTP server closed.')
          try {
            await prisma.$disconnect()
            console.log('[shutdown] Database connection closed.')
          } catch (err) {
            console.error('[shutdown] Error disconnecting database:', err)
          }
          process.exit(0)
        })
        // Force exit if graceful shutdown takes too long
        setTimeout(() => {
          console.error('[shutdown] Forced exit after timeout.')
          process.exit(1)
        }, 15000)
      }

      process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
      process.on('SIGINT', () => gracefulShutdown('SIGINT'))

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
