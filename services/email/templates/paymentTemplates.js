module.exports = {
  paymentNoticeToSecondParty: ({ firstPartyName, caseId, caseType, category, description, evidenceUrl, registerUrl }) => ({
    subject: 'Mediation Request on Kadr.live',
    bodyHtml: `
      <p>We have received a mediation request from ${firstPartyName}.</p>
      <table style="border-collapse:collapse;width:100%;max-width:600px;">
        <tr><td style="padding:8px;border:1px solid #ddd;"><strong>Case ID</strong></td><td style="padding:8px;border:1px solid #ddd;">${caseId}</td></tr>
        <tr><td style="padding:8px;border:1px solid #ddd;"><strong>Case Type</strong></td><td style="padding:8px;border:1px solid #ddd;">${caseType}</td></tr>
        <tr><td style="padding:8px;border:1px solid #ddd;"><strong>Category</strong></td><td style="padding:8px;border:1px solid #ddd;">${category}</td></tr>
        <tr><td style="padding:8px;border:1px solid #ddd;"><strong>Description</strong></td><td style="padding:8px;border:1px solid #ddd;">${description}</td></tr>
        <tr><td style="padding:8px;border:1px solid #ddd;"><strong>Evidence</strong></td><td style="padding:8px;border:1px solid #ddd;"><a href="${evidenceUrl}" target="_blank">View Documents</a></td></tr>
      </table>
      <p style="margin-top:16px;"><a href="${registerUrl}" style="background-color:#4CAF50;color:#fff;padding:10px 18px;text-decoration:none;border-radius:4px;">Register Now</a></p>
    `
  }),
  paymentInitiatedByFirstParty: ({ currency, amount, referenceId }) => ({
    subject: 'Mediation Initiated on Kadr.live',
    bodyHtml: `
      <p>We have received your payment of ${currency}.${amount}/- with reference #${referenceId} for initiating mediation.</p>
      <p>Notice has been sent to the other party. Once they accept, you'll receive confirmation.</p>
    `
  }),
  mediationAcceptanceFirstParty: () => ({
    subject: 'Opposite party has accepted the mediation request',
    bodyHtml: '<p>Opposite party has accepted the mediation request. Please make payment to start mediation and mediator assignment.</p>'
  }),
  mediationAcceptanceSecondParty: () => ({
    subject: 'You have accepted the mediation request',
    bodyHtml: '<p>You have accepted the mediation request. Waiting for first party payment to start mediation and mediator assignment.</p>'
  }),
  mediatorAssignedMeetingScheduled: ({ paidMessage, meetingBodyHtml }) => ({
    subject: 'Mediator assigned and meeting scheduled',
    bodyHtml: `${paidMessage || ''}<p>A mediator has been assigned and a meeting is scheduled. Details below:</p>${meetingBodyHtml}`
  }),
  mediatorInvoicePaymentDone: ({ invoiceNumber, caseId, netPayable }) => ({
    subject: 'Invoice payment completed',
    bodyHtml: `
      <p>Your invoice payment has been marked as completed by the admin team.</p>
      <table style="border-collapse:collapse;width:100%;max-width:600px;">
        <tr><td style="padding:8px;border:1px solid #ddd;"><strong>Invoice Number</strong></td><td style="padding:8px;border:1px solid #ddd;">${invoiceNumber}</td></tr>
        <tr><td style="padding:8px;border:1px solid #ddd;"><strong>Case</strong></td><td style="padding:8px;border:1px solid #ddd;">${caseId}</td></tr>
        <tr><td style="padding:8px;border:1px solid #ddd;"><strong>Amount Paid</strong></td><td style="padding:8px;border:1px solid #ddd;">INR ${netPayable}</td></tr>
      </table>
    `
  })
}
