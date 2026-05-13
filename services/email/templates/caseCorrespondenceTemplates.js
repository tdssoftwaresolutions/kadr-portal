function escapeHtml (s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

module.exports = {
  caseCorrespondenceNewMessage: ({
    recipientName,
    senderName,
    senderRoleLabel,
    senderSummary,
    caseLabel,
    messagePreview,
    attachmentSummary,
    attachmentLinksHtml,
    isAdminRecipient,
    openPortalUrl
  }) => ({
    subject: isAdminRecipient
      ? `New message — ${senderSummary} — ${caseLabel}`
      : `${senderSummary} — ${caseLabel}`,
    bodyHtml: `
      <h2 style="margin:0 0 12px;font-size:18px;color:#1a237e;">${isAdminRecipient ? 'New message for the team' : 'New message in your case'}</h2>
      <p style="margin:0 0 16px;line-height:1.5;">${isAdminRecipient
        ? 'Open the Message center link below to read the full thread and reply.'
        : 'Sign in to the Kadr portal to view the full thread and reply.'}</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px;color:#333;margin-bottom:16px;">
        <tr><td style="padding:8px 0;font-weight:bold;width:160px;vertical-align:top;">Case</td><td>${escapeHtml(caseLabel)}</td></tr>
        <tr><td style="padding:8px 0;font-weight:bold;vertical-align:top;">From</td><td>${escapeHtml(senderSummary)}</td></tr>
      </table>
      <div style="background:#f5f7fb;border:1px solid #e0e6f0;border-radius:8px;padding:12px 14px;margin-bottom:16px;">
        <p style="margin:0 0 6px;font-size:12px;text-transform:uppercase;letter-spacing:0.04em;color:#5c678a;font-weight:bold;">Message</p>
        <p style="margin:0;white-space:pre-wrap;line-height:1.5;color:#222;">${escapeHtml(messagePreview)}</p>
      </div>
      <p style="margin:0 0 8px;font-size:14px;"><strong>Attachments</strong></p>
      <p style="margin:0 0 12px;color:#444;">${attachmentSummary}</p>
      ${attachmentLinksHtml || ''}
      ${isAdminRecipient && openPortalUrl
        ? `<p style="margin:16px 0 10px;"><a href="${String(openPortalUrl).replace(/"/g, '%22')}" style="display:inline-block;padding:10px 18px;background:#3758d5;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold;">Open in Message center</a></p>
           <p style="margin:0;font-size:13px;color:#666;word-break:break-all;">${escapeHtml(openPortalUrl)}</p>`
        : ''}
      <p style="margin-top:20px;font-size:13px;color:#666;">This is an automated notice. Please do not reply to this email; use the portal instead.</p>
    `
  })
}
