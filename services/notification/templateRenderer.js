const VARIABLE_PATTERN = /\{([a-zA-Z][a-zA-Z0-9_]*)\}/g

function extractVariables (...texts) {
  const found = new Set()
  for (const text of texts) {
    if (!text) continue
    let match
    const re = new RegExp(VARIABLE_PATTERN.source, 'g')
    while ((match = re.exec(String(text))) !== null) {
      found.add(match[1])
    }
  }
  return [...found].sort()
}

/**
 * Replace {var} placeholders when `data[var]` is defined.
 * Unmatched placeholders are left as-is.
 */
function renderTemplate (text, data = {}) {
  if (text == null || text === '') return text
  const map = data && typeof data === 'object' ? data : {}
  return String(text).replace(VARIABLE_PATTERN, (full, key) => {
    if (!Object.prototype.hasOwnProperty.call(map, key)) return full
    const val = map[key]
    if (val === null || val === undefined) return full
    return String(val)
  })
}

module.exports = {
  VARIABLE_PATTERN,
  extractVariables,
  renderTemplate
}
