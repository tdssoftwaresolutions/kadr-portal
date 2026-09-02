const express = require('express')
const authMiddleware = require('../../middleware/authMiddleware')
const { addConnection } = require('../../services/sse/sseManager')

const router = express.Router()

/**
 * SSE endpoint for real-time updates.
 * Client connects with: new EventSource('/api/sse/events?token=<jwt>', { withCredentials: true })
 * The token query param is used because EventSource doesn't support custom headers.
 */
router.get('/sse/events', (req, res, next) => {
  // Support token in query param for EventSource (which can't set headers)
  if (req.query.token && !req.headers.authorization) {
    req.headers.authorization = `Bearer ${req.query.token}`
  }
  next()
}, authMiddleware, (req, res) => {
  const userId = req.user?.id
  if (!userId) {
    return res.status(401).json({ success: false, error: 'Unauthorized' })
  }

  // SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no' // Disable Nginx buffering
  })

  // Send initial connection confirmation
  res.write(`event: connected\ndata: ${JSON.stringify({ userId, timestamp: Date.now() })}\n\n`)

  // Keep-alive ping every 30 seconds
  const keepAliveInterval = setInterval(() => {
    try {
      res.write(': keepalive\n\n')
    } catch (err) {
      clearInterval(keepAliveInterval)
    }
  }, 30000)

  // Register this connection
  addConnection(userId, res)

  // Cleanup on close
  req.on('close', () => {
    clearInterval(keepAliveInterval)
  })
})

module.exports = router
