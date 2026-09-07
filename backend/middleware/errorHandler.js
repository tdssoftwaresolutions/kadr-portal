const path = require('path')
const { AppError } = require('../utils/errors')
const { error } = require('../utils/responses')
const { record500Error } = require('../services/alerting/criticalAlertService')
const analytics = require('../utils/analytics')

module.exports = (err, req, res, next) => {
  if (!req.path.startsWith('/api')) {
    return res.status(err.statusCode || 404).sendFile(path.join(__dirname, '..', '..', 'public', 'website', '404.html'))
  }

  if (err instanceof AppError) {
    // Track only server-side (5xx) application errors here; 4xx are expected
    // client/validation errors and would add noise to reliability dashboards.
    if ((err.statusCode || 0) >= 500) {
      analytics.trackError({
        req,
        error: err,
        source: analytics.ERROR_SOURCES.APP,
        statusCode: err.statusCode
      })
    }
    return error(res, {
      code: err.errorCode,
      message: err.message,
      details: err.details
    }, err.statusCode)
  }

  // Unhandled error — track for alerting
  console.error('Unhandled Error:', err)
  record500Error({
    path: req.originalUrl || req.path,
    method: req.method,
    requestId: req.requestId,
    userId: req.user?.id,
    error: err
  })

  // Classify DB errors (Prisma) separately so leadership can see DB-related
  // failures distinctly from generic application errors.
  const isPrismaError = typeof err?.code === 'string' && /^P\d{4}$/.test(err.code)
  analytics.trackError({
    req,
    error: err,
    source: isPrismaError ? analytics.ERROR_SOURCES.DATABASE : analytics.ERROR_SOURCES.UNHANDLED,
    statusCode: 500,
    userId: req.user?.id
  })

  return error(res, {
    code: 'E000',
    message: 'Unexpected error occurred'
  }, 500)
}
