const emailConfig = require('../../config/emailConfig')

function renderEmailLayout ({ greeting, bodyHtml, headerHtml, footerHtml }) {
  const header = headerHtml != null ? headerHtml : emailConfig.headerHtml
  const footer = footerHtml != null ? footerHtml : emailConfig.footerHtml
  return `
    <div style="font-family: Arial, sans-serif; background-color: #f4f6f8; padding: 30px;">
      <div style="max-width: 700px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
        ${header}
        <div style="padding: 25px;">
          <p style="font-size: 16px; color: #444;">${greeting || 'Hello,'}</p>
          <div style="font-size: 16px; color: #444; line-height: 1.6;">${bodyHtml || ''}</div>
        </div>
        ${footer}
      </div>
    </div>
  `
}

module.exports = { renderEmailLayout }
