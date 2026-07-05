const provider = require('../../email/providers')
const { renderEmailLayout } = require('../../email/emailLayoutRenderer')
const { renderTemplate } = require('../templateRenderer')
const { getEmailLayout } = require('../emailLayoutService')

async function send ({ to, template, data, attachments = [] }) {
  const subject = renderTemplate(template.subject || 'Notification from Kadr.live', data)
  const greeting = renderTemplate(
    template.greeting || (data.recipientName ? `Hi ${data.recipientName},` : 'Hello,'),
    data
  )
  const bodyHtml = renderTemplate(template.body_html || '', data)
  const { headerHtml, footerHtml } = await getEmailLayout()
  const html = renderEmailLayout({ greeting, bodyHtml, headerHtml, footerHtml })

  return provider.send({
    to,
    subject,
    html,
    attachments: attachments || []
  })
}

module.exports = { send }
