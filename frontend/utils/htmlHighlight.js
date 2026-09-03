/**
 * Escape text for safe HTML display in the highlight layer.
 */
export function escapeHtml (text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function highlightPlaceholders (escapedText) {
  return escapedText.replace(
    /\{([a-zA-Z][a-zA-Z0-9_]*)\}/g,
    '<span class="hl-placeholder">{</span><span class="hl-placeholder-name">$1</span><span class="hl-placeholder">}</span>'
  )
}

function highlightText (text) {
  if (!text) return ''
  return highlightPlaceholders(escapeHtml(text))
}

function highlightAttributeValue (rawValue) {
  const quoted = rawValue.match(/^(")(.*)"$/) || rawValue.match(/^(')(.*)'$/)
  if (quoted) {
    const q = quoted[1]
    const inner = highlightPlaceholders(escapeHtml(quoted[2]))
    return `${q}${inner}${q}`
  }
  return highlightPlaceholders(escapeHtml(rawValue))
}

function highlightAttributes (attrString) {
  if (!attrString || !attrString.trim()) return ''
  const re = /([\w:@.-]+)(\s*=\s*)("(?:[^"]*)"|'(?:[^']*)'|[^\s>]+)?/g
  let out = ''
  let last = 0
  let m
  while ((m = re.exec(attrString)) !== null) {
    out += escapeHtml(attrString.slice(last, m.index))
    out += `<span class="hl-attr-name">${escapeHtml(m[1])}</span>`
    if (m[2]) {
      out += escapeHtml(m[2])
      if (m[3]) {
        out += `<span class="hl-attr-value">${highlightAttributeValue(m[3])}</span>`
      }
    }
    last = m.index + m[0].length
  }
  out += escapeHtml(attrString.slice(last))
  return out
}

const VOID_TAGS = /^(area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)$/i

function highlightTag (tag) {
  const comment = tag.match(/^<!--([\s\S]*?)-->$/)
  if (comment) {
    return `<span class="hl-comment">${escapeHtml(tag)}</span>`
  }

  const m = tag.match(/^<(\/?)([\w:-]+)([^>]*)?(\/?)>$/)
  if (!m) return escapeHtml(tag)

  const slash = m[1]
  const tagName = m[2]
  const attrs = m[3] || ''
  const selfClose = m[4]

  const open = slash
    ? '<span class="hl-punct">&lt;</span><span class="hl-slash">/</span>'
    : '<span class="hl-punct">&lt;</span>'
  const name = `<span class="hl-tag-name">${escapeHtml(tagName)}</span>`
  const attrPart = attrs ? highlightAttributes(attrs) : ''
  const end = selfClose
    ? '<span class="hl-punct"> /</span><span class="hl-punct">&gt;</span>'
    : '<span class="hl-punct">&gt;</span>'
  const tagClass = slash ? 'hl-tag-close' : (VOID_TAGS.test(tagName) || selfClose ? 'hl-tag-void' : 'hl-tag-open')

  return `<span class="hl-tag ${tagClass}">${open}${name}${attrPart ? `<span class="hl-attrs">${attrPart}</span>` : ''}${end}</span>`
}

/**
 * Syntax-highlight HTML (and {placeholder} tokens) for the editor overlay.
 * Placeholders inside attribute values are highlighted without breaking tag markup.
 */
export function highlightHtml (code) {
  const src = String(code || '')
  if (!src) return ''

  let out = ''
  let i = 0

  while (i < src.length) {
    if (src[i] !== '<') {
      const next = src.indexOf('<', i)
      const chunk = next === -1 ? src.slice(i) : src.slice(i, next)
      out += highlightText(chunk)
      i = next === -1 ? src.length : next
      continue
    }

    if (src.startsWith('<!--', i)) {
      const end = src.indexOf('-->', i)
      const chunk = end === -1 ? src.slice(i) : src.slice(i, end + 3)
      out += highlightTag(chunk)
      i += chunk.length
      continue
    }

    const end = src.indexOf('>', i)
    if (end === -1) {
      out += highlightText(src.slice(i))
      break
    }

    out += highlightTag(src.slice(i, end + 1))
    i = end + 1
  }

  return out
}

const BLOCK_TAGS = new Set([
  'html', 'head', 'body', 'div', 'section', 'article', 'header', 'footer', 'nav', 'main',
  'p', 'ul', 'ol', 'li', 'table', 'thead', 'tbody', 'tr', 'td', 'th', 'form', 'h1', 'h2',
  'h3', 'h4', 'h5', 'h6', 'blockquote', 'pre'
])

const INLINE_VOID = /^(br|hr|img|input|meta|link|source|area|base|col|embed|param|track|wbr)$/i

function tagInfo (tag) {
  if (tag.startsWith('<!--')) return { name: '', isClosing: false, isBlock: false, isVoid: false, isComment: true }
  const m = tag.match(/^<\/?([\w:-]+)/)
  const name = m ? m[1].toLowerCase() : ''
  const isClosing = tag.startsWith('</')
  const isVoid = INLINE_VOID.test(name) || /\/>$/.test(tag)
  const isBlock = BLOCK_TAGS.has(name)
  return { name, isClosing, isBlock, isVoid, isComment: false }
}

/**
 * Pretty-print HTML: block elements on their own lines; inline tags stay with text.
 */
export function formatHtml (input) {
  const raw = String(input || '').trim()
  if (!raw) return raw

  const tokens = []
  const re = /<!--[\s\S]*?-->|<\/?[\w:-]+(?:\s+[^>]*?)?\/?>/g
  let last = 0
  let m
  while ((m = re.exec(raw)) !== null) {
    if (m.index > last) {
      const text = raw.slice(last, m.index)
      if (text && text.trim()) tokens.push({ type: 'text', value: text })
    }
    tokens.push({ type: 'tag', value: m[0] })
    last = m.index + m[0].length
  }
  if (last < raw.length) {
    const text = raw.slice(last)
    if (text && text.trim()) tokens.push({ type: 'text', value: text })
  }

  if (!tokens.length) return raw

  const lines = []
  let depth = 0
  let inlineBuffer = ''
  const tab = '  '

  const flushInline = () => {
    const trimmed = inlineBuffer.trim()
    if (trimmed) lines.push(tab.repeat(depth) + trimmed)
    inlineBuffer = ''
  }

  for (const token of tokens) {
    if (token.type === 'text') {
      inlineBuffer += token.value
      continue
    }

    const tag = token.value
    const info = tagInfo(tag)

    if (info.isComment) {
      flushInline()
      lines.push(tab.repeat(depth) + tag)
      continue
    }

    if (info.isBlock) {
      if (info.isClosing) {
        flushInline()
        depth = Math.max(0, depth - 1)
        lines.push(tab.repeat(depth) + tag)
      } else {
        flushInline()
        lines.push(tab.repeat(depth) + tag)
        if (!info.isVoid) depth += 1
      }
      continue
    }

    inlineBuffer += tag
  }

  flushInline()
  return lines.join('\n')
}
