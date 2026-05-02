const express = require('express')
const path = require('path')
const cookieParser = require('cookie-parser')
require('dotenv').config()

const app = express()
const port = process.env.PORT || 3000

// ===== Middleware =====
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ limit: '10mb', extended: true }))
app.use(cookieParser())

// ===== 1. API =====
app.use('/api', require('./routes/apiRoutes'))

// ===== 2. ADMIN ASSETS (VERY IMPORTANT) =====
// These must come BEFORE /admin route
app.use('/img', express.static(path.join(__dirname, 'dist/img')))
app.use('/fonts', express.static(path.join(__dirname, 'dist/fonts')))
app.use('/js', express.static(path.join(__dirname, 'dist/js')))
app.use('/css', express.static(path.join(__dirname, 'dist/css')))

// ===== 3. ADMIN APP =====
const adminDist = path.join(__dirname, 'dist')

// Serve index for /admin
app.get('/admin', (req, res) => {
  res.sendFile(path.join(adminDist, 'index.html'))
})

// Serve Vue SPA routes
app.get('/admin/*', (req, res) => {
  res.sendFile(path.join(adminDist, 'index.html'))
})

// ===== 4. PUBLIC WEBSITE =====
const publicPath = path.join(__dirname, 'public/website')

// Serve static files (html, css, js, etc.)
app.use(express.static(publicPath))

// ===== 5. PUBLIC FALLBACK =====
app.get('*', (req, res, next) => {
  // DO NOT override admin or api
  if (req.path.startsWith('/admin') || req.path.startsWith('/api')) {
    return next()
  }

  res.sendFile(path.join(publicPath, 'index.html'))
})

// ===== Error Handler =====
const errorHandler = require('./middleware/errorHandler')
app.use(errorHandler)

// ===== Start Server =====
const server = app.listen(port, () => {
  console.log(`Server running on port ${port}`)
})

server.timeout = 60000
server.keepAliveTimeout = 60000
server.headersTimeout = 65000
