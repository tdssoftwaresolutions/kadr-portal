const AppError = require('./AppError')

function createError (codeKey, details = {}) {
  if (!codeKey) throw new Error(`Unknown error code: ${codeKey}`)

  return new AppError({
    message: details.message || codeKey.message,
    errorCode: codeKey.errorCode,
    statusCode: mapErrorToStatus(codeKey),
    details
  })
}

function mapErrorToStatus (codeKey) {
  const errorCode = String(codeKey.errorCode || '')
  // Match on message too — errorCode is like "E004", not "FORBIDDEN"
  const hint = `${errorCode} ${codeKey.message || ''}`.toUpperCase()

  if (errorCode === 'E003' || hint.includes('UNAUTHORIZED')) return 401
  if (errorCode === 'E004' || errorCode === 'E320' || hint.includes('FORBIDDEN') || hint.includes('PERMISSION')) return 403
  if (errorCode === 'E005' || errorCode === 'E008' || errorCode === 'E318' || hint.includes('NOT_FOUND') || hint.includes('NOT FOUND')) return 404
  if (
    hint.includes('CONFLICT') ||
    hint.includes('EXISTS') ||
    hint.includes('ALREADY') ||
    errorCode === 'E314' ||
    errorCode === 'E325' ||
    errorCode === 'E326' ||
    errorCode === 'E327'
  ) return 409
  if (
    hint.includes('INVALID') ||
    hint.includes('MISSING') ||
    errorCode === 'E312' ||
    errorCode === 'E315' ||
    errorCode === 'E316' ||
    errorCode === 'E310' ||
    errorCode === 'E311' ||
    errorCode === 'E111' ||
    errorCode === 'E323' ||
    errorCode === 'E324'
  ) return 400
  return 500
}

module.exports = { createError, AppError }
