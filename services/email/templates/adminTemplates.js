module.exports = {
  mediatorManualAssignmentRequired: ({ caseId }) => ({
    subject: 'Mediator Not Available - Need manual intervention',
    greeting: 'Hello Team,',
    bodyHtml: `<p>No mediator could be auto-assigned for case <strong>${caseId}</strong>. Please assign manually from admin panel.</p>`
  }),
  mediatorLeftAutoReassign: ({ departedName, bodyHtml }) => ({
    subject: `Mediator left platform — cases reassigned (${departedName})`,
    greeting: 'Hello Team,',
    bodyHtml: bodyHtml || '<p>A mediator has left the platform. Please review reassigned cases.</p>'
  }),
  proActivatedFromReward: ({ recipientName, durationDays }) => ({
    subject: 'Your Kadr Pro subscription is active',
    greeting: `Hello ${recipientName || 'there'},`,
    bodyHtml: `<p>Your Pro subscription is now active for <strong>${durationDays || 30}</strong> days. Enjoy premium mediator tools on Kadr.</p>`
  }),
  rewardFulfillmentMessage: ({ subject, bodyHtml }) => ({
    subject: subject || 'Your reward from Kadr',
    bodyHtml: bodyHtml || '<p>Thank you for redeeming your reward on Kadr.</p>'
  })
}
