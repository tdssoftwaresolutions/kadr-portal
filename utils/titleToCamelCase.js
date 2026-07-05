function titleToCamelCase (title) {
  const words = String(title || '')
    .trim()
    .replace(/[^a-zA-Z0-9\s_-]/g, ' ')
    .split(/[\s_-]+/)
    .filter(Boolean)
  if (!words.length) return ''
  return words
    .map((w, i) => {
      const lower = w.toLowerCase()
      if (i === 0) return lower
      return lower.charAt(0).toUpperCase() + lower.slice(1)
    })
    .join('')
}

module.exports = { titleToCamelCase }
