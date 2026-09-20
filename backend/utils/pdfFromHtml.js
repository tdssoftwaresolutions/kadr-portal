const puppeteer = require('puppeteer')

let browserPromise = null

async function getBrowser () {
  // The cached browser may have crashed or been killed (e.g. OOM) since it
  // was launched — reusing it throws ConnectionClosedError on every call
  // until the process restarts. Verify it's still alive before reusing it.
  if (browserPromise) {
    const browser = await browserPromise.catch(() => null)
    if (browser && browser.isConnected()) return browser
    browserPromise = null
  }

  const launchOptions = {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  }
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    launchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH
  }
  // If launch fails, don't cache the rejection — the next call should retry
  // rather than fail forever until the process is restarted.
  const launchPromise = puppeteer.launch(launchOptions).catch((error) => {
    browserPromise = null
    throw error
  })
  browserPromise = launchPromise
  return launchPromise
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

async function renderPdfFromHtml (html, retryOnDisconnect = true) {
  const browser = await getBrowser()
  let page
  try {
    page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'load', timeout: 30000 })
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '8mm', bottom: '8mm', left: '8mm', right: '8mm' }
    })
    return Buffer.from(pdfBuffer)
  } catch (error) {
    // The browser died mid-request (crash/OOM) after getBrowser() handed it
    // out as healthy — force a fresh launch and retry once, so this request
    // self-heals instead of making the user click PDF again.
    if (retryOnDisconnect && !browser.isConnected()) {
      browserPromise = null
      return renderPdfFromHtml(html, false)
    }
    throw error
  } finally {
    if (page) await page.close().catch(() => {})
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
