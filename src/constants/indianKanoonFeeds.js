/** Indian Kanoon RSS feeds — keep in sync with services/mediatorTools/legalFeedService.js */
export const INDIAN_KANOON_FEEDS = [
  { id: 'judgments', title: 'Latest judgments (all courts)' },
  { id: 'delhi', title: 'Delhi High Court' },
  { id: 'bombay', title: 'Bombay High Court' },
  { id: 'kolkata', title: 'Calcutta High Court' },
  { id: 'chennai', title: 'Madras High Court' },
  { id: 'karnataka', title: 'Karnataka High Court' },
  { id: 'kerala', title: 'Kerala High Court' },
  { id: 'allahabad', title: 'Allahabad High Court' }
]

export const DEFAULT_FEED_ID = 'judgments'

export function toFeedSelectOptions (feeds = INDIAN_KANOON_FEEDS) {
  return feeds.map((f) => ({ value: f.id, text: f.title }))
}
