require('dotenv').config()
require('./services/notification/registerCodeTriggers')
const { startServer } = require('./lib/serverApp')

const port = Number(process.env.PORT) || 3000

startServer({ port }).catch((err) => {
  console.error('Failed to start server', err)
  process.exit(1)
})
