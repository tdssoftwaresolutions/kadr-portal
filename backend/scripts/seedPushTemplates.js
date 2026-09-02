#!/usr/bin/env node
/**
 * Upsert PUSH notification templates used by the app and available in the
 * admin "Send message" flow. Idempotent; pass --force to overwrite bodies.
 *
 * Usage:
 *   node scripts/seedPushTemplates.js
 *   node scripts/seedPushTemplates.js -- --force
 */
require('dotenv').config()

const prisma = require('../lib/prisma')

const force = process.argv.includes('--force')

const TEMPLATES = [
  {
    template_key: 'pushCaseUpdate',
    name: 'Case update (push)',
    description: 'Browser push when a case status changes',
    title: 'Update on case {caseId}',
    body_text: 'There is a new update on case {caseId}. Open the portal to view details.',
    variables: ['caseId']
  },
  {
    template_key: 'pushCaseAssignment',
    name: 'New case assignment (push)',
    description: 'Browser push to a mediator on new case assignment',
    title: 'New case assigned',
    body_text: 'You have been assigned to case {caseId}.',
    variables: ['caseId']
  },
  {
    template_key: 'pushMeetingReminder',
    name: 'Meeting reminder (push)',
    description: 'Browser push reminder before a mediation meeting',
    title: 'Upcoming mediation meeting',
    body_text: 'Your meeting for case {caseId} is starting soon.',
    variables: ['caseId']
  },
  {
    template_key: 'pushSupportUpdate',
    name: 'Support ticket update (push)',
    description: 'Browser push on support ticket activity',
    title: 'Support ticket update',
    body_text: '{messagePreview}',
    variables: ['messagePreview']
  },
  {
    template_key: 'pushAdminApproval',
    name: 'Admin approval needed (push)',
    description: 'Browser push to admins when an approval is pending',
    title: 'Approval needed',
    body_text: '{reason}',
    variables: ['reason']
  },
  {
    template_key: 'pushGeneric',
    name: 'General announcement (push)',
    description: 'Free-form browser push for admin broadcasts',
    title: '{title}',
    body_text: '{message}',
    variables: ['title', 'message']
  }
]

async function main () {
  let created = 0
  let updated = 0
  let skipped = 0

  for (const tpl of TEMPLATES) {
    const existing = await prisma.notification_templates.findUnique({
      where: {
        template_key_channel: { template_key: tpl.template_key, channel: 'PUSH' }
      }
    })

    if (existing && !force) {
      skipped += 1
      continue
    }

    const data = {
      template_key: tpl.template_key,
      channel: 'PUSH',
      name: tpl.name,
      description: tpl.description,
      title: tpl.title,
      body_text: tpl.body_text,
      variables: tpl.variables,
      active: true
    }

    if (existing) {
      await prisma.notification_templates.update({ where: { id: existing.id }, data })
      updated += 1
    } else {
      await prisma.notification_templates.create({ data })
      created += 1
    }
  }

  console.log(`Push templates seeded. created=${created} updated=${updated} skipped=${skipped}`)
}

main()
  .catch((err) => {
    console.error('Failed to seed push templates:', err)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
