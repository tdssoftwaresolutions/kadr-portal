const emailConfig = require('../../config/emailConfig')
const { getChannelSettings } = require('./channelConfig')

const DEFAULT_HEADER = emailConfig.headerHtml
const DEFAULT_FOOTER = emailConfig.footerHtml

async function getEmailLayout () {
  const settings = await getChannelSettings('EMAIL')
  const config = settings.config || {}
  return {
    headerHtml: config.headerHtml || DEFAULT_HEADER,
    footerHtml: config.footerHtml || DEFAULT_FOOTER
  }
}

module.exports = {
  DEFAULT_HEADER,
  DEFAULT_FOOTER,
  getEmailLayout
}
