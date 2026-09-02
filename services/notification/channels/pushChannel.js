const pushService = require('../../push/pushService')
const { renderTemplate } = require('../templateRenderer')

async function send ({ userId, template, data }) {
  const title = renderTemplate(template.title || template.subject || 'Kadr.live', data)
  const body = renderTemplate(template.body_text || template.body_html || '', data)

  return pushService.sendToUser(userId, {
    title,
    body,
    data: typeof data === 'object' ? data : {}
  })
}

module.exports = { send }
