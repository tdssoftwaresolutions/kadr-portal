/**
 * Extract YouTube video id from common URL shapes (watch, embed, shorts, youtu.be).
 * @param {string} input
 * @returns {string|null} 11-character id or null
 */
function extractYoutubeVideoId (input) {
  if (!input || typeof input !== 'string') return null
  const trimmed = input.trim()
  const patterns = [
    /(?:youtube\.com\/watch\?[^#]*[&?]v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/
  ]
  for (const p of patterns) {
    const m = trimmed.match(p)
    if (m) return m[1]
  }
  return null
}

function embedUrlFromVideoId (videoId, autoplay = false) {
  const q = new URLSearchParams({ rel: '0', modestbranding: '1', playsinline: '1' })
  if (autoplay) q.set('autoplay', '1')
  return `https://www.youtube-nocookie.com/embed/${videoId}?${q.toString()}`
}

module.exports = {
  extractYoutubeVideoId,
  embedUrlFromVideoId
}
