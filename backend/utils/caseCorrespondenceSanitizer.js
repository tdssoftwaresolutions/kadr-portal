/**
 * Normalizes case correspondence message bodies. Contact details are allowed;
 * we only trim excessive whitespace for storage consistency.
 */

function sanitizeCorrespondenceBody (raw) {
  if (raw == null) return { text: '', hadPiiRemoved: false }
  const text = String(raw).replace(/\s{2,}/g, ' ').trim()
  return { text, hadPiiRemoved: false }
}

function sanitizeFileName (name) {
  if (!name || typeof name !== 'string') return 'attachment'
  const base = name.replace(/^.*[/\\]/, '').replace(/\s+/g, ' ').trim()
  const cleaned = base.replace(/[^a-zA-Z0-9._\- ]/g, '_').slice(0, 200)
  return cleaned || 'attachment'
}

module.exports = {
  sanitizeCorrespondenceBody,
  sanitizeFileName
}
