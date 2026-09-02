require('dotenv').config()
require('./services/notification/registerCodeTriggers')
const { startServer } = require('./lib/serverApp')
const {
  alertUnhandledException,
  alertUnhandledRejection,
  alertStartupFailure
} = require('./services/alerting/criticalAlertService')

// Global uncaught error handlers
process.on('uncaughtException', (error) => {
  console.error('[FATAL] Uncaught Exception:', error)
  alertUnhandledException(error)
  // Allow time for the alert email to send before exiting
  setTimeout(() => process.exit(1), 3000)
})

process.on('unhandledRejection', (reason) => {
  console.error('[FATAL] Unhandled Rejection:', reason)
  alertUnhandledRejection(reason)
})

const port = Number(process.env.PORT) || 3000

startServer({ port }).catch((err) => {
  console.error('Failed to start server', err)
  alertStartupFailure(err)
  setTimeout(() => process.exit(1), 3000)
})
