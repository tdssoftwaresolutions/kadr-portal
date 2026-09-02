const { createError } = require('../utils/errors')
const errorCodes = require('../utils/errors/errorCodes')

function validate (schema, source = 'body') {
  return (req, res, next) => {
    const data = req[source]
    const result = schema.safeParse(data)
    if (!result.success) {
      const message = result.error.errors.map((e) => e.message).join('; ')
      return next(createError(errorCodes.INVALID_REQUEST, { message }))
    }
    req[source] = result.data
    next()
  }
}

module.exports = validate
