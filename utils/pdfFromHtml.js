const puppeteer = require('puppeteer')

async function renderPdfFromHtml (html) {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  })
  try {
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'load', timeout: 30000 })
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '8mm', bottom: '8mm', left: '8mm', right: '8mm' }
    })
    return Buffer.from(pdfBuffer)
  } finally {
    await browser.close()
  }
}

function sendPdfResponse (res, buffer, filename) {
  res.writeHead(200, {
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="${filename}"`,
    'Content-Length': buffer.length
  })
  res.end(buffer)
}

module.exports = { renderPdfFromHtml, sendPdfResponse }
