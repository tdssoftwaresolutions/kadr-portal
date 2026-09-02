const nodemailer = require('nodemailer')
const emailConfig = require('../../../config/emailConfig')

let cachedTransporter

const getTransporter = () => {
  if (cachedTransporter) return cachedTransporter
  cachedTransporter = nodemailer.createTransport({
    host: process.env.EMAIL_SMTP_HOST,
    port: Number(process.env.EMAIL_SMTP_PORT),
    secure: String(process.env.EMAIL_SMTP_SECURE || 'true') === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  })
  return cachedTransporter
}

const send = async ({ to, subject, html, attachments }) => {
  const transporter = getTransporter()
  return transporter.sendMail({
    from: emailConfig.from,
    to,
    subject,
    html,
    attachments: attachments || []
  })
}

module.exports = {
  send
}
