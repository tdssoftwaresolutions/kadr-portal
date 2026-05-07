module.exports = {
  mediatorManualAssignmentRequired: ({ caseId }) => ({
    subject: 'Mediator Not Available - Need manual intervention',
    greeting: 'Hello Team,',
    bodyHtml: `<p>No mediator could be auto-assigned for case <strong>${caseId}</strong>. Please assign manually from admin panel.</p>`
  })
}
