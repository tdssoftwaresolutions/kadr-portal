const AppError = require('./AppError')

function createError (codeKey, details = {}) {
  if (!codeKey) throw new Error(`Unknown error code: ${codeKey}`)

  return new AppError({
    message: codeKey.message,
    errorCode: codeKey.errorCode,
    statusCode: mapErrorCodeToStatus(codeKey.errorCode),
    details
  })
}

function mapErrorCodeToStatus (codeKey) {
  if (codeKey.includes('UNAUTHORIZED')) return 401
  if (codeKey.includes('FORBIDDEN')) return 403
  if (codeKey.includes('NOT_FOUND')) return 404
  if (codeKey.includes('CONFLICT') || codeKey.includes('EXISTS')) return 409
  if (codeKey.includes('INVALID') || codeKey.includes('MISSING')) return 400
  return 500
}

module.exports = { createError, AppError }
