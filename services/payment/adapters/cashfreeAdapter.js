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
    const success = status === 'PAID'
    return {
      success,
      orderId: data.order_id,
      gatewayPaymentId: data.cf_order_id || data.order_id,
      raw: data
    }
  },

  verifyWebhook (body) {
    const status = String(body?.data?.order?.order_status || body?.order_status || '').toUpperCase()
    const orderId = body?.data?.order?.order_id || body?.order_id
    return {
      success: status === 'PAID',
      orderId,
      gatewayPaymentId: body?.data?.payment?.cf_payment_id || body?.cf_payment_id,
      raw: body
    }
  }
}
