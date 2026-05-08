const listItems = (items, renderItem) => {
  if (!items || items.length === 0) {
    return '<p style="margin: 8px 0 0 0; color: #666;">None.</p>'
  }
  return `<ul style="margin:8px 0 0 18px;padding:0;">${items.map((item) => `<li style="margin-bottom:6px;">${renderItem(item)}</li>`).join('')}</ul>`
}

const formatMeetingRangeIST = (startDatetime, endDatetime) => {
  const start = new Date(startDatetime)
  const end = new Date(endDatetime)
  const optionsDate = { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'long', year: 'numeric' }
  const optionsTime = { timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit', hour12: true }
  const dateStr = new Intl.DateTimeFormat('en-IN', optionsDate).format(start)
  const startTime = new Intl.DateTimeFormat('en-IN', optionsTime).format(start)
  const endTime = new Intl.DateTimeFormat('en-IN', optionsTime).format(end)
  return `${dateStr}, ${startTime} - ${endTime}`
}

const formatMeetingRangeIST_DateOnly = (startDatetime, endDatetime) => {
  const start = new Date(startDatetime)
  const end = new Date(endDatetime)
  const optionsTime = { timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit', hour12: true }
  const startTime = new Intl.DateTimeFormat('en-IN', optionsTime).format(start)
  const endTime = new Intl.DateTimeFormat('en-IN', optionsTime).format(end)
  return `${startTime} - ${endTime}`
}

module.exports = ({ sections }) => {
  const blocks = []

  if (sections.pendingApprovals && (sections.pendingApprovals.clients > 0 || sections.pendingApprovals.mediators > 0)) {
    blocks.push(`
      <h3 style="margin:18px 0 8px 0;">Pending User Approvals</h3>
      <p style="margin:0;">Clients pending: <strong>${sections.pendingApprovals.clients}</strong></p>
      <p style="margin:0;">Mediators pending: <strong>${sections.pendingApprovals.mediators}</strong></p>
      <p style="margin-top:8px;">Please review and approve these accounts.</p>
    `)
  }

  if (sections.pendingPayments && sections.pendingPayments.length > 0) {
    blocks.push(`
      <h3 style="margin:18px 0 8px 0;">Pending Payments</h3>
      <p style="margin:0;">You have <strong>${sections.pendingPayments.length}</strong> case(s) waiting for payment.</p>
      ${listItems(sections.pendingPayments, (payment) => `Case <strong>${payment.caseId || 'N/A'}</strong> (${payment.reason})`)}
    `)
  }

  if (sections.pendingCaseAcceptance && sections.pendingCaseAcceptance.length > 0) {
    blocks.push(`
      <h3 style="margin:18px 0 8px 0;">Pending Case Acceptance</h3>
      <p style="margin:0;">You have <strong>${sections.pendingCaseAcceptance.length}</strong> mediation request(s) awaiting acceptance.</p>
      ${listItems(sections.pendingCaseAcceptance, (item) => `Case <strong>${item.caseId || 'N/A'}</strong> - from ${item.firstPartyName || 'N/A'}`)}
    `)
  }

  if (sections.todayMeetings && sections.todayMeetings.length > 0) {
    blocks.push(`
      <h3 style="margin:18px 0 8px 0;">Today's Meetings</h3>
      <p style="margin:0;">You have <strong>${sections.todayMeetings.length}</strong> meeting(s) scheduled today.</p>
      ${listItems(sections.todayMeetings, (meeting) => `
        <div><strong>${meeting.title || 'Meeting'}</strong> (${meeting.caseId || 'N/A'})</div>
        <div>${meeting.description || ''}</div>
        <div>${formatMeetingRangeIST_DateOnly(meeting.start_datetime, meeting.end_datetime)}</div>
        <div><a href="${meeting.meeting_link || '#'}" target="_blank">Join link</a></div>
      `)}
    `)
  }

  if (sections.pendingFeedback && sections.pendingFeedback.length > 0) {
    blocks.push(`
      <h3 style="margin:18px 0 8px 0;">Pending Meeting Feedback</h3>
      <p style="margin:0;">Please submit feedback for the meeting(s) below.</p>
      ${listItems(sections.pendingFeedback, (meeting) => `
        <div><strong>${meeting.title || 'Meeting'}</strong> (${meeting.caseId || 'N/A'})</div>
        <div>${formatMeetingRangeIST(meeting.start_datetime, meeting.end_datetime)}</div>
      `)}
    `)
  }

  if (sections.pendingSignatures && sections.pendingSignatures.length > 0) {
    blocks.push(`
      <h3 style="margin:18px 0 8px 0;">Pending Signatures</h3>
      <p style="margin:0;">You have <strong>${sections.pendingSignatures.length}</strong> pending signature request(s).</p>
      ${listItems(sections.pendingSignatures, (item) => `Case <strong>${item.caseId || 'N/A'}</strong> - Please complete your signature.`)}
    `)
  }

  return {
    subject: 'Daily Reminder Summary - Kadr.live',
    bodyHtml: blocks.join('')
  }
}
