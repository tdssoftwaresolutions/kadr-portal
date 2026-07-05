const prisma = require('../../../lib/prisma')
const pushService = require('../../push/pushService')
const { renderTemplate } = require('../templateRenderer')

async function send ({ userId, template, data }) {
  const title = renderTemplate(template.title || template.subject || 'Kadr.live', data)
  const body = renderTemplate(template.body_text || template.body_html || '', data)

  const pushResult = await pushService.sendToUser(userId, {
    title,
    body,
    data: typeof data === 'object' ? data : {}
  })

  if (title || body) {
    await prisma.notifications.create({
      data: {
        user_id: userId,
        title: title || 'Notification',
        description: body || ''
      }
    })
  }

  return pushResult
}

module.exports = { send }
