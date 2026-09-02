const axios = require('axios')
const qs = require('qs')
const { renderTemplate } = require('../templateRenderer')

function normalizePhone (phone, countryCode = '91') {
  const digits = String(phone || '').replace(/\D/g, '')
  if (!digits) return null
  if (digits.startsWith(countryCode)) return `+${digits}`
  return `+${countryCode}${digits}`
}

async function send ({ to, template, data, channelSettings }) {
  const body = renderTemplate(template.body_text || template.body_html || '', data)
  if (!body) throw new Error('SMS template body is empty')

  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const from = process.env.TWILIO_SENDER_NUMBER
  if (!accountSid || !authToken || !from) {
    throw new Error('Twilio SMS is not configured (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_SENDER_NUMBER)')
  }

  const cc = channelSettings?.config?.countryCode || '91'
  const toNumber = normalizePhone(to, cc)
  if (!toNumber) throw new Error('Invalid phone number for SMS')

  const payload = qs.stringify({ To: toNumber, From: from, Body: body })
  const response = await axios.post(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    payload,
    {
      auth: { username: accountSid, password: authToken },
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    }
  )
  return response.data
}

module.exports = { send, normalizePhone }
