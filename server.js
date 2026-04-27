const express = require('express')
const path = require('path')
const fs = require('fs')
const app = express()
const port = process.env.PORT || 3000
const cookieParser = require('cookie-parser')
const errorHandler = require('./middleware/errorHandler')
const bodyParser = require('body-parser')
require('dotenv').config()

app.use(bodyParser.json({ limit: '10mb' }))
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }))

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())

// 1. API
app.use('/api', require('./routes/apiRoutes'))
app.use(errorHandler)

// 2. Static assets for admin (handle /img, /fonts, /js, /css at root for admin app)
app.use('/img', express.static(path.join(__dirname, 'dist', 'img')))
app.use('/fonts', express.static(path.join(__dirname, 'dist', 'fonts')))
app.use('/js', express.static(path.join(__dirname, 'dist', 'js')))
app.use('/css', express.static(path.join(__dirname, 'dist', 'css')))

// 3. ADMIN - serve files if exist, otherwise Vue Router fallback
app.use('/admin', (req, res, next) => {
  // Get the path after /admin
  const requestPath = req.url.split('?')[0] // Remove query params
  const filePath = path.join(__dirname, 'dist', requestPath)

  // Check if it's a real file
  try {
    const stats = fs.statSync(filePath)
    if (stats.isFile()) {
      return res.sendFile(filePath)
    }
  } catch (e) {
    // File doesn't exist, continue to Vue Router
  }
  // Not a real file, serve index.html for Vue Router
  res.sendFile(path.join(__dirname, 'dist', 'index.html'))
})

// 5. PUBLIC WEBSITE (scoped to root)
app.use('/', express.static(path.join(__dirname, 'public/website')))

// 6. Optional fallback for main site
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/website', 'index.html'))
})

// Start the server
const server = app.listen(port, () => {
  console.log(`Server running on port ${port}`)
})

server.timeout = 60000 // 60,000 ms = 60 seconds
server.keepAliveTimeout = 60000 // Keep-alive timeout for connections
server.headersTimeout = 65000 // Headers timeout should be slightly higher
