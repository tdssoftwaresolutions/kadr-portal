const prisma = require('../../lib/prisma')
const { extractVariables } = require('./templateRenderer')
const { hasBuilder, runBuilder } = require('./templateBuilders')

async function getDbTemplate (templateKey, channel) {
  return prisma.notification_templates.findUnique({
    where: {
      template_key_channel: {
        template_key: templateKey,
        channel
      }
    }
  })
}

/**
 * Resolves template content from DB. Dynamic templates (e.g. dailyDigest) use a code builder
 * for body HTML; DB row supplies subject, greeting, active flag, and admin display name.
 */
async function resolveTemplate (templateKey, channel, data = {}) {
  const row = await getDbTemplate(templateKey, channel)
  if (!row || !row.active) return null

  if (hasBuilder(templateKey)) {
    const built = runBuilder(templateKey, data)
    if (built) {
      return {
        source: 'database+builder',
        subject: row.subject || built.subject,
        greeting: row.greeting,
        body_html: built.bodyHtml || built.body_html || '',
        body_text: built.body_text || null,
        title: row.title,
        name: row.name
      }
    }
  }

  return {
    source: 'database',
    subject: row.subject,
    greeting: row.greeting,
    body_html: row.body_html,
    body_text: row.body_text,
    title: row.title,
    name: row.name
  }
}

function describeTemplateVariables (template) {
  if (!template) return []
  return extractVariables(
    template.subject,
    template.greeting,
    template.body_html,
    template.body_text,
    template.title
  )
}

module.exports = {
  prisma,
  getDbTemplate,
  resolveTemplate,
  describeTemplateVariables,
  hasBuilder
}
