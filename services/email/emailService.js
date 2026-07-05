const { renderEmailLayout } = require('./emailLayoutRenderer')

class EmailService {
  static buildDefaultGreeting (variables = {}) {
    return variables.recipientName ? `Hi ${variables.recipientName},` : 'Hello,'
  }

  static renderLayout (opts) {
    return renderEmailLayout(opts)
  }

  static async sendTemplate ({ templateName, to, variables = {}, attachments = [] }) {
    const notificationService = require('../notification/notificationService')
    return notificationService.send({
      templateKey: templateName,
      channel: 'EMAIL',
      to,
      data: variables,
      attachments
    })
  }
}

module.exports = EmailService
