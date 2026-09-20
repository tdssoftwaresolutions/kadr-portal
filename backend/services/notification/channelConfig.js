const prisma = require('../../lib/prisma.js')

// Channel settings change rarely (admin-edited) but getChannelSettings is
// called on every single notification send — twice per email, once directly
// and once inside getEmailLayout(). A short TTL cache removes that DB round
// trip from the hot path; saveChannelSettings invalidates immediately below
// so admin edits still take effect right away.
const CACHE_TTL_MS = 60 * 1000
const cache = new Map()

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
  const cached = cache.get(channel)
  if (cached && Date.now() - cached.loadedAt < CACHE_TTL_MS) {
    return cached.value
  }

  const row = await prisma.notification_channel_settings.findUnique({
    where: { channel }
  })
  const value = !row
    ? { ...DEFAULTS[channel], channel }
    : { channel, enabled: row.enabled, provider: row.provider, config: row.config || {} }
  cache.set(channel, { value, loadedAt: Date.now() })
  return value
}

async function listAllChannelSettings () {
  const channels = ['EMAIL', 'WHATSAPP', 'PUSH']
  const rows = await Promise.all(channels.map((c) => getChannelSettings(c)))
  return rows
}

async function saveChannelSettings ({ channel, enabled, provider, config }) {
  const result = await prisma.notification_channel_settings.upsert({
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
  cache.delete(channel)
  return result
}

module.exports = {
  DEFAULTS,
  getChannelSettings,
  listAllChannelSettings,
  saveChannelSettings
}
