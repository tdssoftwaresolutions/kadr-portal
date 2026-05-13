function escapeHtml (s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

module.exports = {
  websiteContactNewLeadAdmin: ({
    recipientName,
    leadTitle,
    leadEmail,
    leadVisitorName,
    leadPhone,
    messagePreview,
    openInboxUrl
  }) => ({
    subject: `New website inquiry — ${leadTitle}`,
    bodyHtml: `
      <h2 style="margin:0 0 12px;font-size:18px;color:#1a237e;">New lead from your website</h2>
      <p style="margin:0 0 14px;line-height:1.5;">Someone submitted the contact form. Reply from the admin <strong>Message center</strong> (Website source).</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px;color:#333;margin-bottom:16px;">
        <tr><td style="padding:8px 0;font-weight:bold;width:140px;vertical-align:top;">Title</td><td>${escapeHtml(leadTitle)}</td></tr>
        ${leadVisitorName ? `<tr><td style="padding:8px 0;font-weight:bold;vertical-align:top;">Name</td><td>${escapeHtml(leadVisitorName)}</td></tr>` : ''}
        <tr><td style="padding:8px 0;font-weight:bold;vertical-align:top;">Email</td><td>${escapeHtml(leadEmail)}</td></tr>
        <tr><td style="padding:8px 0;font-weight:bold;vertical-align:top;">Phone</td><td>${escapeHtml(leadPhone || '—')}</td></tr>
      </table>
      <div style="background:#f5f7fb;border:1px solid #e0e6f0;border-radius:8px;padding:12px 14px;margin-bottom:16px;">
        <p style="margin:0 0 6px;font-size:12px;text-transform:uppercase;letter-spacing:0.04em;color:#5c678a;font-weight:bold;">Message</p>
        <p style="margin:0;white-space:pre-wrap;line-height:1.5;color:#222;">${escapeHtml(messagePreview)}</p>
      </div>
      ${openInboxUrl
        ? `<p style="margin:0 0 12px;"><a href="${String(openInboxUrl).replace(/"/g, '%22')}" style="display:inline-block;padding:10px 18px;background:#3758d5;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold;">Open in Message center</a></p>
           <p style="margin:0;font-size:13px;color:#666;word-break:break-all;">${escapeHtml(openInboxUrl)}</p>`
        : ''}
      <p style="margin-top:18px;font-size:13px;color:#666;">This is an automated notice.</p>
    `
  }),

  websiteContactCustomerReply: ({
    recipientName,
    leadTitle,
    adminName,
    replyBody,
    websiteUrl,
    openPortalUrl
  }) => ({
    subject: `Re: ${leadTitle}`,
    bodyHtml: `
      <h2 style="margin:0 0 12px;font-size:18px;color:#1a237e;">Message from Kadr</h2>
      <p style="margin:0 0 12px;line-height:1.5;">${recipientName ? `Hi ${escapeHtml(recipientName)},<br/><br/>` : ''}<strong>Admin: ${escapeHtml(adminName)}</strong> replied regarding your inquiry <strong>${escapeHtml(leadTitle)}</strong>.</p>
      <div style="background:#f5f7fb;border:1px solid #e0e6f0;border-radius:8px;padding:12px 14px;margin-bottom:16px;">
        <p style="margin:0;white-space:pre-wrap;line-height:1.5;color:#222;">${escapeHtml(replyBody)}</p>
      </div>
      <p style="font-size:13px;color:#666;">You can reply to this email to continue the conversation.</p>
      ${openPortalUrl
        ? `<p style="margin:12px 0 0;font-size:13px;color:#666;">Open this thread in your portal: <a href="${String(openPortalUrl).replace(/"/g, '%22')}">${escapeHtml(openPortalUrl)}</a></p>`
        : ''}
      ${websiteUrl
        ? `<p style="font-size:13px;color:#666;margin-top:8px;">Website: <a href="${String(websiteUrl).replace(/"/g, '%22')}">${escapeHtml(websiteUrl)}</a></p>`
        : ''}
    `
  }),

  websiteContactPortalMessageAdmin: ({
    participantName,
    topicLabel,
    threadTitle,
    messagePreview,
    openInboxUrl
  }) => ({
    subject: `Portal support — ${participantName} (${topicLabel})`,
    bodyHtml: `
      <h2 style="margin:0 0 12px;font-size:18px;color:#1a237e;">Logged-in user support</h2>
      <p style="margin:0 0 14px;line-height:1.5;">${escapeHtml(participantName)} sent a message (topic: <strong>${escapeHtml(topicLabel)}</strong>). Reply from the admin <strong>Message center</strong> (Portal support).</p>
      <p style="margin:0 0 8px;font-size:13px;color:#555;"><strong>Thread</strong> ${escapeHtml(threadTitle)}</p>
      <div style="background:#f5f7fb;border:1px solid #e0e6f0;border-radius:8px;padding:12px 14px;margin-bottom:16px;">
        <p style="margin:0;white-space:pre-wrap;line-height:1.5;color:#222;">${escapeHtml(messagePreview)}</p>
      </div>
      ${openInboxUrl
        ? `<p style="margin:0 0 12px;"><a href="${String(openInboxUrl).replace(/"/g, '%22')}" style="display:inline-block;padding:10px 18px;background:#3758d5;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold;">Open in Message center</a></p>
           <p style="margin:0;font-size:13px;color:#666;word-break:break-all;">${escapeHtml(openInboxUrl)}</p>`
        : ''}
      <p style="margin-top:18px;font-size:13px;color:#666;">This is an automated notice.</p>
    `
  })
}
