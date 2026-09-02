#!/usr/bin/env node
/**
 * Upsert notification email templates used by the app.
 *
 * Usage:
 *   node scripts/seedNotificationTemplates.js
 *   node scripts/seedNotificationTemplates.js --force   # overwrite existing body/subject
 */
require('dotenv').config()

const prisma = require('../lib/prisma')

const force = process.argv.includes('--force')

const TEMPLATES = [
  {
    template_key: 'mediatorCaseAssigned',
    name: 'Mediator case assignment',
    description: 'Sent to a mediator when a case is assigned or reassigned',
    subject: 'New case assignment — Case {caseId}',
    greeting: 'Hello {recipientName},',
    body_html: `
      {bodyHtml}
      {meetingBodyHtml}
      <p>Case ID: <strong>{caseId}</strong></p>
      <p>Parties: {firstPartyName} vs {secondPartyName}</p>
      <p>Please sign in to the Kadr portal to review the case.</p>
    `,
    body_text: 'You have been assigned to case {caseId}. Parties: {firstPartyName} vs {secondPartyName}.',
    variables: ['recipientName', 'caseId', 'firstPartyName', 'secondPartyName', 'bodyHtml', 'meetingBodyHtml', 'meetingLink', 'scheduleRange']
  },
  {
    template_key: 'caseMediatorAssigned',
    name: 'Client mediator assignment notice',
    description: 'Sent to parties when a mediator is assigned without an immediate meeting',
    subject: 'Mediator assigned — Case {caseId}',
    greeting: 'Hello {recipientName},',
    body_html: `
      {bodyHtml}
      <p>Your assigned mediator is <strong>{mediatorName}</strong>.</p>
      <p>Case ID: <strong>{caseId}</strong></p>
    `,
    body_text: 'Mediator {mediatorName} has been assigned to case {caseId}.',
    variables: ['recipientName', 'caseId', 'mediatorName', 'bodyHtml']
  },
  {
    template_key: 'meetingScheduledAdmin',
    name: 'Admin meeting scheduled notice',
    description: 'Sent to admins when a client mediation meeting is scheduled',
    subject: 'Meeting scheduled — Case {caseId}',
    greeting: 'Hello {recipientName},',
    body_html: `
      {bodyHtml}
      <p>Meeting: <strong>{title}</strong></p>
      <p>Case ID: <strong>{caseId}</strong></p>
    `,
    body_text: 'A meeting was scheduled for case {caseId}: {title}.',
    variables: ['recipientName', 'caseId', 'title', 'bodyHtml']
  },
  {
    template_key: 'mediatorAssignedMeetingScheduled',
    name: 'Mediator assigned + meeting scheduled',
    description: 'Sent to parties after mediation payment when mediator and first meeting are set',
    subject: 'Mediator assigned and meeting scheduled — Case update',
    greeting: 'Hello {recipientName},',
    body_html: `
      {paidMessage}
      <p>Your dispute resolution expert is <strong>{mediatorName}</strong>.</p>
      {meetingBodyHtml}
      <p>A calendar invite (.ics) is attached for your convenience.</p>
    `,
    body_text: 'Mediator {mediatorName} assigned. Meeting details are in this email.',
    variables: ['recipientName', 'paidMessage', 'meetingBodyHtml', 'mediatorName']
  },
  {
    template_key: 'meetingInvite',
    name: 'Meeting invitation',
    description: 'Standard Zoom meeting invite for case participants',
    subject: 'Meeting invite — Case {caseId}',
    greeting: 'Hello {recipientName},',
    body_html: `
      <p>You are invited to a mediation meeting for case <strong>{caseId}</strong>.</p>
      <p><strong>Title:</strong> {title}</p>
      <p><strong>When:</strong> {scheduleRange}</p>
      <p><strong>Description:</strong> {description}</p>
      <p><a href="{meetingLink}">Join Meeting</a></p>
      <p><a href="{googleCalendarLink}">Add to Google Calendar</a></p>
    `,
    body_text: 'Meeting for case {caseId}: {title} at {scheduleRange}. Join: {meetingLink}',
    variables: ['recipientName', 'caseId', 'title', 'meetingType', 'description', 'scheduleRange', 'googleCalendarLink', 'meetingLink']
  }
]

async function upsertTemplate (row) {
  const existing = await prisma.notification_templates.findUnique({
    where: {
      template_key_channel: {
        template_key: row.template_key,
        channel: 'EMAIL'
      }
    }
  })

  if (existing && !force) {
    console.log(`skip  ${row.template_key} (exists; use --force to overwrite)`)
    return
  }

  if (existing) {
    await prisma.notification_templates.update({
      where: { id: existing.id },
      data: {
        name: row.name,
        description: row.description,
        subject: row.subject,
        greeting: row.greeting,
        body_html: row.body_html,
        body_text: row.body_text,
        variables: row.variables,
        active: true
      }
    })
    console.log(`update ${row.template_key}`)
    return
  }

  await prisma.notification_templates.create({
    data: {
      template_key: row.template_key,
      channel: 'EMAIL',
      name: row.name,
      description: row.description,
      subject: row.subject,
      greeting: row.greeting,
      body_html: row.body_html,
      body_text: row.body_text,
      variables: row.variables,
      active: true
    }
  })
  console.log(`create ${row.template_key}`)
}

async function main () {
  for (const row of TEMPLATES) {
    await upsertTemplate(row)
  }
  console.log('Done.')
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
