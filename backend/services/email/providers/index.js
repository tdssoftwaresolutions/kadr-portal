const emailConfig = require('../../../config/emailConfig')
const smtpProvider = require('./smtpProvider')
const mailchimpProvider = require('./mailchimpProvider')

const providers = {
  smtp: smtpProvider,
  mailchimp: mailchimpProvider
}

module.exports = providers[emailConfig.provider] || smtpProvider
