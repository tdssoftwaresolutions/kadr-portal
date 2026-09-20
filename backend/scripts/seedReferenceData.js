#!/usr/bin/env node
/**
 * Sync reference/config data to the database: master admin credentials,
 * available languages, the case status/sub-status/event taxonomy, and
 * notification channel settings/templates/trigger rules.
 *
 * Usage:
 *   node backend/scripts/seedReferenceData.js
 *   npm run seed:reference-data
 *
 * Behavior is NOT uniform across tables — read this before running against
 * a database that has real case data in it:
 *
 *  - Master admin (upsert, never deleted): looked up by email+user_type and
 *    created or updated in place. Deleting/recreating a user row would
 *    change its id, breaking any already-issued JWTs for that admin and
 *    cascading away everything FK-linked to that specific user id
 *    (notification prefs, push devices, admin inbox read state, etc.) —
 *    see the many `onDelete: Cascade` relations to `user.id` in
 *    db/prisma/schema.prisma. Upsert avoids all of that.
 *
 *  - available_languages, notification_channel_settings,
 *    notification_templates, notification_trigger_rules (delete-all then
 *    insert): none of these four tables are referenced by any foreign key
 *    from elsewhere in the schema, so a full delete+recreate is safe — it
 *    cannot cascade into unrelated data.
 *
 *  - case_statuses, case_sub_statuses, case_events (delete-all then
 *    insert): *** DESTRUCTIVE — READ THIS ***. `cases.status` and
 *    `cases.sub_status` are declared `onDelete: Cascade` against
 *    case_statuses/case_sub_statuses, and case_history cascades from
 *    case_events. Deleting rows here WILL cascade-delete any real case
 *    (and its full history) that currently references a status being
 *    removed — this is not hypothetical, it has already deleted live
 *    production cases when this script was designed (5 cases / 16
 *    case_history rows existed in kadr.live prod at the time). This
 *    behavior was explicitly requested and confirmed after being shown
 *    that exact impact — do not soften or remove this warning without
 *    re-confirming with whoever owns this script that they still want
 *    unconditional deletion here.
 *
 *  - PUSH channel VAPID keys are intentionally NOT included in this file's
 *    seed data (they're a private key — must never be committed to git).
 *    After running this script, run `npm run vapid:generate` if the
 *    target environment doesn't already have VAPID keys configured.
 */
require('dotenv').config()

const prisma = require('../lib/prisma')
const helper = require('../utils/helper')

// Password is intentionally NOT hardcoded here — this file is committed to
// git. Set ADMIN_PASSWORD in the target environment (.env or deploy secrets)
// before running this script; it is never written back to disk.
const ADMIN_USER = {
  email: process.env.ADMIN_EMAIL || 'admin@kadr.live',
  password: process.env.ADMIN_PASSWORD,
  name: process.env.ADMIN_NAME || 'Kadr Admin',
  phone_number: process.env.ADMIN_PHONE || '9999402810'
}

const AVAILABLE_LANGUAGES = [
  {
    'id': 'as',
    'language': 'Assamese'
  },
  {
    'id': 'bn',
    'language': 'Bengali'
  },
  {
    'id': 'en',
    'language': 'English'
  },
  {
    'id': 'hi',
    'language': 'Hindi'
  },
  {
    'id': 'kn',
    'language': 'Kannada'
  },
  {
    'id': 'mr',
    'language': 'Marathi'
  },
  {
    'id': 'or',
    'language': 'Odia'
  },
  {
    'id': 'pa',
    'language': 'Punjabi'
  },
  {
    'id': 'sa',
    'language': 'Sanskrit'
  },
  {
    'id': 'te',
    'language': 'Telugu'
  },
  {
    'id': 'ur',
    'language': 'Urdu'
  }
]

const CASE_STATUSES = [
  {
    'id': 'cancelled',
    'name': 'Cancelled'
  },
  {
    'id': 'closed_no_success',
    'name': 'Closed (No Success)'
  },
  {
    'id': 'closed_success',
    'name': 'Closed (Success)'
  },
  {
    'id': 'escalated',
    'name': 'Escalated'
  },
  {
    'id': 'failed',
    'name': 'Failed'
  },
  {
    'id': 'in_progress',
    'name': 'In Progress'
  },
  {
    'id': 'new',
    'name': 'New'
  },
  {
    'id': 'on_hold',
    'name': 'On Hold'
  },
  {
    'id': 'pending',
    'name': 'Pending'
  }
]

const CASE_SUB_STATUSES = [
  {
    'id': 'mediator_assigned',
    'status_id': 'in_progress',
    'name': 'Mediator Assigned'
  },
  {
    'id': 'meeting_scheduled',
    'status_id': 'in_progress',
    'name': 'Meeting Scheduled'
  },
  {
    'id': 'notice_sent_to_opposite_party',
    'status_id': 'in_progress',
    'name': 'Notice Sent To Opposite Party'
  },
  {
    'id': 'pending_mediation_agreement_sign',
    'status_id': 'in_progress',
    'name': 'Pending Mediation Agreement Sign'
  },
  {
    'id': 'pending_mediation_payment',
    'status_id': 'in_progress',
    'name': 'Pending Mediation Payment'
  },
  {
    'id': 'pending_mediation_payment_second_party',
    'status_id': 'in_progress',
    'name': 'Pending Mediation Payment (Second Party)'
  },
  {
    'id': 'pending_notice_payment',
    'status_id': 'in_progress',
    'name': 'Pending Notice Payment'
  }
]

const CASE_EVENTS = [
  {
    'id': '40c22d1e-3a58-11f1-bf8c-1aa8fcf7e183',
    'status_id': 'in_progress',
    'sub_status_id': 'pending_notice_payment',
    'title': 'Pay notice fee',
    'description': 'The initiating party pays ₹1,000 so KADR can send the legal notice to the opposite party.',
    'sequence': 1
  },
  {
    'id': '40c23359-3a58-11f1-bf8c-1aa8fcf7e183',
    'status_id': 'in_progress',
    'sub_status_id': 'notice_sent_to_opposite_party',
    'title': 'Opposite party to accept',
    'description': 'The opposite party reviews the notice and accepts mediation (₹1,000 notice fee).',
    'sequence': 2
  },
  {
    'id': '40c2387f-3a58-11f1-bf8c-1aa8fcf7e183',
    'status_id': 'in_progress',
    'sub_status_id': 'pending_mediation_payment',
    'title': 'Pay mediation fee',
    'description': 'The initiating party pays ₹5,000 so a mediator can be assigned and sessions scheduled.',
    'sequence': 3
  },
  {
    'id': '40c23c43-3a58-11f1-bf8c-1aa8fcf7e183',
    'status_id': 'in_progress',
    'sub_status_id': 'mediator_assigned',
    'title': 'Mediator assigned',
    'description': 'A mediator is assigned to guide both parties through the process.',
    'sequence': 5
  },
  {
    'id': '40c24087-3a58-11f1-bf8c-1aa8fcf7e183',
    'status_id': 'in_progress',
    'sub_status_id': 'meeting_scheduled',
    'title': 'Mediation meetings',
    'description': 'Mediation sessions are scheduled and held with both parties.',
    'sequence': 6
  },
  {
    'id': '40c24452-3a58-11f1-bf8c-1aa8fcf7e183',
    'status_id': 'in_progress',
    'sub_status_id': 'pending_mediation_agreement_sign',
    'title': 'Sign mediation agreement',
    'description': 'Both parties sign the mediation agreement to complete the case.',
    'sequence': 7
  },
  {
    'id': '760a9364-ab29-49b1-ab57-654813fe188a',
    'status_id': 'in_progress',
    'sub_status_id': 'pending_mediation_payment_second_party',
    'title': 'Second party mediation fee payment',
    'description': 'Second party pays their share of the mediation fee before a mediator is assigned.',
    'sequence': 4
  }
]

const NOTIFICATION_CHANNEL_SETTINGS = [
  {
    'channel': 'EMAIL',
    'enabled': true,
    'provider': 'smtp',
    'config': {
      'headerHtml': '\n    <div style="background-color:#3c78d8;padding:15px 20px;">\n      <h2 style="margin:0;font-size:20px;color:white;">Kadr.live</h2>\n    </div>\n  ',
      'footerHtml': '\n    <div style="background-color:#fafafa;padding:20px;font-size:14px;color:#777;border-top:1px solid #eee;">\n      <p>If you believe this message was sent to you in error, please contact our support team.</p>\n      <p style="margin-top:15px;">Regards,<br/><strong>Team Kadr</strong></p>\n    </div>\n  '
    }
  },
  {
    'channel': 'WHATSAPP',
    'enabled': false,
    'provider': 'twilio',
    'config': {
      'countryCode': '91'
    }
  },
  {
    'channel': 'PUSH',
    'enabled': false,
    'provider': 'web-push',
    'config': {
      'countryCode': '91',
      'vapidSubject': 'mailto:contact@kadr.live'
    }
  }
]

const NOTIFICATION_TEMPLATES = [
  {
    'template_key': 'rewardFulfillmentMessage',
    'channel': 'EMAIL',
    'name': 'Reward Fulfillment Message',
    'description': 'Imported from legacy template (editable in admin)',
    'subject': '{subject}',
    'title': null,
    'greeting': null,
    'body_html': '{bodyHtml}',
    'body_text': null,
    'variables': [
      'bodyHtml',
      'subject'
    ],
    'active': true
  },
  {
    'template_key': 'emailChangedNoticeNewAddress',
    'channel': 'EMAIL',
    'name': 'Email changed — confirmation to new address',
    'description': "Confirmation sent to a user's NEW email address after a self-serve email change completes.",
    'subject': 'Your Kadr login email is now active',
    'title': null,
    'greeting': 'Hello {recipientName},',
    'body_html': '\n      <p>This email address is now your Kadr Portal login email, replacing {oldEmail}.</p>\n      <p>Use this address the next time you sign in.</p>\n    ',
    'body_text': 'This email address is now your Kadr Portal login email, replacing {oldEmail}. Use this address the next time you sign in.',
    'variables': [
      'recipientName',
      'oldEmail'
    ],
    'active': true
  },
  {
    'template_key': 'emailChangeOtp',
    'channel': 'EMAIL',
    'name': 'Profile email change OTP',
    'description': "Sent to a user's NEW email address when they request a self-serve email change from Profile.",
    'subject': 'Verify your new email — Kadr Portal',
    'title': null,
    'greeting': 'Hello {recipientName},',
    'body_html': "\n      <p>Use the code below to verify this email address and confirm it as your new login email. This code expires in 10 minutes.</p>\n      <p style=\"text-align:center;margin:24px 0;font-size:28px;font-weight:700;letter-spacing:6px;\">{otp}</p>\n      <p style=\"font-size:13px;color:#6b7280;\">If you didn't request this, you can safely ignore this email — your account email will not change.</p>\n    ",
    'body_text': 'Your Kadr Portal email change verification code is {otp}. This code expires in 10 minutes.',
    'variables': [
      'recipientName',
      'otp'
    ],
    'active': true
  },
  {
    'template_key': 'mediatorLeftAutoReassign',
    'channel': 'EMAIL',
    'name': 'Mediator Left Auto Reassign',
    'description': 'Imported from legacy template (editable in admin)',
    'subject': 'Mediator left platform — cases reassigned ({departedName})',
    'title': null,
    'greeting': 'Hello Team,',
    'body_html': '{bodyHtml}',
    'body_text': null,
    'variables': [
      'bodyHtml',
      'departedName'
    ],
    'active': true
  },
  {
    'template_key': 'proActivatedFromReward',
    'channel': 'EMAIL',
    'name': 'Pro Activated From Reward',
    'description': 'Imported from legacy template (editable in admin)',
    'subject': 'Your Kadr Pro subscription is active',
    'title': null,
    'greeting': 'Hello {recipientName},',
    'body_html': '<p>Your Pro subscription is now active for <strong>{durationDays}</strong> days. Enjoy premium mediator tools on Kadr.</p>',
    'body_text': null,
    'variables': [
      'durationDays',
      'recipientName'
    ],
    'active': true
  },
  {
    'template_key': 'emailChangedNoticeOldAddress',
    'channel': 'EMAIL',
    'name': 'Email changed — notice to old address',
    'description': "Security notice sent to a user's OLD email address after a self-serve email change completes.",
    'subject': 'Your Kadr login email was changed',
    'title': null,
    'greeting': 'Hello {recipientName},',
    'body_html': "\n      <p>Your Kadr Portal login email was changed from this address to <strong>{newEmail}</strong>.</p>\n      <p style=\"font-size:13px;color:#6b7280;\">If you made this change, no action is needed. If you didn't request this, please contact our support team right away.</p>\n    ",
    'body_text': "Your Kadr Portal login email was changed from this address to {newEmail}. If you didn't request this, please contact support right away.",
    'variables': [
      'recipientName',
      'newEmail'
    ],
    'active': true
  },
  {
    'template_key': 'caseMediatorAssigned',
    'channel': 'EMAIL',
    'name': 'Client mediator assignment notice',
    'description': 'Sent to parties when a mediator is assigned without an immediate meeting',
    'subject': 'Mediator assigned — Case {caseId}',
    'title': null,
    'greeting': 'Hello {recipientName},',
    'body_html': '\n      {bodyHtml}\n      <p>Your assigned mediator is <strong>{mediatorName}</strong>.</p>\n      <p>Case ID: <strong>{caseId}</strong></p>\n    ',
    'body_text': 'Mediator {mediatorName} has been assigned to case {caseId}.',
    'variables': [
      'recipientName',
      'caseId',
      'mediatorName',
      'bodyHtml'
    ],
    'active': true
  },
  {
    'template_key': 'mediationAcceptanceFirstParty',
    'channel': 'EMAIL',
    'name': 'Mediation acceptance notice to first party',
    'description': 'Sent to the claimant when the second party accepts mediation. Prompts the claimant to pay the mediation fee.',
    'subject': 'Opposite party has accepted mediation — next step',
    'title': null,
    'greeting': 'Hello {recipientName},',
    'body_html': '\n      <p>Great news — the opposite party has accepted the mediation notice.</p>\n      <p>To proceed with mediation, please log in to the Kadr portal and pay the mediation fee. Once paid, a certified mediator will be assigned and the first meeting will be scheduled.</p>\n    ',
    'body_text': 'The opposite party has accepted mediation. Please log in and pay the mediation fee to proceed.',
    'variables': [
      'recipientName'
    ],
    'active': true
  },
  {
    'template_key': 'mediationFeeSecondPartyActionNeeded',
    'channel': 'EMAIL',
    'name': 'Mediation fee due from second party',
    'description': 'Sent to the second party once the first party has paid their mediation fee, prompting the second party to pay their own share.',
    'subject': 'Action needed — pay your mediation fee to continue',
    'title': null,
    'greeting': 'Hello {recipientName},',
    'body_html': '\n      <p>The claimant has paid their share of the mediation fee. To proceed, please log in to the Kadr portal and pay your share of the mediation fee.</p>\n      <p>Once your payment is received, a certified mediator will be assigned and the first meeting will be scheduled.</p>\n    ',
    'body_text': 'The claimant has paid their share of the mediation fee. Please log in and pay your share to proceed — a mediator will then be assigned.',
    'variables': [
      'recipientName'
    ],
    'active': true
  },
  {
    'template_key': 'genericAlert',
    'channel': 'PUSH',
    'name': 'Generic alert (push)',
    'description': 'Default push template',
    'subject': null,
    'title': '{title}',
    'greeting': null,
    'body_html': null,
    'body_text': '{message}',
    'variables': [
      'message',
      'title'
    ],
    'active': true
  },
  {
    'template_key': 'mediatorInvoicePaymentDone',
    'channel': 'EMAIL',
    'name': 'Mediator Invoice Payment Done',
    'description': 'Imported from legacy template (editable in admin)',
    'subject': 'Invoice payment completed',
    'title': null,
    'greeting': null,
    'body_html': '<p>Your invoice payment has been marked as completed by the admin team.</p>\n      <table style="border-collapse:collapse;width:100%;max-width:600px;">\n        <tr><td style="padding:8px;border:1px solid #ddd;"><strong>Invoice Number</strong></td><td style="padding:8px;border:1px solid #ddd;">{invoiceNumber}</td></tr>\n        <tr><td style="padding:8px;border:1px solid #ddd;"><strong>Case</strong></td><td style="padding:8px;border:1px solid #ddd;">{caseId}</td></tr>\n        <tr><td style="padding:8px;border:1px solid #ddd;"><strong>Amount Paid</strong></td><td style="padding:8px;border:1px solid #ddd;">INR {netPayable}</td></tr>\n      </table>',
    'body_text': null,
    'variables': [
      'caseId',
      'invoiceNumber',
      'netPayable'
    ],
    'active': true
  },
  {
    'template_key': 'mediatorCaseAssigned',
    'channel': 'EMAIL',
    'name': 'Mediator case assignment',
    'description': 'Sent to a mediator when a case is assigned or reassigned',
    'subject': 'New case assignment — Case {caseId}',
    'title': null,
    'greeting': 'Hello {recipientName},',
    'body_html': '\n      {bodyHtml}\n      {meetingBodyHtml}\n      <p>Case ID: <strong>{caseId}</strong></p>\n      <p>Parties: {firstPartyName} vs {secondPartyName}</p>\n      <p>Please sign in to the Kadr portal to review the case.</p>\n    ',
    'body_text': 'You have been assigned to case {caseId}. Parties: {firstPartyName} vs {secondPartyName}.',
    'variables': [
      'recipientName',
      'caseId',
      'firstPartyName',
      'secondPartyName',
      'bodyHtml',
      'meetingBodyHtml',
      'meetingLink',
      'scheduleRange'
    ],
    'active': true
  },
  {
    'template_key': 'websiteContactPortalMessageAdmin',
    'channel': 'EMAIL',
    'name': 'Website Contact Portal Message Admin',
    'description': 'Imported from legacy template (editable in admin)',
    'subject': 'Portal support — {participantName} ({topicLabel})',
    'title': null,
    'greeting': null,
    'body_html': '<h2 style="margin:0 0 12px;font-size:18px;color:#1a237e;">Logged-in user support</h2>\n      <p style="margin:0 0 14px;line-height:1.5;">{participantName} sent a message (topic: <strong>{topicLabel}</strong>). Reply from the admin <strong>Message center</strong> (Portal support).</p>\n      <p style="margin:0 0 8px;font-size:13px;color:#555;"><strong>Thread</strong> {threadTitle}</p>\n      <div style="background:#f5f7fb;border:1px solid #e0e6f0;border-radius:8px;padding:12px 14px;margin-bottom:16px;">\n        <p style="margin:0;white-space:pre-wrap;line-height:1.5;color:#222;">{messagePreview}</p>\n      </div>\n      <p style="margin:0 0 12px;"><a href="{openInboxUrl}" style="display:inline-block;padding:10px 18px;background:#3758d5;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold;">Open in Message center</a></p>\n           <p style="margin:0;font-size:13px;color:#666;word-break:break-all;">{openInboxUrl}</p>\n      <p style="margin-top:18px;font-size:13px;color:#666;">This is an automated notice.</p>',
    'body_text': null,
    'variables': [
      'messagePreview',
      'openInboxUrl',
      'participantName',
      'threadTitle',
      'topicLabel'
    ],
    'active': true
  },
  {
    'template_key': 'caseCorrespondenceNewMessage',
    'channel': 'PUSH',
    'name': 'New case message (push)',
    'description': 'Default push template',
    'subject': null,
    'title': 'New message — {caseLabel}',
    'greeting': null,
    'body_html': null,
    'body_text': '{messagePreview}',
    'variables': [
      'caseLabel',
      'messagePreview'
    ],
    'active': true
  },
  {
    'template_key': 'mediatorManualAssignmentRequired',
    'channel': 'EMAIL',
    'name': 'Mediator Manual Assignment Required',
    'description': 'Imported from legacy template (editable in admin)',
    'subject': 'Mediator Not Available - Need manual intervention',
    'title': null,
    'greeting': 'Hello Team,',
    'body_html': '<p>No mediator could be auto-assigned for case <strong>{caseId}</strong>. Please assign manually from admin panel.</p>',
    'body_text': null,
    'variables': [
      'caseId'
    ],
    'active': true
  },
  {
    'template_key': 'representativeInvite',
    'channel': 'EMAIL',
    'name': 'Representative invite to join',
    'description': "Sent to a representative (a party's lawyer) who is not yet on the platform, inviting them to join and be tagged to a case",
    'subject': 'You have been added as a representative — Case {caseId}',
    'title': null,
    'greeting': 'Hello {recipientName},',
    'body_html': '\n      <p>You have been added as the representative for {representedPartyName} (the {partyLabel}) on case <strong>{caseId}</strong>.</p>\n      <p><strong>Case category:</strong> {category}</p>\n      <p>As a representative you will be able to view the case, join meetings, and act on behalf of the party you represent, with the same access they have.</p>\n      <p>Your account is pending approval. Once approved, you will receive a separate email with your login credentials. You can sign in here:</p>\n      <p><a href="{loginUrl}">{loginUrl}</a></p>\n    ',
    'body_text': 'You have been added as the representative for {representedPartyName} (the {partyLabel}) on case {caseId} (category: {category}). Your account is pending approval; you will receive login credentials once approved. Sign in: {loginUrl}',
    'variables': [
      'recipientName',
      'caseId',
      'category',
      'representedPartyName',
      'partyLabel',
      'loginUrl'
    ],
    'active': true
  },
  {
    'template_key': 'signupEmailOtp',
    'channel': 'EMAIL',
    'name': 'Signup email verification OTP',
    'description': 'Sent when someone verifies their own email address during client/mediator signup, before an account exists.',
    'subject': 'Verify your email — Kadr Portal',
    'title': null,
    'greeting': 'Hello,',
    'body_html': "\n      <p>Use the code below to verify your email address and continue your Kadr Portal sign up. This code expires in 10 minutes.</p>\n      <p style=\"text-align:center;margin:24px 0;font-size:28px;font-weight:700;letter-spacing:6px;\">{otp}</p>\n      <p style=\"font-size:13px;color:#6b7280;\">If you didn't request this, you can safely ignore this email.</p>\n    ",
    'body_text': 'Your Kadr Portal email verification code is {otp}. This code expires in 10 minutes.',
    'variables': [
      'otp'
    ],
    'active': true
  },
  {
    'template_key': 'websiteContactCustomerReply',
    'channel': 'EMAIL',
    'name': 'Website Contact Customer Reply',
    'description': 'Imported from legacy template (editable in admin)',
    'subject': 'Re: {leadTitle}',
    'title': null,
    'greeting': null,
    'body_html': '<h2 style="margin:0 0 12px;font-size:18px;color:#1a237e;">Message from Kadr</h2>\n      <p style="margin:0 0 12px;line-height:1.5;">Hi {recipientName},<br/><br/><strong>Admin: {adminName}</strong> replied regarding your inquiry <strong>{leadTitle}</strong>.</p>\n      <div style="background:#f5f7fb;border:1px solid #e0e6f0;border-radius:8px;padding:12px 14px;margin-bottom:16px;">\n        <p style="margin:0;white-space:pre-wrap;line-height:1.5;color:#222;">{replyBody}</p>\n      </div>\n      <p style="font-size:13px;color:#666;">You can reply to this email to continue the conversation.</p>\n      <p style="margin:12px 0 0;font-size:13px;color:#666;">Open this thread in your portal: <a href="{openPortalUrl}">{openPortalUrl}</a></p>\n      <p style="font-size:13px;color:#666;margin-top:8px;">Website: <a href="{websiteUrl}">{websiteUrl}</a></p>',
    'body_text': null,
    'variables': [
      'adminName',
      'leadTitle',
      'openPortalUrl',
      'recipientName',
      'replyBody',
      'websiteUrl'
    ],
    'active': true
  },
  {
    'template_key': 'signedAgreementAvailable',
    'channel': 'EMAIL',
    'name': 'Signed Agreement Available',
    'description': 'Imported from legacy template (editable in admin)',
    'subject': 'Signed Agreement – Rouse Avenue Mediation Center',
    'title': null,
    'greeting': null,
    'body_html': '<p>This is regarding mediation case <strong>#{caseId}</strong>.</p>\n      <p>The signed agreement is available at the link below:</p>\n      <p><a href="{agreementUrl}" style="display:inline-block;background:#3c78d8;color:#fff;text-decoration:none;padding:12px 20px;border-radius:4px;">View Signed Agreement</a></p>',
    'body_text': null,
    'variables': [
      'agreementUrl',
      'caseId'
    ],
    'active': true
  },
  {
    'template_key': 'dailyDigest',
    'channel': 'EMAIL',
    'name': 'Daily Digest',
    'description': 'Imported from legacy template (editable in admin)',
    'subject': 'Daily Reminder Summary - Kadr.live',
    'title': null,
    'greeting': null,
    'body_html': '---- Auto Generated on runtime ----',
    'body_text': null,
    'variables': [],
    'active': true
  },
  {
    'template_key': 'mediatorAssignedMeetingScheduled',
    'channel': 'EMAIL',
    'name': 'Mediator assigned + meeting scheduled',
    'description': 'Sent to parties after mediation payment when mediator and first meeting are set',
    'subject': 'Mediator assigned and meeting scheduled — Case update',
    'title': null,
    'greeting': 'Hello {recipientName},',
    'body_html': '\n      {paidMessage}\n      <p>Your dispute resolution expert is <strong>{mediatorName}</strong>.</p>\n      {meetingBodyHtml}\n      <p>A calendar invite (.ics) is attached for your convenience.</p>\n    ',
    'body_text': 'Mediator {mediatorName} assigned. Meeting details are in this email.',
    'variables': [
      'recipientName',
      'paidMessage',
      'meetingBodyHtml',
      'mediatorName'
    ],
    'active': true
  },
  {
    'template_key': 'finalAgreementSignatureRequest',
    'channel': 'EMAIL',
    'name': 'Final Agreement Signature Request',
    'description': 'Imported from legacy template (editable in admin)',
    'subject': 'Final Step – Signature Required for Mediation Agreement',
    'title': null,
    'greeting': null,
    'body_html': '<p>Congratulations! Mediation for case <strong>{caseId}</strong> has been resolved. You are identified as the <strong>{partyRole}</strong>.</p>\n      <p>To complete the process, please sign the final agreement.</p>\n      <p><a href="{signUrl}" style="display:inline-block;background:#3c78d8;color:#fff;text-decoration:none;padding:12px 20px;border-radius:4px;">Review & Sign Final Agreement</a></p>',
    'body_text': null,
    'variables': [
      'caseId',
      'partyRole',
      'signUrl'
    ],
    'active': true
  },
  {
    'template_key': 'meetingScheduledAdmin',
    'channel': 'EMAIL',
    'name': 'Admin meeting scheduled notice',
    'description': 'Sent to admins when a client mediation meeting is scheduled',
    'subject': 'Meeting scheduled — Case {caseId}',
    'title': null,
    'greeting': 'Hello {recipientName},',
    'body_html': '\n      {bodyHtml}\n      <p>Meeting: <strong>{title}</strong></p>\n      <p>Case ID: <strong>{caseId}</strong></p>\n    ',
    'body_text': 'A meeting was scheduled for case {caseId}: {title}.',
    'variables': [
      'recipientName',
      'caseId',
      'title',
      'bodyHtml'
    ],
    'active': true
  },
  {
    'template_key': 'representativeTaggedToCase',
    'channel': 'EMAIL',
    'name': 'Representative tagged to a new case',
    'description': 'Sent to an existing representative account when they are tagged to an additional case',
    'subject': 'You have been added to a new case — Case {caseId}',
    'title': null,
    'greeting': 'Hello {recipientName},',
    'body_html': '\n      <p>You have been added as the representative for {representedPartyName} (the {partyLabel}) on case <strong>{caseId}</strong>.</p>\n      <p><strong>Case category:</strong> {category}</p>\n      <p>You can view this case, join its meetings, and act on behalf of the party you represent by signing in to your existing account:</p>\n      <p><a href="{loginUrl}">{loginUrl}</a></p>\n    ',
    'body_text': 'You have been added as the representative for {representedPartyName} (the {partyLabel}) on case {caseId} (category: {category}). Sign in to your account to view it: {loginUrl}',
    'variables': [
      'recipientName',
      'caseId',
      'category',
      'representedPartyName',
      'partyLabel',
      'loginUrl'
    ],
    'active': true
  },
  {
    'template_key': 'meetingInvite',
    'channel': 'EMAIL',
    'name': 'Meeting invitation',
    'description': 'Standard Zoom meeting invite for case participants',
    'subject': 'Meeting invite — Case {caseId}',
    'title': null,
    'greeting': 'Hello {recipientName},',
    'body_html': '\n      <p>You are invited to a mediation meeting for case <strong>{caseId}</strong>.</p>\n      <p><strong>Title:</strong> {title}</p>\n      <p><strong>When:</strong> {scheduleRange}</p>\n      <p><strong>Description:</strong> {description}</p>\n      <p><a href="{meetingLink}">Join Meeting</a></p>\n      <p><a href="{googleCalendarLink}">Add to Google Calendar</a></p>\n    ',
    'body_text': 'Meeting for case {caseId}: {title} at {scheduleRange}. Join: {meetingLink}',
    'variables': [
      'recipientName',
      'caseId',
      'title',
      'meetingType',
      'description',
      'scheduleRange',
      'googleCalendarLink',
      'meetingLink'
    ],
    'active': true
  },
  {
    'template_key': 'legacyCustomContent',
    'channel': 'EMAIL',
    'name': 'Legacy Custom Content',
    'description': 'Imported from legacy template (editable in admin)',
    'subject': '{subject}',
    'title': null,
    'greeting': null,
    'body_html': '{content}',
    'body_text': null,
    'variables': [
      'content',
      'subject'
    ],
    'active': true
  },
  {
    'template_key': 'welcomeCredentials',
    'channel': 'EMAIL',
    'name': 'Welcome Credentials',
    'description': 'Imported from legacy template (editable in admin)',
    'subject': 'Welcome aboard!',
    'title': null,
    'greeting': null,
    'body_html': '<p>\n  Thanks for registering on Kadr.live. Your account is now active.\n</p>\n<p>\n  To login, use the credentials below:\n</p>\n<p>\n  Username: {email}\n</p>\n<p>\n  Password: {password}\n</p>\n<p style="text-align:center;margin:20px 0;">\n  <a href="{loginUrl}" style="background-color:#4CAF50;color:#fff;padding:12px 20px;text-decoration:none;border-radius:4px;display:inline-block;font-weight:bold;">\n          Login to Your Account\n        </a>\n</p>',
    'body_text': null,
    'variables': [
      'email',
      'loginUrl',
      'password'
    ],
    'active': true
  },
  {
    'template_key': 'mediationAcceptanceSecondParty',
    'channel': 'EMAIL',
    'name': 'Mediation acceptance confirmation to second party',
    'description': 'Sent to the respondent confirming they have accepted the mediation.',
    'subject': 'You have accepted mediation — what happens next',
    'title': null,
    'greeting': 'Hello {recipientName},',
    'body_html': '\n      <p>Thank you for accepting the mediation notice. Your response has been recorded.</p>\n      <p>The claimant has been asked to pay the mediation fee. Once that is done, a certified mediator will be assigned and you will receive a meeting invitation.</p>\n    ',
    'body_text': 'Thank you for accepting mediation. We will notify you once the claimant pays the mediation fee and a mediator is assigned.',
    'variables': [
      'recipientName'
    ],
    'active': true
  },
  {
    'template_key': 'websiteContactNewLeadAdmin',
    'channel': 'EMAIL',
    'name': 'Website Contact New Lead Admin',
    'description': 'Imported from legacy template (editable in admin)',
    'subject': 'New website inquiry — {leadTitle}',
    'title': null,
    'greeting': null,
    'body_html': '<h2 style="margin:0 0 12px;font-size:18px;color:#1a237e;">New lead from your website</h2>\n      <p style="margin:0 0 14px;line-height:1.5;">Someone submitted the contact form. Reply from the admin <strong>Message center</strong> (Website source).</p>\n      <table style="width:100%;border-collapse:collapse;font-size:14px;color:#333;margin-bottom:16px;">\n        <tr><td style="padding:8px 0;font-weight:bold;width:140px;vertical-align:top;">Title</td><td>{leadTitle}</td></tr>\n        <tr><td style="padding:8px 0;font-weight:bold;vertical-align:top;">Name</td><td>{leadVisitorName}</td></tr>\n        <tr><td style="padding:8px 0;font-weight:bold;vertical-align:top;">Email</td><td>{leadEmail}</td></tr>\n        <tr><td style="padding:8px 0;font-weight:bold;vertical-align:top;">Phone</td><td>{leadPhone}</td></tr>\n      </table>\n      <div style="background:#f5f7fb;border:1px solid #e0e6f0;border-radius:8px;padding:12px 14px;margin-bottom:16px;">\n        <p style="margin:0 0 6px;font-size:12px;text-transform:uppercase;letter-spacing:0.04em;color:#5c678a;font-weight:bold;">Message</p>\n        <p style="margin:0;white-space:pre-wrap;line-height:1.5;color:#222;">{messagePreview}</p>\n      </div>\n      <p style="margin:0 0 12px;"><a href="{openInboxUrl}" style="display:inline-block;padding:10px 18px;background:#3758d5;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold;">Open in Message center</a></p>\n           <p style="margin:0;font-size:13px;color:#666;word-break:break-all;">{openInboxUrl}</p>\n      <p style="margin-top:18px;font-size:13px;color:#666;">This is an automated notice.</p>',
    'body_text': null,
    'variables': [
      'leadEmail',
      'leadPhone',
      'leadTitle',
      'leadVisitorName',
      'messagePreview',
      'openInboxUrl'
    ],
    'active': true
  },
  {
    'template_key': 'mediationFeeFirstPartyPaidAwaitingSecond',
    'channel': 'EMAIL',
    'name': 'Mediation fee received — awaiting second party',
    'description': "Sent to the first party confirming their mediation fee payment, and that mediator assignment now waits on the second party's matching payment.",
    'subject': "Payment received — awaiting the opposite party's mediation fee",
    'title': null,
    'greeting': 'Hello {recipientName},',
    'body_html': '\n      <p>We have received your mediation fee payment.</p>\n      <table style="border-collapse:collapse;width:100%;margin:16px 0;">\n        <tbody>\n          <tr>\n            <td style="padding:8px 12px;color:#6b7280;font-size:14px;white-space:nowrap;">Amount</td>\n            <td style="padding:8px 12px;font-size:14px;"><strong>{currency} {amount}</strong></td>\n          </tr>\n          <tr style="background:#f9fafb;">\n            <td style="padding:8px 12px;color:#6b7280;font-size:14px;white-space:nowrap;">Reference</td>\n            <td style="padding:8px 12px;font-size:14px;">{referenceId}</td>\n          </tr>\n        </tbody>\n      </table>\n      <p>The opposite party must now pay their share of the mediation fee before a mediator can be assigned. We will notify you as soon as that is done.</p>\n    ',
    'body_text': 'Your mediation fee payment of {currency} {amount} has been received (reference: {referenceId}). We are now waiting on the opposite party to pay their share before a mediator is assigned.',
    'variables': [
      'recipientName',
      'currency',
      'amount',
      'referenceId'
    ],
    'active': true
  },
  {
    'template_key': 'signatureVerificationRequest',
    'channel': 'EMAIL',
    'name': 'Signature Verification Request',
    'description': 'Imported from legacy template (editable in admin)',
    'subject': 'Action Required – Signature Verification for Mediation Request',
    'title': null,
    'greeting': null,
    'body_html': '<p>A mediation request in the matter of <strong>{caseTitle}</strong> (Case No. <strong>{caseId}</strong>) has been initiated. You are identified as the <strong>{partyRole}</strong> in this mediation case.</p>\n      <p>To proceed, please review and provide your signature.</p>\n      <p><a href="{signUrl}" style="display:inline-block;background:#3c78d8;color:#fff;text-decoration:none;padding:12px 20px;border-radius:4px;">Review & Sign Now</a></p>',
    'body_text': null,
    'variables': [
      'caseId',
      'caseTitle',
      'partyRole',
      'signUrl'
    ],
    'active': true
  },
  {
    'template_key': 'paymentInitiatedByFirstParty',
    'channel': 'EMAIL',
    'name': 'Payment confirmation to first party (notice fee)',
    'description': 'Sent to the claimant confirming receipt of the notice fee payment.',
    'subject': 'Payment received — notice fee',
    'title': null,
    'greeting': 'Hello {recipientName},',
    'body_html': '\n      <p>We have received your notice fee payment. The formal notice has been dispatched to the opposite party.</p>\n      <table style="border-collapse:collapse;width:100%;margin:16px 0;">\n        <tbody>\n          <tr>\n            <td style="padding:8px 12px;color:#6b7280;font-size:14px;white-space:nowrap;">Amount</td>\n            <td style="padding:8px 12px;font-size:14px;"><strong>{currency} {amount}</strong></td>\n          </tr>\n          <tr style="background:#f9fafb;">\n            <td style="padding:8px 12px;color:#6b7280;font-size:14px;white-space:nowrap;">Reference</td>\n            <td style="padding:8px 12px;font-size:14px;">{referenceId}</td>\n          </tr>\n        </tbody>\n      </table>\n      <p>We will notify you once the opposite party responds.</p>\n    ',
    'body_text': 'Your notice fee payment of {currency} {amount} has been received (reference: {referenceId}). The opposite party has been notified.',
    'variables': [
      'recipientName',
      'currency',
      'amount',
      'referenceId'
    ],
    'active': true
  },
  {
    'template_key': 'caseCorrespondenceNewMessage',
    'channel': 'EMAIL',
    'name': 'Case Correspondence New Message',
    'description': 'Imported from legacy template (editable in admin)',
    'subject': 'New message — {senderSummary} — {caseLabel}',
    'title': null,
    'greeting': null,
    'body_html': '<h2 style="margin:0 0 12px;font-size:18px;color:#1a237e;">New message for the team</h2>\n      <p style="margin:0 0 16px;line-height:1.5;">Open the Message center link below to read the full thread and reply.</p>\n      <table style="width:100%;border-collapse:collapse;font-size:14px;color:#333;margin-bottom:16px;">\n        <tr><td style="padding:8px 0;font-weight:bold;width:160px;vertical-align:top;">Case</td><td>{caseLabel}</td></tr>\n        <tr><td style="padding:8px 0;font-weight:bold;vertical-align:top;">From</td><td>{senderSummary}</td></tr>\n      </table>\n      <div style="background:#f5f7fb;border:1px solid #e0e6f0;border-radius:8px;padding:12px 14px;margin-bottom:16px;">\n        <p style="margin:0 0 6px;font-size:12px;text-transform:uppercase;letter-spacing:0.04em;color:#5c678a;font-weight:bold;">Message</p>\n        <p style="margin:0;white-space:pre-wrap;line-height:1.5;color:#222;">{messagePreview}</p>\n      </div>\n      <p style="margin:0 0 8px;font-size:14px;"><strong>Attachments</strong></p>\n      <p style="margin:0 0 12px;color:#444;">{attachmentSummary}</p>\n      {attachmentLinksHtml}\n      <p style="margin:16px 0 10px;"><a href="{openPortalUrl}" style="display:inline-block;padding:10px 18px;background:#3758d5;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold;">Open in Message center</a></p>\n           <p style="margin:0;font-size:13px;color:#666;word-break:break-all;">{openPortalUrl}</p>\n      <p style="margin-top:20px;font-size:13px;color:#666;">This is an automated notice. Please do not reply to this email; use the portal instead.</p>',
    'body_text': null,
    'variables': [
      'attachmentLinksHtml',
      'attachmentSummary',
      'caseLabel',
      'messagePreview',
      'openPortalUrl',
      'senderSummary'
    ],
    'active': true
  },
  {
    'template_key': 'passwordResetOtp',
    'channel': 'EMAIL',
    'name': 'Password reset OTP',
    'description': 'Sent when a user requests a password reset. Referenced by authController.resetPassword but was missing from this seed file — added to fix a broken email send.',
    'subject': 'Your Kadr password reset code',
    'title': null,
    'greeting': 'Hello {recipientName},',
    'body_html': "\n      <p>Use the code below to reset your password. This code expires in 10 minutes.</p>\n      <p style=\"text-align:center;margin:24px 0;font-size:28px;font-weight:700;letter-spacing:6px;\">{otp}</p>\n      <p style=\"font-size:13px;color:#6b7280;\">If you didn't request this, you can safely ignore this email.</p>\n    ",
    'body_text': "Your password reset code is {otp}. This code expires in 10 minutes. If you didn't request this, you can ignore this email.",
    'variables': [
      'recipientName',
      'otp'
    ],
    'active': true
  },
  {
    'template_key': 'passwordResetSuccess',
    'channel': 'EMAIL',
    'name': 'Password Reset Success',
    'description': 'Imported from legacy template (editable in admin)',
    'subject': 'Password Reset Successful - Kadr.live',
    'title': null,
    'greeting': null,
    'body_html': '<p>Your password has been successfully reset for your Kadr.live account.</p>\n      <p>You can now log in using your new password.</p>',
    'body_text': null,
    'variables': [],
    'active': true
  },
  {
    'template_key': 'blogPublished',
    'channel': 'EMAIL',
    'name': 'Blog Published',
    'description': 'Imported from legacy template (editable in admin)',
    'subject': "Your blog '{title}' is now live!",
    'title': null,
    'greeting': null,
    'body_html': '<p>Your blog <b>{title}</b> is now live!</p>\n      <p>To view your blog, click <a href="{blogUrl}">here</a>.</p>\n      <p>Thank you for sharing your thoughts with the community!</p>',
    'body_text': null,
    'variables': [
      'blogUrl',
      'title'
    ],
    'active': true
  },
  {
    'template_key': 'noticeDetailsToSecondPartyCcFirstParty',
    'channel': 'EMAIL',
    'name': 'Mediation notice details (no sign-up link)',
    'description': "Sent to the second party, and separately to the first party's own address, with case details only — no sign-up link. A follow-up email (paymentNoticeToSecondParty) carries the second party's personal join link. evidenceRowHtml is pre-rendered by the service — empty string when no document was uploaded.",
    'subject': 'Mediation notice — Case {caseId}',
    'title': null,
    'greeting': 'Hello {recipientName},',
    'body_html': '\n      <p>A mediation case has been filed by <strong>{firstPartyName}</strong>, naming the other party as the respondent.</p>\n      <table style="border-collapse:collapse;width:100%;margin:16px 0;">\n        <tbody>\n          <tr>\n            <td style="padding:8px 12px;color:#6b7280;font-size:14px;white-space:nowrap;vertical-align:top;">Case ID</td>\n            <td style="padding:8px 12px;font-size:14px;vertical-align:top;"><strong>{caseId}</strong></td>\n          </tr>\n          <tr style="background:#f9fafb;">\n            <td style="padding:8px 12px;color:#6b7280;font-size:14px;white-space:nowrap;vertical-align:top;">Category</td>\n            <td style="padding:8px 12px;font-size:14px;vertical-align:top;">{category}</td>\n          </tr>\n          <tr>\n            <td style="padding:8px 12px;color:#6b7280;font-size:14px;white-space:nowrap;vertical-align:top;">Case type</td>\n            <td style="padding:8px 12px;font-size:14px;vertical-align:top;">{caseType}</td>\n          </tr>\n          <tr style="background:#f9fafb;">\n            <td style="padding:8px 12px;color:#6b7280;font-size:14px;white-space:nowrap;vertical-align:top;">Description</td>\n            <td style="padding:8px 12px;font-size:14px;vertical-align:top;">{description}</td>\n          </tr>\n          {evidenceRowHtml}\n        </tbody>\n      </table>\n      <p>A separate email will follow shortly with a link to register on the Kadr portal and get started.</p>\n      <p style="font-size:13px;color:#6b7280;">If you believe this notice was sent in error, please contact our support team.</p>\n    ',
    'body_text': 'A mediation case has been filed by {firstPartyName}. Case ID: {caseId}. Category: {category}. Description: {description}. A separate email will follow with a link to register and get started.',
    'variables': [
      'recipientName',
      'firstPartyName',
      'caseId',
      'caseType',
      'category',
      'description',
      'evidenceRowHtml'
    ],
    'active': true
  },
  {
    'template_key': 'paymentNoticeToSecondParty',
    'channel': 'EMAIL',
    'name': 'Sign-up link for second party (notice response)',
    'description': "Sent to the respondent right after noticeDetailsToSecondPartyCcFirstParty, containing only the registration/join link. Kept link-only (not CC'd to the first party) so the first party never sees the second party's personal sign-up URL.",
    'subject': 'Get started — respond to your mediation notice',
    'title': null,
    'greeting': 'Hello {recipientName},',
    'body_html': '\n      <p>As mentioned in our previous email, here is your link to register on the Kadr portal and respond to the mediation notice filed by <strong>{firstPartyName}</strong> (Case ID: <strong>{caseId}</strong>).</p>\n      <p style="text-align:center;margin:24px 0;">\n        <a href="{registerUrl}" style="background:#3b5bdb;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:600;display:inline-block;">Accept &amp; respond</a>\n      </p>\n      <p style="font-size:13px;color:#6b7280;">This link is personal to you — please do not share it. If you believe this notice was sent in error, please contact our support team.</p>\n    ',
    'body_text': 'Here is your link to register on the Kadr portal and respond to the mediation notice filed by {firstPartyName} (Case ID: {caseId}): {registerUrl}',
    'variables': [
      'recipientName',
      'firstPartyName',
      'caseId',
      'registerUrl'
    ],
    'active': true
  },
  {
    'template_key': 'registrationUnderReview',
    'channel': 'EMAIL',
    'name': 'Registration Under Review',
    'description': 'Imported from legacy template (editable in admin)',
    'subject': 'Thanks for registering on Kadr.live!',
    'title': null,
    'greeting': null,
    'body_html': "<p>Thanks for registering on Kadr.live as a {roleLabel}. Your account is under review, and you'll be notified once approved by the KADR team.</p>",
    'body_text': null,
    'variables': [
      'roleLabel'
    ],
    'active': true
  }
]

const NOTIFICATION_TRIGGER_RULES = []
async function seedAdmin () {
  if (!ADMIN_USER.password) {
    throw new Error('ADMIN_PASSWORD env var is required to seed the master admin (not hardcoded in this file — see header).')
  }
  if (ADMIN_USER.password.length < 8) {
    throw new Error('ADMIN_PASSWORD must be at least 8 characters.')
  }
  const passwordHash = await helper.hashPassword(ADMIN_USER.password)
  const key = { email_user_type: { email: ADMIN_USER.email, user_type: 'ADMIN' } }
  const existing = await prisma.user.findUnique({ where: key, select: { id: true } })
  if (existing) {
    await prisma.user.update({
      where: key,
      data: {
        name: ADMIN_USER.name,
        phone_number: ADMIN_USER.phone_number,
        password_hash: passwordHash,
        active: true,
        master: true,
        is_deleted: false
      }
    })
    console.log(`admin      update ${ADMIN_USER.email}`)
  } else {
    await prisma.user.create({
      data: {
        name: ADMIN_USER.name,
        email: ADMIN_USER.email,
        phone_number: ADMIN_USER.phone_number,
        password_hash: passwordHash,
        user_type: 'ADMIN',
        active: true,
        master: true,
        is_self_signed_up: false,
        is_deleted: false
      }
    })
    console.log(`admin      create ${ADMIN_USER.email}`)
  }
}

async function seedAvailableLanguages () {
  await prisma.available_languages.deleteMany({})
  await prisma.available_languages.createMany({ data: AVAILABLE_LANGUAGES })
  console.log(`languages  reset — ${AVAILABLE_LANGUAGES.length} rows`)
}

async function seedNotificationChannelSettings () {
  await prisma.notification_channel_settings.deleteMany({})
  await prisma.notification_channel_settings.createMany({ data: NOTIFICATION_CHANNEL_SETTINGS })
  console.log(`channels   reset — ${NOTIFICATION_CHANNEL_SETTINGS.length} rows (PUSH vapid keys NOT seeded — run npm run vapid:generate if needed)`)
}

async function seedNotificationTemplates () {
  await prisma.notification_templates.deleteMany({})
  await prisma.notification_templates.createMany({ data: NOTIFICATION_TEMPLATES })
  console.log(`templates  reset — ${NOTIFICATION_TEMPLATES.length} rows`)
}

async function seedNotificationTriggerRules () {
  await prisma.notification_trigger_rules.deleteMany({})
  if (NOTIFICATION_TRIGGER_RULES.length) {
    await prisma.notification_trigger_rules.createMany({ data: NOTIFICATION_TRIGGER_RULES })
  }
  console.log(`triggers   reset — ${NOTIFICATION_TRIGGER_RULES.length} rows`)
}

/**
 * DESTRUCTIVE — see the file header. Deletes and recreates the case
 * status/sub-status/event taxonomy, which cascades into any live case
 * (and its history) that references a status not being recreated with the
 * exact same id. Confirmed intentional; do not call this without having
 * re-read the header comment.
 */
async function seedCaseTaxonomy () {
  const [affectedCases, affectedHistory] = await Promise.all([
    prisma.cases.count({ where: { OR: [{ status: { not: null } }, { sub_status: { not: null } }] } }),
    prisma.case_history.count()
  ])
  console.log('')
  console.log('⚠️  DESTRUCTIVE STEP: about to delete case_statuses / case_sub_statuses / case_events.')
  console.log(`⚠️  This will cascade-delete ${affectedCases} case(s) currently referencing a status, and up to ${affectedHistory} case_history row(s), via onDelete:Cascade.`)
  console.log('⚠️  Proceeding — this was explicitly confirmed when this script was written.')
  console.log('')

  // Children first, then parents — cascade makes ordering safe either way,
  // but this avoids relying on cascade fan-out for the delete itself.
  await prisma.case_events.deleteMany({})
  await prisma.case_sub_statuses.deleteMany({})
  await prisma.case_statuses.deleteMany({})

  // Parents first for insert, since sub-statuses/events reference status ids.
  await prisma.case_statuses.createMany({ data: CASE_STATUSES })
  await prisma.case_sub_statuses.createMany({ data: CASE_SUB_STATUSES })
  await prisma.case_events.createMany({ data: CASE_EVENTS })

  console.log(`taxonomy   reset — ${CASE_STATUSES.length} statuses, ${CASE_SUB_STATUSES.length} sub-statuses, ${CASE_EVENTS.length} events`)
}

async function main () {
  console.log('Seeding reference data...')
  await seedAdmin()
  await seedAvailableLanguages()
  await seedNotificationChannelSettings()
  await seedNotificationTemplates()
  await seedNotificationTriggerRules()
  await seedCaseTaxonomy()
  console.log('')
  console.log('Done.')
}

main()
  .catch((err) => {
    console.error('Seed failed:', err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
