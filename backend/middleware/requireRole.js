const { createError } = require('../utils/errors')
const errorCodes = require('../utils/errors/errorCodes')

function requireRole (...roles) {
  const allowed = roles.map((r) => String(r).toUpperCase())
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: errorCodes.NO_TOKEN_PROVIDED })
    }
    const userType = String(req.user.type || '').toUpperCase()
    if (!allowed.includes(userType)) {
      return next(createError(errorCodes.FORBIDDEN))
    }
    next()
  }
}

function requireAdmin (req, res, next) {
  return requireRole('ADMIN')(req, res, next)
}

function requireMediator (req, res, next) {
  return requireRole('MEDIATOR')(req, res, next)
}

function requireClient (req, res, next) {
  return requireRole('CLIENT')(req, res, next)
}

module.exports = {
  requireRole,
  requireAdmin,
  requireMediator,
  requireClient
}
