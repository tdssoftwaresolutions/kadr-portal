const { createError } = require('../utils/errors')
const errorCodes = require('../utils/errors/errorCodes')

function validate (schema, source = 'body') {
  return (req, res, next) => {
    // `source` may be a dotted path (e.g. 'body.userDetails') so schemas can
    // target a nested payload envelope.
    const segments = source.split('.')
    let data = req
    for (const segment of segments) {
      data = data == null ? undefined : data[segment]
    }
    const result = schema.safeParse(data)
    if (!result.success) {
      // Zod v4 exposes validation problems on `.issues` (`.errors` is a
      // deprecated alias that is undefined in some builds). Fall back safely.
      const issues = result.error.issues || result.error.errors || []
      const message = issues.map((e) => e.message).join('; ') || 'Invalid request.'
      return next(createError(errorCodes.INVALID_REQUEST, { message }))
    }
    // Write the parsed/coerced data back to the same (possibly nested) path.
    let target = req
    for (let i = 0; i < segments.length - 1; i++) {
      const segment = segments[i]
      if (target[segment] == null || typeof target[segment] !== 'object') {
        target[segment] = {}
      }
      target = target[segment]
    }
    target[segments[segments.length - 1]] = result.data
    next()
  }
}

module.exports = validate
