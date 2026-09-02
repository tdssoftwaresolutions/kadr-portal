const pushService = require('../../push/pushService')
const { isCategoryEnabled } = require('../../push/notificationPreferencesService')
const { renderTemplate } = require('../templateRenderer')

async function send ({ userId, template, data }) {
  // A push category may be supplied on the send data (or the template variables).
  const category = data?.category || data?._pushCategory || template?.push_category || null

  // Respect per-user preferences and the master push switch.
  const allowed = await isCategoryEnabled(userId, category)
  if (!allowed) {
    return { sent: 0, skipped: true, reason: 'category_disabled', category }
  }

  const title = renderTemplate(template.title || template.subject || 'Kadr.live', data)
  const body = renderTemplate(template.body_text || template.body_html || '', data)

  return pushService.sendToUser(userId, {
    title,
    body,
    data: typeof data === 'object' ? data : {}
  })
}

module.exports = { send }
