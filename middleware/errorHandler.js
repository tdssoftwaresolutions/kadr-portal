const path = require('path')
const { AppError } = require('../utils/errors')
const { error } = require('../utils/responses')

module.exports = (err, req, res, next) => {
  if (!req.path.startsWith('/api')) {
    return res.status(err.statusCode || 404).sendFile(path.join(__dirname, '..', 'public', 'website', '404.html'))
  }

  if (err instanceof AppError) {
    return error(res, {
      code: err.errorCode,
      message: err.message,
      details: err.details
    }, err.statusCode)
  }

  // Unhandled error
  console.error('Unhandled Error:', err)
  return error(res, {
    code: 'E000',
    message: 'Unexpected error occurred'
  }, 500)
}
