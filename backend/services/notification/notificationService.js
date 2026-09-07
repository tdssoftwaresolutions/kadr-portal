const prisma = require('../../lib/prisma')
const { resolveTemplate } = require('./templateRepository')
const { getChannelSettings } = require('./channelConfig')
const emailChannel = require('./channels/emailChannel')
const whatsappChannel = require('./channels/whatsappChannel')
const pushChannel = require('./channels/pushChannel')

const CHANNEL_SENDERS = {
  EMAIL: emailChannel,
  WHATSAPP: whatsappChannel,
  PUSH: pushChannel
}

function buildUserVariableDefaults (user) {
  if (!user) return {}
  return {
    name: user.name || '',
    email: user.email || '',
    phone_number: user.phone_number || '',
    recipientName: user.name || ''
  }
}

async function resolveRecipient ({ userId, to }) {
  if (to && typeof to === 'object') return to
  if (!userId) return to || null

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, phone_number: true, user_type: true, active: true }
  })
  if (!user) throw new Error(`User not found: ${userId}`)
  return {
    userId: user.id,
    email: user.email,
    phone: user.phone_number,
    user
  }
}

async function logSend ({ templateKey, channel, userId, recipient, status, errorMessage, metadata }) {
  try {
    await prisma.notification_send_logs.create({
      data: {
        template_key: templateKey,
        channel,
        user_id: userId || null,
        recipient: recipient || null,
        status,
        error_message: errorMessage || null,
        metadata: metadata || null
      }
    })
  } catch (e) {
    console.error('[notification] log failed', e.message)
  }
}

/**
 * Central notification dispatch.
 * @param {object} opts
 * @param {string} [opts.templateKey] optional for raw WhatsApp text/template sends
 * @param {'EMAIL'|'WHATSAPP'|'PUSH'} opts.channel
 * @param {string} [opts.userId]
 * @param {string|object} [opts.to] email, phone, or { email, phone }
 * @param {object} [opts.data] template variables. For WhatsApp, may include
 *   `waTemplate` (send an approved template) or `body` (raw text within the 24h window).
 * @param {array} [opts.attachments] email only
 */
async function send ({
  templateKey,
  channel,
  userId,
  to,
  data = {},
  attachments = [],
  source = 'api',
  ruleKey = null,
  skipChannelCheck = false
}) {
  const normalizedChannel = String(channel || '').toUpperCase()
  const sender = CHANNEL_SENDERS[normalizedChannel]
  if (!sender) throw new Error(`Unsupported notification channel: ${channel}`)

  const channelSettings = await getChannelSettings(normalizedChannel)
  if (!skipChannelCheck && !channelSettings.enabled) {
    return { sent: false, skipped: true, reason: 'channel_disabled' }
  }

  const recipient = await resolveRecipient({ userId, to })
  const user = recipient?.user || null
  const mergedData = {
    ...buildUserVariableDefaults(user),
    ...(data && typeof data === 'object' ? data : {})
  }

  // WhatsApp supports raw sends (an approved template via data.waTemplate, or
  // free-form text via data.body) that do not require a stored DB template.
  const isRawWhatsApp =
    normalizedChannel === 'WHATSAPP' &&
    !templateKey &&
    (mergedData.waTemplate || mergedData.body != null)

  let template = null
  if (isRawWhatsApp) {
    template = { body_text: mergedData.body != null ? String(mergedData.body) : '' }
  } else {
    template = await resolveTemplate(templateKey, normalizedChannel, mergedData)
    if (!template) {
      throw new Error(
        `Notification template not found or inactive: ${templateKey} (${normalizedChannel}). ` +
        'Create it in Admin → Notifications, or run npm run seed:notifications for legacy email keys.'
      )
    }
  }

  let recipientLabel = null
  try {
    if (normalizedChannel === 'EMAIL') {
      const email = recipient?.email || (typeof to === 'string' ? to : to?.email)
      if (!email) throw new Error('Email recipient is required')
      recipientLabel = email
      const result = await emailChannel.send({
        to: email,
        template,
        data: mergedData,
        attachments
      })
      await logSend({
        templateKey,
        channel: normalizedChannel,
        userId: user?.id || userId,
        recipient: email,
        status: 'sent',
        metadata: { source, ruleKey, provider: channelSettings.provider }
      })
      return { sent: true, channel: normalizedChannel, result }
    }

    if (normalizedChannel === 'WHATSAPP') {
      const phone = recipient?.phone || (typeof to === 'string' ? to : to?.phone)
      if (!phone) throw new Error('Phone recipient is required')
      recipientLabel = phone
      const result = await whatsappChannel.send({
        to: phone,
        template,
        data: mergedData,
        channelSettings
      })
      await logSend({
        templateKey: templateKey || (mergedData.waTemplate && mergedData.waTemplate.name) || 'raw',
        channel: normalizedChannel,
        userId: user?.id || userId,
        recipient: phone,
        status: 'sent',
        metadata: { source, ruleKey, provider: channelSettings.provider }
      })
      return { sent: true, channel: normalizedChannel, result }
    }

    if (normalizedChannel === 'PUSH') {
      const uid = user?.id || userId
      if (!uid) throw new Error('userId is required for push notifications')
      recipientLabel = uid
      const result = await pushChannel.send({
        userId: uid,
        template,
        data: mergedData
      })
      await logSend({
        templateKey,
        channel: normalizedChannel,
        userId: uid,
        recipient: uid,
        status: result?.skipped ? 'skipped' : 'sent',
        metadata: { source, ruleKey, push: result }
      })
      return { sent: !result?.skipped, channel: normalizedChannel, result }
    }

    throw new Error(`Unhandled channel: ${normalizedChannel}`)
  } catch (err) {
    await logSend({
      templateKey: templateKey || (mergedData.waTemplate && mergedData.waTemplate.name) || 'raw',
      channel: normalizedChannel,
      userId: user?.id || userId,
      recipient: recipientLabel,
      status: 'failed',
      errorMessage: err.message,
      metadata: { source, ruleKey }
    })
    throw err
  }
}

async function sendBulk ({
  templateKey,
  channel,
  userIds = [],
  data = {},
  attachments = []
}) {
  const results = []
  for (const id of userIds) {
    try {
      const result = await send({
        templateKey,
        channel,
        userId: id,
        data,
        attachments,
        source: 'admin_bulk'
      })
      results.push({ userId: id, success: true, result })
    } catch (err) {
      results.push({ userId: id, success: false, error: err.message })
    }
  }
  return {
    total: userIds.length,
    succeeded: results.filter((r) => r.success).length,
    failed: results.filter((r) => !r.success).length,
    results
  }
}

/**
 * Reusable "send a WhatsApp message to a phone number" helper.
 *
 * Call this from anywhere you need to deliver a WhatsApp message. It routes
 * through the central dispatcher so every send is config-gated (channel
 * enabled/disabled) and written to notification_send_logs.
 *
 * Usage:
 *   // Free-form text (only delivered inside the 24h customer service window):
 *   await sendWhatsApp({ to: '918510988836', message: 'Your case is updated.' })
 *
 *   // Approved template (business-initiated, works anytime):
 *   await sendWhatsApp({
 *     to: '918510988836',
 *     template: { name: 'kadr_otp', languageCode: 'en_US', bodyParams: ['123456'] }
 *   })
 *
 * @param {object} opts
 * @param {string} opts.to                phone number (any format; normalized to E.164 digits)
 * @param {string} [opts.message]         free-form text body (24h window only)
 * @param {object} [opts.template]        approved template: { name, languageCode, bodyParams, button }
 * @param {string} [opts.userId]          optional user id (for logging + variable defaults)
 * @param {string} [opts.source]          log source tag (default 'api')
 * @returns {Promise<object>} dispatch result (may be { skipped:true } when channel disabled)
 */
async function sendWhatsApp ({ to, message, template, userId, source = 'api' }) {
  if (!to) throw new Error('sendWhatsApp: "to" phone number is required')
  if (!message && !template) {
    throw new Error('sendWhatsApp: provide either "message" (text) or "template"')
  }
  const data = template ? { waTemplate: template } : { body: message }
  return send({ channel: 'WHATSAPP', to, userId, data, source })
}

/**
 * Convenience wrapper for sending an approved WhatsApp template message.
 * @param {object} opts
 * @param {string} opts.to
 * @param {string} opts.name           approved template name
 * @param {string} [opts.languageCode] default 'en_US'
 * @param {string[]} [opts.bodyParams] ordered positional body parameters
 * @param {object} [opts.button]       optional OTP button spec
 * @param {string} [opts.userId]
 * @param {string} [opts.source]
 */
async function sendWhatsAppTemplate ({ to, name, languageCode, bodyParams, button, userId, source = 'api' }) {
  return sendWhatsApp({
    to,
    userId,
    source,
    template: { name, languageCode, bodyParams, button }
  })
}

module.exports = {
  send,
  sendBulk,
  sendWhatsApp,
  sendWhatsAppTemplate,
  buildUserVariableDefaults,
  resolveRecipient
}
