const crypto = require('crypto')
const { getPhonePeConfig, getPortalBaseUrl, getApiBaseUrl } = require('../paymentConfig')

function sha256 (input) {
  return crypto.createHash('sha256').update(input).digest('hex')
}

function buildChecksum (base64Payload, path, saltKey, saltIndex) {
  return `${sha256(base64Payload + path + saltKey)}###${saltIndex}`
}

module.exports = {
  name: 'phonepe',

  async createCheckout ({ order, user }) {
    const cfg = getPhonePeConfig()
    if (!cfg.merchantId || !cfg.saltKey) {
      throw new Error('PhonePe credentials missing. Set PHONEPE_MERCHANT_ID and PHONEPE_SALT_KEY.')
    }

    const amountPaise = Math.round(Number(order.amount) * 100)
    const redirectUrl = `${getPortalBaseUrl()}/app/payment/return?gateway=phonepe&order_id=${encodeURIComponent(order.order_id)}`
    const payload = {
      merchantId: cfg.merchantId,
      merchantTransactionId: order.order_id,
      merchantUserId: user.id,
      amount: amountPaise,
      redirectUrl,
      redirectMode: 'REDIRECT',
      callbackUrl: `${getApiBaseUrl()}/api/payment/webhook/phonepe`,
      mobileNumber: user.phone_number || '9999999999',
      paymentInstrument: { type: 'PAY_PAGE' }
    }
    const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64')
    const path = '/pg/v1/pay'
    const checksum = buildChecksum(base64Payload, path, cfg.saltKey, cfg.saltIndex)
    const res = await fetch(`${cfg.apiBase}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-VERIFY': checksum,
        Accept: 'application/json'
      },
      body: JSON.stringify({ request: base64Payload })
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok || !data.success) {
      throw new Error(data?.message || 'PhonePe payment initiation failed')
    }
    const instrument = data.data?.instrumentResponse
    return {
      mode: 'redirect',
      redirectUrl: instrument?.redirectInfo?.url,
      phonepeTransactionId: data.data?.merchantTransactionId || order.order_id
    }
  },

  async verifyStatus ({ orderId }) {
    const cfg = getPhonePeConfig()
    const path = `/pg/v1/status/${cfg.merchantId}/${orderId}`
    const checksum = `${sha256(path + cfg.saltKey)}###${cfg.saltIndex}`
    const res = await fetch(`${cfg.apiBase}${path}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-VERIFY': checksum,
        'X-MERCHANT-ID': cfg.merchantId
      }
    })
    const data = await res.json().catch(() => ({}))
    const code = data?.code || data?.data?.state
    const success = String(code).includes('PAYMENT_SUCCESS') || data?.data?.state === 'COMPLETED'
    return {
      success,
      orderId,
      gatewayPaymentId: data?.data?.transactionId || orderId,
      raw: data
    }
  },

  verifyWebhook (body) {
    const success = body?.success === true && body?.code === 'PAYMENT_SUCCESS'
    return {
      success,
      orderId: body?.data?.merchantTransactionId,
      gatewayPaymentId: body?.data?.transactionId,
      raw: body
    }
  }
}
