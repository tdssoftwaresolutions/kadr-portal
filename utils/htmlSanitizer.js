const sanitizeHtml = require('sanitize-html')

const DEFAULT_OPTIONS = {
  allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'h1', 'h2', 'span']),
  allowedAttributes: {
    ...sanitizeHtml.defaults.allowedAttributes,
    img: ['src', 'alt', 'title', 'width', 'height'],
    a: ['href', 'name', 'target', 'rel']
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  transformTags: {
    a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer' })
  }
}

function sanitizeRichHtml (html) {
  if (!html || typeof html !== 'string') return ''
  return sanitizeHtml(html, DEFAULT_OPTIONS)
}

function sanitizePlainText (text) {
  if (!text || typeof text !== 'string') return ''
  return sanitizeHtml(text, { allowedTags: [], allowedAttributes: {} }).trim()
}

module.exports = {
  sanitizeRichHtml,
  sanitizePlainText
}
