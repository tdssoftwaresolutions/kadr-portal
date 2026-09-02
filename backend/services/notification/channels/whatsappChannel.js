const axios = require('axios')
const qs = require('qs')
const { renderTemplate } = require('../templateRenderer')
const { normalizePhone } = require('./smsChannel')

async function send ({ to, template, data, channelSettings }) {
  const body = renderTemplate(template.body_text || template.body_html || '', data)
  if (!body) throw new Error('WhatsApp template body is empty')

  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const from =
    process.env.TWILIO_WHATSAPP_FROM ||
    (process.env.TWILIO_WHATSAPP_NUMBER ? `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}` : null)

  if (!accountSid || !authToken || !from) {
    throw new Error('Twilio WhatsApp is not configured (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM)')
  }

  const cc = channelSettings?.config?.countryCode || '91'
  const toDigits = normalizePhone(to, cc)
  if (!toDigits) throw new Error('Invalid phone number for WhatsApp')

  const toWa = toDigits.startsWith('whatsapp:') ? toDigits : `whatsapp:${toDigits}`
  const payload = qs.stringify({ To: toWa, From: from, Body: body })

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

module.exports = { send }
