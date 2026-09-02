const emailConfig = {
  provider: process.env.EMAIL_PROVIDER || 'smtp',
  from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
  brandName: process.env.EMAIL_BRAND_NAME || 'Kadr.live',
  supportEmail: process.env.EMAIL_SUPPORT_EMAIL || process.env.EMAIL_USER,
  headerHtml: process.env.EMAIL_HEADER_HTML || `
    <div style="background-color:#3c78d8;padding:15px 20px;color:#ffffff;">
      <h2 style="margin:0;font-size:20px;">Kadr.live</h2>
    </div>
  `,
  footerHtml: process.env.EMAIL_FOOTER_HTML || `
    <div style="background-color:#fafafa;padding:20px;font-size:14px;color:#777;border-top:1px solid #eee;">
      <p>If you believe this message was sent to you in error, please contact our support team.</p>
      <p style="margin-top:15px;">Regards,<br/><strong>Team Kadr</strong></p>
    </div>
  `
}

module.exports = emailConfig
