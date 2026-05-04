const express = require('express')
const cookieParser = require('cookie-parser')
require('dotenv').config()

const app = express()
const port = process.env.PORT || 3000

app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ limit: '10mb', extended: true }))
app.use(cookieParser())

// API only
app.use('/api', require('./routes/apiRoutes'))
app.get('/health', (req, res) => res.send('OK'))
app.use(require('./middleware/errorHandler'))

app.listen(port, () => {
  console.log(`API running on ${port}`)
})
