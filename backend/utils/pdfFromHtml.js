const puppeteer = require('puppeteer')

let browserPromise = null

async function getBrowser () {
  if (!browserPromise) {
    const launchOptions = {
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    }
    if (process.env.PUPPETEER_EXECUTABLE_PATH) {
      launchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH
    }
    browserPromise = puppeteer.launch(launchOptions)
  }
  return browserPromise
}

async function closeBrowserPool () {
  if (browserPromise) {
    const browser = await browserPromise
    await browser.close()
    browserPromise = null
  }
}

process.on('beforeExit', () => {
  closeBrowserPool().catch(() => {})
})

async function renderPdfFromHtml (html) {
  const browser = await getBrowser()
  const page = await browser.newPage()
  try {
    await page.setContent(html, { waitUntil: 'load', timeout: 30000 })
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '8mm', bottom: '8mm', left: '8mm', right: '8mm' }
    })
    return Buffer.from(pdfBuffer)
  } finally {
    await page.close()
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

module.exports = { renderPdfFromHtml, sendPdfResponse, closeBrowserPool }
