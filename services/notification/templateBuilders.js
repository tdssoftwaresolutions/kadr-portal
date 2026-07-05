/**
 * Code builders for templates that need dynamic HTML (dates, lists, conditionals).
 * DB row still controls subject override, active flag, and metadata; body is built at send time.
 */
const buildDailyDigest = require('./builders/dailyDigestBuilder')

const BUILDERS = {
  dailyDigest: buildDailyDigest
}

function hasBuilder (templateKey) {
  return Object.prototype.hasOwnProperty.call(BUILDERS, templateKey)
}

function runBuilder (templateKey, data = {}) {
  const fn = BUILDERS[templateKey]
  if (!fn) return null
  return fn(data)
}

module.exports = {
  BUILDERS,
  hasBuilder,
  runBuilder
}
