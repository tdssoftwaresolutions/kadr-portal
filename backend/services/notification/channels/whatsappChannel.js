const axios = require('axios')
const { renderTemplate } = require('../templateRenderer')

/**
 * WhatsApp channel — Meta WhatsApp Cloud API.
 *
 * Two message shapes are supported:
 *  1. Free-form TEXT (type: "text") — only deliverable inside the 24h customer
 *     service window (i.e. after the user has messaged the business number).
 *  2. TEMPLATE (type: "template") — business-initiated messages (OTP,
 *     notifications) that work outside the 24h window. Requires a template that
 *     is approved in the Meta WhatsApp Manager.
 *
 * Credentials/config precedence: channel config (admin) first, then env.
 *   - Phone number ID:  config.phoneNumberId  || WHATSAPP_PHONE_NUMBER_ID
 *   - Access token:     WHATSAPP_ACCESS_TOKEN  (secret — env only)
 *   - Graph version:    config.apiVersion      || WHATSAPP_API_VERSION || 'v25.0'
 *   - Country code:      config.countryCode     || '91'
 */

const GRAPH_BASE = 'https://graph.facebook.com'

/**
 * Normalize a phone number to bare international digits (no '+', no spaces),
 * which is the format the Cloud API expects for the `to` field. Prefixes the
 * default country code when the number does not already start with it.
 * @param {string} phone
 * @param {string} countryCode default '91'
 * @returns {string|null} e.g. '918510988836', or null when input has no digits
 */
function normalizePhone (phone, countryCode = '91') {
  const digits = String(phone || '').replace(/\D/g, '')
  if (!digits) return null
  if (digits.startsWith(countryCode)) return digits
  // Strip a leading 0 (common local trunk prefix) before adding the country code.
  const local = digits.replace(/^0+/, '')
  return `${countryCode}${local}`
}

function resolveConfig (channelSettings) {
  const config = channelSettings?.config || {}
  const phoneNumberId = config.phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN
  const apiVersion = config.apiVersion || process.env.WHATSAPP_API_VERSION || 'v25.0'
  const countryCode = config.countryCode || '91'
  return { phoneNumberId, accessToken, apiVersion, countryCode }
}

function assertConfigured ({ phoneNumberId, accessToken }) {
  if (!phoneNumberId || !accessToken) {
    throw new Error(
      'WhatsApp is not configured (set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID, ' +
      'or the phoneNumberId in the WhatsApp channel config)'
    )
  }
}

/**
 * Build the `template` object for a Cloud API template message.
 * Body parameters are ordered positional {{1}}, {{2}}, … values.
 * @param {object} tpl
 * @param {string} tpl.name           approved template name
 * @param {string} [tpl.languageCode] BCP47/Meta locale, e.g. 'en_US'
 * @param {string[]} [tpl.bodyParams] ordered positional body parameters
 * @param {object} [tpl.button]       optional OTP button: { type:'url'|'copy_code', index, params:[] }
 */
function buildTemplateObject (tpl) {
  const components = []
  if (Array.isArray(tpl.bodyParams) && tpl.bodyParams.length) {
    components.push({
      type: 'body',
      parameters: tpl.bodyParams.map((text) => ({ type: 'text', text: String(text) }))
    })
  }
  if (tpl.button && tpl.button.type) {
    // Authentication templates deliver the OTP via a button (copy_code / url).
    components.push({
      type: 'button',
      sub_type: tpl.button.type === 'copy_code' ? 'copy_code' : 'url',
      index: String(tpl.button.index != null ? tpl.button.index : 0),
      parameters: (tpl.button.params || []).map((text) => ({
        type: tpl.button.type === 'copy_code' ? 'coupon_code' : 'text',
        [tpl.button.type === 'copy_code' ? 'coupon_code' : 'text']: String(text)
      }))
    })
  }
  return {
    name: tpl.name,
    language: { code: tpl.languageCode || 'en_US' },
    ...(components.length ? { components } : {})
  }
}

/**
 * Low-level Cloud API POST. Exposed so a reusable "send raw WhatsApp" helper can
 * call it directly without going through the notification template pipeline.
 * @param {object} opts
 * @param {string} opts.to        phone (any format; normalized here)
 * @param {object} opts.payload   the message-type payload, one of:
 *                                 { type:'text', text:{ body } } or
 *                                 { type:'template', template:{...} }
 * @param {object} [opts.channelSettings]
 */
async function sendRaw ({ to, payload, channelSettings }) {
  const { phoneNumberId, accessToken, apiVersion, countryCode } = resolveConfig(channelSettings)
  assertConfigured({ phoneNumberId, accessToken })

  const toNumber = normalizePhone(to, countryCode)
  if (!toNumber) throw new Error('Invalid phone number for WhatsApp')

  const body = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: toNumber,
    ...payload
  }

  const response = await axios.post(
    `${GRAPH_BASE}/${apiVersion}/${phoneNumberId}/messages`,
    body,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      timeout: 15000
    }
  )
  return response.data
}

/**
 * Channel entry point used by notificationService.send().
 *
 * Decides between a template message and a free-form text message:
 *  - If `data.waTemplate` is provided (explicit template send, e.g. OTP) OR the
 *    channel/template config declares a template name, a TEMPLATE message is
 *    sent using positional body parameters.
 *  - Otherwise the rendered `template.body_text` is sent as a free-form TEXT
 *    message (only delivered inside the 24h window).
 *
 * @param {object} opts
 * @param {string} opts.to
 * @param {object} opts.template   notification_templates row (body_text, variables)
 * @param {object} opts.data       merged template variables (+ optional waTemplate)
 * @param {object} opts.channelSettings
 */
async function send ({ to, template, data, channelSettings }) {
  const waTemplate = data && data.waTemplate ? data.waTemplate : null

  if (waTemplate && waTemplate.name) {
    // Explicit template send (business-initiated, e.g. OTP).
    return sendRaw({
      to,
      channelSettings,
      payload: { type: 'template', template: buildTemplateObject(waTemplate) }
    })
  }

  // Free-form text send (24h window). Body comes from the stored template.
  const bodyText = renderTemplate(template.body_text || template.body_html || '', data)
  if (!bodyText) throw new Error('WhatsApp template body is empty')

  return sendRaw({
    to,
    channelSettings,
    payload: { type: 'text', text: { preview_url: false, body: bodyText } }
  })
}

module.exports = { send, sendRaw, normalizePhone, buildTemplateObject }
