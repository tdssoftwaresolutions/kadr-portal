const { randomUUID } = require('crypto')

function requestLogger (req, res, next) {
  const start = Date.now()
  const requestId = req.headers['x-request-id'] || randomUUID()
  req.requestId = requestId
  res.setHeader('X-Request-Id', requestId)

  res.on('finish', () => {
    const duration = Date.now() - start
    if (req.path.startsWith('/health')) return
    console.log(JSON.stringify({
      level: 'info',
      requestId,
      method: req.method,
      path: req.originalUrl || req.path,
      status: res.statusCode,
      durationMs: duration,
      userId: req.user?.id || null
    }))
  })
  next()
}

module.exports = requestLogger
