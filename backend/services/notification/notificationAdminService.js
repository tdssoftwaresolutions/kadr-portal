const prisma = require('../../lib/prisma.js')
const { extractVariables } = require('./templateRenderer')
const { describeTemplateVariables } = require('./templateRepository')
const channelConfig = require('./channelConfig')

const { titleToCamelCase } = require('../../utils/titleToCamelCase')

const CHANNELS = ['EMAIL', 'WHATSAPP', 'PUSH']

function mapTemplateRow (row) {
  if (!row) return null
  const stored = Array.isArray(row.variables) ? row.variables : null
  const computed = extractVariables(row.subject, row.greeting, row.body_html, row.body_text, row.title)
  const variables = stored && stored.length ? stored : computed
  return { ...row, variables }
}

async function listTemplates ({ channel, activeOnly = false } = {}) {
  const where = {}
  if (channel) where.channel = channel
  if (activeOnly) where.active = true
  const rows = await prisma.notification_templates.findMany({
    where,
    orderBy: [{ template_key: 'asc' }, { channel: 'asc' }]
  })
  return rows.map(mapTemplateRow)
}

async function getTemplate (id) {
  const row = await prisma.notification_templates.findUnique({ where: { id } })
  return mapTemplateRow(row)
}

async function upsertTemplate (payload) {
  const {
    id,
    template_key,
    channel,
    name,
    description,
    subject,
    title,
    greeting,
    body_html,
    body_text,
    active
  } = payload

  let key = String(template_key || '').trim()
  const ch = String(channel || '').toUpperCase()
  if (!id && !key && name) key = titleToCamelCase(name)
  if (!key || !CHANNELS.includes(ch)) throw new Error('Invalid template key or channel')
  if (!name) throw new Error('Template name is required')

  const data = {
    template_key: key,
    channel: ch,
    name: String(name).trim(),
    description: description || null,
    subject: subject || null,
    title: title || null,
    greeting: greeting || null,
    body_html: body_html || null,
    body_text: body_text || null,
    variables: extractVariables(subject, greeting, body_html, body_text, title),
    active: active !== false
  }

  if (id) {
    return mapTemplateRow(await prisma.notification_templates.update({
      where: { id },
      data
    }))
  }

  return mapTemplateRow(await prisma.notification_templates.create({ data }))
}

async function deleteTemplate (id) {
  await prisma.notification_templates.delete({ where: { id } })
  return { deleted: true }
}

async function previewTemplate ({ templateKey, channel, data = {}, draft = null }) {
  const { resolveTemplate, getDbTemplate } = require('./templateRepository')
  const { hasBuilder, runBuilder } = require('./templateBuilders')
  const { getBuilderPreviewSample } = require('./builderPreviewSamples')
  const { renderTemplate } = require('./templateRenderer')
  const { renderEmailLayout } = require('../email/emailLayoutRenderer')
  const { getEmailLayout } = require('./emailLayoutService')

  const key = String(templateKey || '').trim()
  const ch = String(channel).toUpperCase()
  const d = draft || null
  let template = null

  if (key && hasBuilder(key)) {
    const built = runBuilder(key, getBuilderPreviewSample(key, data))
    const row = await getDbTemplate(key, ch)
    template = {
      source: 'builder',
      subject: (d && d.subject != null && d.subject !== '') ? d.subject : (row?.subject || built?.subject || ''),
      greeting: d && d.greeting != null ? d.greeting : (row?.greeting || null),
      body_html: built?.bodyHtml || built?.body_html || '',
      body_text: built?.body_text || null,
      title: d && d.title != null ? d.title : (row?.title || null)
    }
  } else if (d) {
    template = {
      source: 'draft',
      subject: d.subject || '',
      greeting: d.greeting || null,
      body_html: d.body_html || '',
      body_text: d.body_text || '',
      title: d.title || null
    }
  } else if (key) {
    template = await resolveTemplate(key, ch, data)
  }

  if (!template) throw new Error('Template not found or missing template key')

  const variables = describeTemplateVariables(template)
  const greetingFallback = data.recipientName
    ? `Hi ${data.recipientName},`
    : (data.name ? `Hi ${data.name},` : 'Hello,')
  const rendered = {
    subject: renderTemplate(template.subject, data),
    title: renderTemplate(template.title, data),
    greeting: renderTemplate(template.greeting || greetingFallback, data),
    body_html: renderTemplate(template.body_html, data),
    body_text: renderTemplate(template.body_text, data)
  }

  if (ch === 'EMAIL') {
    const { headerHtml, footerHtml } = await getEmailLayout()
    rendered.full_html = renderEmailLayout({
      greeting: rendered.greeting,
      bodyHtml: rendered.body_html,
      headerHtml,
      footerHtml
    })
  }

  return {
    variables,
    rendered,
    source: template.source,
    is_builder: key ? hasBuilder(key) : false
  }
}

async function previewEmailLayout ({ headerHtml, footerHtml }) {
  const { renderEmailLayout } = require('../email/emailLayoutRenderer')
  return {
    full_html: renderEmailLayout({
      greeting: 'Hi {name},',
      bodyHtml: '<p>This is a sample notification body. Placeholders like <strong>{caseId}</strong> are replaced when the message is sent.</p>',
      headerHtml: headerHtml || '',
      footerHtml: footerHtml || ''
    })
  }
}

async function searchUsersForPicker ({ q = '', types = [], limit = 50 }) {
  const term = String(q || '').trim()
  const typeList = (Array.isArray(types) ? types : String(types || '').split(','))
    .map((t) => String(t).trim().toUpperCase())
    .filter((t) => ['CLIENT', 'MEDIATOR', 'ADMIN'].includes(t))

  const where = {
    is_deleted: false,
    ...(typeList.length ? { user_type: { in: typeList } } : {}),
    ...(term
      ? {
          OR: [
            { name: { contains: term } },
            { email: { contains: term } },
            { phone_number: { contains: term } }
          ]
        }
      : {})
  }

  return prisma.user.findMany({
    where,
    take: Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200),
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      email: true,
      phone_number: true,
      user_type: true,
      active: true
    }
  })
}

async function listSendLogs ({ limit = 50 } = {}) {
  return prisma.notification_send_logs.findMany({
    take: Math.min(parseInt(limit, 10) || 50, 200),
    orderBy: { created_at: 'desc' }
  })
}

// Keys within a channel's config that must never be sent to the browser.
const SECRET_CONFIG_KEYS = ['vapidPrivateKey']

function redactChannelConfig (channel) {
  if (!channel || !channel.config) return channel
  const config = { ...channel.config }
  let hasPrivateKey = false
  for (const key of SECRET_CONFIG_KEYS) {
    if (config[key]) {
      hasPrivateKey = true
      delete config[key]
    }
  }
  return { ...channel, config, hasPrivateKey }
}

/** Lists channel settings with secret config values (e.g. VAPID private key) redacted. */
async function listAllChannelSettings () {
  const channels = await channelConfig.listAllChannelSettings()
  return channels.map(redactChannelConfig)
}

/**
 * Saves channel settings. Because the admin UI never receives secret values,
 * any redacted secret in the incoming config is preserved from the stored row
 * rather than being overwritten with a blank.
 */
async function saveChannelSettings (input) {
  const incomingConfig = input.config || {}
  const existing = await channelConfig.getChannelSettings(input.channel)
  const existingConfig = existing?.config || {}

  const mergedConfig = { ...incomingConfig }
  for (const key of SECRET_CONFIG_KEYS) {
    if (mergedConfig[key] === undefined && existingConfig[key] !== undefined) {
      mergedConfig[key] = existingConfig[key]
    }
  }

  const saved = await channelConfig.saveChannelSettings({ ...input, config: mergedConfig })
  return redactChannelConfig({
    channel: saved.channel,
    enabled: saved.enabled,
    provider: saved.provider,
    config: saved.config || {}
  })
}

module.exports = {
  CHANNELS,
  listTemplates,
  getTemplate,
  upsertTemplate,
  deleteTemplate,
  previewTemplate,
  previewEmailLayout,
  searchUsersForPicker,
  listSendLogs,
  listAllChannelSettings,
  saveChannelSettings
}
