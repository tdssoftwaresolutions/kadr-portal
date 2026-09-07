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
  WHATSAPP: {
    enabled: true,
    provider: 'meta-cloud',
    config: {
      countryCode: '91',
      // Meta WhatsApp Cloud API business phone number ID (non-secret).
      // The access token is read from env (WHATSAPP_ACCESS_TOKEN) only.
      phoneNumberId: '',
      apiVersion: 'v25.0',
      // Default approved template used for OTP delivery (authentication category).
      otpTemplateName: 'kadr_otp',
      otpTemplateLanguage: 'en_US'
    }
  },
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
  const channels = ['EMAIL', 'WHATSAPP', 'PUSH']
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
