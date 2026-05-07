const emailConfig = require('../../config/emailConfig')
const templates = require('./templates')
const provider = require('./providers')

class EmailService {
  static buildDefaultGreeting (variables = {}) {
    return variables.recipientName ? `Hi ${variables.recipientName},` : 'Hello,'
  }

  static renderLayout ({ greeting, bodyHtml }) {
    return `
      <div style="font-family: Arial, sans-serif; background-color: #f4f6f8; padding: 30px;">
        <div style="max-width: 700px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
          ${emailConfig.headerHtml}
          <div style="padding: 25px;">
            <p style="font-size: 16px; color: #444;">${greeting || 'Hello,'}</p>
            <div style="font-size: 16px; color: #444; line-height: 1.6;">${bodyHtml || ''}</div>
          </div>
          ${emailConfig.footerHtml}
        </div>
      </div>
    `
  }

  static async sendTemplate ({ templateName, to, variables = {}, attachments = [] }) {
    const templateBuilder = templates[templateName]
    if (!templateBuilder) {
      throw new Error(`Unknown email template: ${templateName}`)
    }

    const built = templateBuilder(variables)
    const html = this.renderLayout({
      greeting: built.greeting || this.buildDefaultGreeting(variables),
      bodyHtml: built.bodyHtml
    })

    return provider.send({
      to,
      subject: built.subject,
      html,
      attachments
    })
  }
}

module.exports = EmailService
