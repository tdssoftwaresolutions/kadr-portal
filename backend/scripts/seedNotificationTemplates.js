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
  },
  {
    template_key: 'representativeInvite',
    name: 'Representative invite to join',
    description: 'Sent to a representative (a party\'s lawyer) who is not yet on the platform, inviting them to join and be tagged to a case',
    subject: 'You have been added as a representative — Case {caseId}',
    greeting: 'Hello {recipientName},',
    body_html: `
      <p>You have been added as the representative for {representedPartyName} (the {partyLabel}) on case <strong>{caseId}</strong>.</p>
      <p><strong>Case category:</strong> {category}</p>
      <p>As a representative you will be able to view the case, join meetings, and act on behalf of the party you represent, with the same access they have.</p>
      <p>Your account is pending approval. Once approved, you will receive a separate email with your login credentials. You can sign in here:</p>
      <p><a href="{loginUrl}">{loginUrl}</a></p>
    `,
    body_text: 'You have been added as the representative for {representedPartyName} (the {partyLabel}) on case {caseId} (category: {category}). Your account is pending approval; you will receive login credentials once approved. Sign in: {loginUrl}',
    variables: ['recipientName', 'caseId', 'category', 'representedPartyName', 'partyLabel', 'loginUrl']
  },
  {
    template_key: 'representativeTaggedToCase',
    name: 'Representative tagged to a new case',
    description: 'Sent to an existing representative account when they are tagged to an additional case',
    subject: 'You have been added to a new case — Case {caseId}',
    greeting: 'Hello {recipientName},',
    body_html: `
      <p>You have been added as the representative for {representedPartyName} (the {partyLabel}) on case <strong>{caseId}</strong>.</p>
      <p><strong>Case category:</strong> {category}</p>
      <p>You can view this case, join its meetings, and act on behalf of the party you represent by signing in to your existing account:</p>
      <p><a href="{loginUrl}">{loginUrl}</a></p>
    `,
    body_text: 'You have been added as the representative for {representedPartyName} (the {partyLabel}) on case {caseId} (category: {category}). Sign in to your account to view it: {loginUrl}',
    variables: ['recipientName', 'caseId', 'category', 'representedPartyName', 'partyLabel', 'loginUrl']
  },

  // ── Case payment flow templates ───────────────────────────────────────────

  {
    template_key: 'paymentNoticeToSecondParty',
    name: 'Notice to second party after notice-fee payment',
    description: 'Sent to the respondent when the claimant pays the notice fee. evidenceRowHtml is pre-rendered by the service — empty string when no document was uploaded.',
    subject: 'Mediation notice — Case {caseId}',
    greeting: 'Hello {recipientName},',
    body_html: `
      <p>You have been named as the respondent in a mediation case filed by <strong>{firstPartyName}</strong>.</p>
      <table style="border-collapse:collapse;width:100%;margin:16px 0;">
        <tbody>
          <tr>
            <td style="padding:8px 12px;color:#6b7280;font-size:14px;white-space:nowrap;vertical-align:top;">Case ID</td>
            <td style="padding:8px 12px;font-size:14px;vertical-align:top;"><strong>{caseId}</strong></td>
          </tr>
          <tr style="background:#f9fafb;">
            <td style="padding:8px 12px;color:#6b7280;font-size:14px;white-space:nowrap;vertical-align:top;">Category</td>
            <td style="padding:8px 12px;font-size:14px;vertical-align:top;">{category}</td>
          </tr>
          <tr>
            <td style="padding:8px 12px;color:#6b7280;font-size:14px;white-space:nowrap;vertical-align:top;">Case type</td>
            <td style="padding:8px 12px;font-size:14px;vertical-align:top;">{caseType}</td>
          </tr>
          <tr style="background:#f9fafb;">
            <td style="padding:8px 12px;color:#6b7280;font-size:14px;white-space:nowrap;vertical-align:top;">Description</td>
            <td style="padding:8px 12px;font-size:14px;vertical-align:top;">{description}</td>
          </tr>
          {evidenceRowHtml}
        </tbody>
      </table>
      <p>To accept or respond to this mediation notice, please register on the Kadr portal:</p>
      <p style="text-align:center;margin:24px 0;">
        <a href="{registerUrl}" style="background:#3b5bdb;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:600;display:inline-block;">Accept &amp; respond</a>
      </p>
      <p style="font-size:13px;color:#6b7280;">If you believe this notice was sent in error, please contact our support team.</p>
    `,
    body_text: 'You have been named as the respondent in a mediation case filed by {firstPartyName}. Case ID: {caseId}. Category: {category}. Description: {description}. To respond, visit: {registerUrl}',
    variables: ['recipientName', 'firstPartyName', 'caseId', 'caseType', 'category', 'description', 'evidenceRowHtml', 'registerUrl']
  },

  {
    template_key: 'paymentInitiatedByFirstParty',
    name: 'Payment confirmation to first party (notice fee)',
    description: 'Sent to the claimant confirming receipt of the notice fee payment.',
    subject: 'Payment received — notice fee',
    greeting: 'Hello {recipientName},',
    body_html: `
      <p>We have received your notice fee payment. The formal notice has been dispatched to the opposite party.</p>
      <table style="border-collapse:collapse;width:100%;margin:16px 0;">
        <tbody>
          <tr>
            <td style="padding:8px 12px;color:#6b7280;font-size:14px;white-space:nowrap;">Amount</td>
            <td style="padding:8px 12px;font-size:14px;"><strong>{currency} {amount}</strong></td>
          </tr>
          <tr style="background:#f9fafb;">
            <td style="padding:8px 12px;color:#6b7280;font-size:14px;white-space:nowrap;">Reference</td>
            <td style="padding:8px 12px;font-size:14px;">{referenceId}</td>
          </tr>
        </tbody>
      </table>
      <p>We will notify you once the opposite party responds.</p>
    `,
    body_text: 'Your notice fee payment of {currency} {amount} has been received (reference: {referenceId}). The opposite party has been notified.',
    variables: ['recipientName', 'currency', 'amount', 'referenceId']
  },

  {
    template_key: 'mediationAcceptanceFirstParty',
    name: 'Mediation acceptance notice to first party',
    description: 'Sent to the claimant when the second party accepts mediation. Prompts the claimant to pay the mediation fee.',
    subject: 'Opposite party has accepted mediation — next step',
    greeting: 'Hello {recipientName},',
    body_html: `
      <p>Great news — the opposite party has accepted the mediation notice.</p>
      <p>To proceed with mediation, please log in to the Kadr portal and pay the mediation fee. Once paid, a certified mediator will be assigned and the first meeting will be scheduled.</p>
    `,
    body_text: 'The opposite party has accepted mediation. Please log in and pay the mediation fee to proceed.',
    variables: ['recipientName']
  },

  {
    template_key: 'mediationAcceptanceSecondParty',
    name: 'Mediation acceptance confirmation to second party',
    description: 'Sent to the respondent confirming they have accepted the mediation.',
    subject: 'You have accepted mediation — what happens next',
    greeting: 'Hello {recipientName},',
    body_html: `
      <p>Thank you for accepting the mediation notice. Your response has been recorded.</p>
      <p>The claimant has been asked to pay the mediation fee. Once that is done, a certified mediator will be assigned and you will receive a meeting invitation.</p>
    `,
    body_text: 'Thank you for accepting mediation. We will notify you once the claimant pays the mediation fee and a mediator is assigned.',
    variables: ['recipientName']
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
