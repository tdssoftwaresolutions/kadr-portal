module.exports = {
  meetingInvite: ({ caseId, title, meetingType, description, scheduleRange, googleCalendarLink, meetingLink }) => ({
    subject: `New Meeting invite - Case ${caseId}`,
    bodyHtml: `
      <p>You have a new meeting scheduled. Please find details below:</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px;color:#333;">
        <tr><td style="padding:8px 0;font-weight:bold;width:180px;">Meeting Title:</td><td>${title}</td></tr>
        <tr><td style="padding:8px 0;font-weight:bold;">Meeting Type:</td><td>${meetingType}</td></tr>
        <tr><td style="padding:8px 0;font-weight:bold;">Date & Time:</td><td>${scheduleRange}</td></tr>
        <tr><td style="padding:8px 0;font-weight:bold;">Case Number:</td><td>${caseId}</td></tr>
        <tr><td style="padding:8px 0;font-weight:bold;">Description:</td><td>${description || ''}</td></tr>
      </table>
      <p style="margin-top:20px;"><a href="${googleCalendarLink}" style="display:inline-block;padding:10px 16px;background:#0b57d0;color:#fff;text-decoration:none;border-radius:4px;">Add to Google Calendar</a></p>
      <p>You can join using the link below:</p>
      <p><a href="${meetingLink}" style="display:inline-block;padding:10px 16px;background:#1a73e8;color:#fff;text-decoration:none;border-radius:4px;">Join Meeting</a></p>
      <p style="word-break:break-all;">${meetingLink}</p>
    `
  })
}
