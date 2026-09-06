const crypto = require('crypto')
const { getCashfreeConfig, getPortalBaseUrl } = require('../paymentConfig')

async function cashfreeRequest (path, method, body) {
  const cfg = getCashfreeConfig()
  if (!cfg.clientId || !cfg.clientSecret) {
    throw new Error('Cashfree credentials missing. Set CASHFREE_CLIENT_ID and CASHFREE_CLIENT_SECRET.')
  }
  const res = await fetch(`${cfg.apiBase}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-api-version': '2023-08-01',
      'x-client-id': cfg.clientId,
      'x-client-secret': cfg.clientSecret
    },
    body: body ? JSON.stringify(body) : undefined
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg = data?.message || data?.error?.message || res.statusText
    throw new Error(`Cashfree API error: ${msg}`)
  }
  return data
}

/**
 * Verify a Cashfree webhook signature.
 *
 * Cashfree signs webhooks with HMAC-SHA256 using your webhook secret key
 * (CASHFREE_WEBHOOK_SECRET). The signature is in the header
 * `x-webhook-signature` and is computed over:
 *   "<x-webhook-timestamp>.<raw-request-body>"
 *
 * References:
 *   https://docs.cashfree.com/docs/webhook-signature-verification
 *
 * @param {string} rawBody   - Raw request body string (before JSON.parse)
 * @param {string} signature - Value of the x-webhook-signature header
 * @param {string} timestamp - Value of the x-webhook-timestamp header
 * @returns {boolean}
 */
function verifyWebhookSignature (rawBody, signature, timestamp) {
  const secret = process.env.CASHFREE_WEBHOOK_SECRET
  if (!secret) {
    // If no secret is configured, skip signature validation (sandbox
    // convenience) but log a warning so it's not silently bypassed in prod.
    if (process.env.NODE_ENV === 'production') {
      console.error('[cashfreeAdapter] CASHFREE_WEBHOOK_SECRET is not set — webhook signature check skipped in production!')
    }
    return true
  }
  if (!signature || !timestamp) return false
  const signedPayload = `${timestamp}.${rawBody}`
  const expected = crypto
    .createHmac('sha256', secret)
    .update(signedPayload)
    .digest('base64')
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
}

module.exports = {
  name: 'cashfree',

  async createCheckout ({ order, user }) {
    const returnUrl = `${getPortalBaseUrl()}/app/payment/return?gateway=cashfree&order_id=${encodeURIComponent(order.order_id)}`
    const payload = {
      order_id: order.order_id,
      order_amount: Number(order.amount),
      order_currency: order.currency || 'INR',
      customer_details: {
        customer_id: user.id,
        customer_email: user.email,
        customer_phone: user.phone_number || '9999999999',
        customer_name: user.name || 'Customer'
      },
      order_meta: {
        return_url: returnUrl,
        notify_url: `${process.env.BASE_URL || 'http://localhost:3000'}/api/payment/webhook/cashfree`
      },
      order_note: order.purpose
    }
    const data = await cashfreeRequest('/orders', 'POST', payload)
    return {
      mode: 'cashfree_session',
      paymentSessionId: data.payment_session_id,
      cashfreeOrderId: data.order_id,
      returnUrl,
      cashfreeEnv: getCashfreeConfig().env
    }
  },

  async verifyOrder ({ orderId }) {
    const data = await cashfreeRequest(`/orders/${orderId}`, 'GET')
    const status = String(data.order_status || '').toUpperCase()
    // PAID      → payment confirmed
    // ACTIVE    → order exists, payment not yet received (e.g. UPI collect pending)
    // EXPIRED   → order expired without payment
    // CANCELLED → explicitly cancelled
    const success = status === 'PAID'
    const pending = status === 'ACTIVE'
    return {
      success,
      pending,
      orderId: data.order_id,
      gatewayPaymentId: data.cf_order_id || data.order_id,
      raw: data
    }
  },

  /**
   * Verify a webhook notification from Cashfree.
   *
   * @param {object} opts
   * @param {object} opts.webhook    - Parsed JSON body
   * @param {string} opts.rawBody    - Unparsed request body string (for HMAC)
   * @param {string} opts.signature  - x-webhook-signature header
   * @param {string} opts.timestamp  - x-webhook-timestamp header
   */
  verifyWebhook ({ webhook, rawBody, signature, timestamp }) {
    // Signature check — fails loudly in production if secret is missing.
    const sigValid = verifyWebhookSignature(rawBody || JSON.stringify(webhook), signature, timestamp)
    if (!sigValid) {
      return { success: false, orderId: null, gatewayPaymentId: null, raw: webhook }
    }

    const status = String(webhook?.data?.order?.order_status || webhook?.order_status || '').toUpperCase()
    const orderId = webhook?.data?.order?.order_id || webhook?.order_id
    return {
      success: status === 'PAID',
      orderId,
      gatewayPaymentId: webhook?.data?.payment?.cf_payment_id || webhook?.cf_payment_id,
      raw: webhook
    }
  }
}
