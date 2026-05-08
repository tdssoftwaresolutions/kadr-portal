module.exports = {
  signatureVerificationRequest: ({ caseId, caseTitle, signUrl, partyRole }) => ({
    subject: 'Action Required – Signature Verification for Mediation Request',
    bodyHtml: `
      <p>A mediation request in the matter of <strong>${caseTitle}</strong> (Case No. <strong>${caseId}</strong>) has been initiated. You are identified as the <strong>${partyRole}</strong> in this mediation case.</p>
      <p>To proceed, please review and provide your signature.</p>
      <p><a href="${signUrl}" style="display:inline-block;background:#3c78d8;color:#fff;text-decoration:none;padding:12px 20px;border-radius:4px;">Review & Sign Now</a></p>
    `
  }),
  finalAgreementSignatureRequest: ({ caseId, signUrl, partyRole }) => ({
    subject: 'Final Step – Signature Required for Mediation Agreement',
    bodyHtml: `
      <p>Congratulations! Mediation for case <strong>${caseId}</strong> has been resolved. You are identified as the <strong>${partyRole}</strong>.</p>
      <p>To complete the process, please sign the final agreement.</p>
      <p><a href="${signUrl}" style="display:inline-block;background:#3c78d8;color:#fff;text-decoration:none;padding:12px 20px;border-radius:4px;">Review & Sign Final Agreement</a></p>
    `
  }),
  signedAgreementAvailable: ({ caseId, agreementUrl }) => ({
    subject: 'Signed Agreement – Rouse Avenue Mediation Center',
    bodyHtml: `
      <p>This is regarding mediation case <strong>#${caseId}</strong>.</p>
      <p>The signed agreement is available at the link below:</p>
      <p><a href="${agreementUrl}" style="display:inline-block;background:#3c78d8;color:#fff;text-decoration:none;padding:12px 20px;border-radius:4px;">View Signed Agreement</a></p>
    `
  })
}
