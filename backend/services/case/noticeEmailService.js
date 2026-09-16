const helper = require('../../utils/helper')
const { copyEmailToRepresentative, PARTY_SIDES } = require('./representativeService')

/**
 * Sends the two-part mediation notice to the second party: case details
 * (to the second party, with the first party CC'd on the same email — plus a
 * copy to each side's rep), followed by the sign-up/join link (second party +
 * their rep only, never the first party or their rep).
 * Shared by the original send (paymentFulfillmentService), an admin-approved
 * email correction resend (emailCorrectionController), and the day-2/day-4
 * acceptance reminders (noticeReminderScheduler) — same content and
 * recipient/CC pattern every time.
 *
 * `caseDetails` must include: caseId (human string), case_type, category,
 * description, evidence_document_url, user_cases_second_partyTouser
 * ({id, name, email}), user_cases_first_partyTouser ({name, email}).
 */
async function sendNoticeEmailsToSecondParty ({ caseId, caseDetails }) {
  const uniqueSignUpLink = helper.generateUniqueSignUpLink(caseDetails.user_cases_second_partyTouser.id)
  const evidenceRowHtml = caseDetails.evidence_document_url
    ? `<tr>
        <td style="padding:8px 12px;color:#6b7280;font-size:14px;white-space:nowrap;vertical-align:top;">Evidence document</td>
        <td style="padding:8px 12px;font-size:14px;vertical-align:top;"><a href="${caseDetails.evidence_document_url}" target="_blank" rel="noopener noreferrer">View document</a></td>
      </tr>`
    : ''

  // 1) Case details — one email to the second party, with the first party
  // CC'd on the same message (real SMTP CC), so both sides see it as the
  // same notice rather than two separate emails. No sign-up link here.
  const noticeDetailsVars = {
    recipientName: caseDetails.user_cases_second_partyTouser.name,
    firstPartyName: caseDetails.user_cases_first_partyTouser.name,
    secondPartyName: caseDetails.user_cases_second_partyTouser.name,
    caseId: caseDetails.caseId,
    caseType: caseDetails.case_type,
    category: caseDetails.category,
    description: caseDetails.description,
    evidenceRowHtml
  }
  await helper.sendTemplatedEmail(
    'noticeDetailsToSecondPartyCcFirstParty',
    caseDetails.user_cases_second_partyTouser.email,
    noticeDetailsVars,
    [],
    { caseId, cc: caseDetails.user_cases_first_partyTouser.email }
  )
  await copyEmailToRepresentative({ caseId, side: PARTY_SIDES.SECOND, templateKey: 'noticeDetailsToSecondPartyCcFirstParty', variables: noticeDetailsVars })
  await copyEmailToRepresentative({
    caseId,
    side: PARTY_SIDES.FIRST,
    templateKey: 'noticeDetailsToSecondPartyCcFirstParty',
    variables: { ...noticeDetailsVars, recipientName: caseDetails.user_cases_first_partyTouser.name }
  })

  // 2) Sign-up/join link — second party only, sent right after. Deliberately
  // not CC'd to the first party, who should not see the second party's
  // personal registration link.
  const noticeLinkVars = {
    recipientName: caseDetails.user_cases_second_partyTouser.name,
    firstPartyName: caseDetails.user_cases_first_partyTouser.name,
    caseId: caseDetails.caseId,
    registerUrl: uniqueSignUpLink
  }
  await helper.sendTemplatedEmail('paymentNoticeToSecondParty', caseDetails.user_cases_second_partyTouser.email, noticeLinkVars, [], { caseId })
  await copyEmailToRepresentative({ caseId, side: PARTY_SIDES.SECOND, templateKey: 'paymentNoticeToSecondParty', variables: noticeLinkVars })
}

module.exports = { sendNoticeEmailsToSecondParty }
