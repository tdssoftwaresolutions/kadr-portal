const prisma = require('../../lib/prisma.js')

const DEFAULTS = {
  EMAIL: {
    enabled: true,
    provider: 'smtp',
    config: {
      headerHtml: require('../../config/emailConfig').headerHtml,
      footerHtml: require('../../config/emailConfig').footerHtml
    }
  },
  SMS: { enabled: true, provider: 'twilio', config: { countryCode: '91' } },
  WHATSAPP: { enabled: false, provider: 'twilio', config: { countryCode: '91' } },
  PUSH: { enabled: true, provider: 'web-push', config: {} }
}

async function getChannelSettings (channel) {
  const row = await prisma.notification_channel_settings.findUnique({
    where: { channel }
  })
  if (!row) return { ...DEFAULTS[channel], channel }
  return {
    channel,
    enabled: row.enabled,
    provider: row.provider,
    config: row.config || {}
  }
}

async function listAllChannelSettings () {
  const channels = ['EMAIL', 'SMS', 'WHATSAPP', 'PUSH']
  const rows = await Promise.all(channels.map((c) => getChannelSettings(c)))
  return rows
}

async function saveChannelSettings ({ channel, enabled, provider, config }) {
  return prisma.notification_channel_settings.upsert({
    where: { channel },
    create: {
      channel,
      enabled: Boolean(enabled),
      provider: String(provider || 'default'),
      config: config || {}
    },
    update: {
      enabled: Boolean(enabled),
      provider: String(provider || 'default'),
      config: config || {}
    }
  })
}

module.exports = {
  DEFAULTS,
  getChannelSettings,
  listAllChannelSettings,
  saveChannelSettings
}
