const { app, BrowserWindow, shell, dialog } = require('electron')
const fs = require('fs')
const path = require('path')
const http = require('http')

const isDev = !app.isPackaged

function getAppRoot () {
  return app.getAppPath()
}

function getMacAppParentDir () {
  if (process.platform !== 'darwin' || !process.execPath.includes('.app/Contents/MacOS/')) {
    return null
  }
  const contentsDir = path.dirname(path.dirname(process.execPath))
  return path.dirname(contentsDir)
}

function getEnvSearchPaths () {
  if (isDev) {
    return [path.join(getAppRoot(), '.env')]
  }

  const paths = [
    path.join(app.getPath('userData'), '.env')
  ]

  const appParent = getMacAppParentDir()
  if (appParent) {
    paths.push(path.join(appParent, '.env'))
  }

  paths.push(
    path.join(process.resourcesPath, '.env'),
    path.join(getAppRoot(), '.env')
  )

  return paths
}

function loadEnv () {
  const dotenv = require('dotenv')

  for (const envPath of getEnvSearchPaths()) {
    if (!fs.existsSync(envPath)) continue
    const result = dotenv.config({ path: envPath })
    if (!result.error) {
      console.log('[electron] Loaded env from', envPath)
      return envPath
    }
  }

  console.warn('[electron] No .env file found.')
  return null
}

function configurePrismaEngine () {
  if (isDev) return

  const arch = process.arch === 'arm64' ? 'darwin-arm64' : 'darwin'
  const engineName = `libquery_engine-${arch}.dylib.node`
  const unpackedRoot = path.join(process.resourcesPath, 'app.asar.unpacked', 'node_modules')
  const candidates = [
    path.join(unpackedRoot, '.prisma', 'client', engineName),
    path.join(unpackedRoot, '@prisma', 'engines', engineName)
  ]

  for (const enginePath of candidates) {
    if (fs.existsSync(enginePath)) {
      process.env.PRISMA_QUERY_ENGINE_LIBRARY = enginePath
      console.log('[electron] Using Prisma engine at', enginePath)
      return
    }
  }

  console.warn('[electron] Prisma query engine not found in packaged app.')
}

function waitForHealth (port, attempts = 80) {
  return new Promise((resolve, reject) => {
    let tries = 0
    const tick = () => {
      tries += 1
      const req = http.get(`http://127.0.0.1:${port}/health`, (res) => {
        res.resume()
        if (res.statusCode === 200) return resolve()
        if (tries >= attempts) return reject(new Error('Health check failed'))
        setTimeout(tick, 250)
      })
      req.on('error', () => {
        if (tries >= attempts) return reject(new Error('API server did not start in time'))
        setTimeout(tick, 250)
      })
      req.setTimeout(2000, () => {
        req.destroy()
        if (tries >= attempts) return reject(new Error('Health check timed out'))
        setTimeout(tick, 250)
      })
    }
    tick()
  })
}

let mainWindow = null
let apiServer = null

function showStartupError (title, message) {
  console.error(`[electron] ${title}:`, message)
  dialog.showErrorBox(title, message)
}

async function startApiServer () {
  process.env.KADR_DESKTOP = '1'

  const preferredPort = Number(process.env.PORT) || 47821
  process.env.PORT = String(preferredPort)
  process.env.HOST = '127.0.0.1'

  if (!process.env.DATABASE_URL) {
    throw new Error(
      'DATABASE_URL is not configured.\n\n' +
      'Create a .env file next to Kadr Portal.app (e.g. /Applications/.env) ' +
      'or at ~/Library/Application Support/kadr.admin/.env\n\n' +
      'Use .env.desktop.example as a template.'
    )
  }

  configurePrismaEngine()

  const { startServer } = require('../lib/serverApp')
  const result = await startServer({
    port: preferredPort,
    host: '127.0.0.1',
    serveDesktopStatic: true,
    distPath: path.join(getAppRoot(), 'dist')
  })

  apiServer = result.server
  process.env.BASE_URL = `http://127.0.0.1:${result.port}`
  process.env.PORTAL_APP_URL = process.env.BASE_URL

  await waitForHealth(result.port)
  return result.port
}

function createWindow (loadUrl) {
  if (mainWindow) {
    mainWindow.loadURL(loadUrl)
    mainWindow.focus()
    return
  }

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 640,
    show: true,
    title: 'Kadr Portal',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url)
    }
    return { action: 'deny' }
  })

  mainWindow.webContents.on('will-navigate', (event, url) => {
    const parsed = new URL(url)
    const allowedHosts = ['127.0.0.1', 'localhost']
    if (!allowedHosts.includes(parsed.hostname)) {
      event.preventDefault()
      shell.openExternal(url)
    }
  })

  mainWindow.loadURL(loadUrl)

  if (isDev && process.env.ELECTRON_OPEN_DEVTOOLS === '1') {
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

function showLoadingWindow () {
  const html = encodeURIComponent(`
    <!doctype html>
    <html>
      <head><meta charset="utf-8"><title>Kadr Portal</title></head>
      <body style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#fafafa;color:#333;">
        <div style="text-align:center;">
          <h2 style="margin:0 0 8px;">Kadr Portal</h2>
          <p style="margin:0;">Starting…</p>
        </div>
      </body>
    </html>
  `)
  createWindow(`data:text/html,${html}`)
}

async function bootstrap () {
  loadEnv()

  const devUrl = process.env.ELECTRON_DEV_URL
  if (isDev && devUrl) {
    const apiPort = Number(process.env.PORT) || 3000
    await waitForHealth(apiPort)
    console.log(`[electron] Dev UI: ${devUrl} (API on port ${apiPort})`)
    createWindow(devUrl)
    return
  }

  showLoadingWindow()
  const port = await startApiServer()
  const appUrl = `http://127.0.0.1:${port}/admin/`
  console.log(`[electron] Loading ${appUrl}`)
  createWindow(appUrl)
}

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })

  app.whenReady().then(async () => {
    try {
      await bootstrap()
    } catch (err) {
      showStartupError('Kadr Portal failed to start', err.message || String(err))
      app.quit()
    }
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })

  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      try {
        await bootstrap()
      } catch (err) {
        showStartupError('Kadr Portal failed to start', err.message || String(err))
        app.quit()
      }
    }
  })

  app.on('before-quit', () => {
    if (apiServer) {
      apiServer.close()
      apiServer = null
    }
  })
}
