class AppError extends Error {
  constructor ({ message, errorCode, statusCode = 500, details = {} }) {
    super(message)
    this.statusCode = statusCode
    this.errorCode = errorCode
    this.details = details
  }
}

module.exports = AppError
