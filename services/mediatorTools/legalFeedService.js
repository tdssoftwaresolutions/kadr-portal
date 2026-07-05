const axios = require('axios')
const Parser = require('rss-parser')

const IK_BASE = 'https://indiankanoon.org'
const USER_AGENT = 'Mozilla/5.0 (compatible; KadrPortal/1.0; +https://kadr.in)'

const FEED_CATALOG = [
  { id: 'judgments', title: 'Latest judgments (all courts)', path: '/feeds/latest/judgments/' },
  { id: 'delhi', title: 'Delhi High Court', path: '/feeds/latest/delhi/' },
  { id: 'bombay', title: 'Bombay High Court', path: '/feeds/latest/bombay/' },
  { id: 'kolkata', title: 'Calcutta High Court', path: '/feeds/latest/kolkata/' },
  { id: 'chennai', title: 'Madras High Court', path: '/feeds/latest/chennai/' },
  { id: 'karnataka', title: 'Karnataka High Court', path: '/feeds/latest/karnataka/' },
  { id: 'kerala', title: 'Kerala High Court', path: '/feeds/latest/kerala/' },
  { id: 'allahabad', title: 'Allahabad High Court', path: '/feeds/latest/allahabad/' }
]

const DEFAULT_FEED_ID = 'judgments'
const CACHE_TTL_MS = 15 * 60 * 1000
const feedCache = new Map()

const rssParser = new Parser({
  customFields: {
    item: ['description']
  }
})

function getFeedMeta (feedId) {
  const id = feedId || DEFAULT_FEED_ID
  const meta = FEED_CATALOG.find((f) => f.id === id)
  return meta || FEED_CATALOG[0]
}

function stripHtml (html) {
  if (!html) return ''
  return String(html)
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 280)
}

function normalizeItem (item) {
  const link = item.link || item.guid || ''
  return {
    title: (item.title || 'Untitled').trim(),
    link: link.startsWith('http') ? link : `${IK_BASE}${link.startsWith('/') ? '' : '/'}${link}`,
    summary: stripHtml(item.contentSnippet || item.description || ''),
    publishedAt: item.isoDate || item.pubDate || null
  }
}

async function fetchFeedItems (feedId, limit = 12) {
  const meta = getFeedMeta(feedId)
  const cacheKey = `${meta.id}:${limit}`
  const cached = feedCache.get(cacheKey)
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return cached.payload
  }

  const url = `${IK_BASE}${meta.path}`
  const { data } = await axios.get(url, {
    timeout: 15000,
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/rss+xml, application/xml, text/xml, */*' },
    maxRedirects: 3
  })

  const parsed = await rssParser.parseString(data)
  const items = (parsed.items || []).slice(0, limit).map(normalizeItem)

  const payload = {
    feedId: meta.id,
    feedTitle: parsed.title || meta.title,
    sourceName: 'Indian Kanoon',
    sourceUrl: IK_BASE,
    feedUrl: url,
    items
  }

  feedCache.set(cacheKey, { at: Date.now(), payload })
  return payload
}

function listFeeds () {
  return FEED_CATALOG.map(({ id, title }) => ({ id, title }))
}

module.exports = {
  listFeeds,
  fetchFeedItems,
  getFeedMeta,
  DEFAULT_FEED_ID
}
