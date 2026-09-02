const crypto = require('crypto')
const { getPayuConfig, getApiBaseUrl } = require('../paymentConfig')

function sha512 (input) {
  return crypto.createHash('sha512').update(input).digest('hex')
}

function buildPayuHash ({ key, txnId, amount, productInfo, firstName, email, udf1, udf2, udf3, udf4, udf5, salt }) {
  const hashString = `${key}|${txnId}|${amount}|${productInfo}|${firstName}|${email}|${udf1 || ''}|${udf2 || ''}|${udf3 || ''}|${udf4 || ''}|${udf5 || ''}||||||${salt}`
  return sha512(hashString)
}

function verifyPayuResponse (body) {
  const cfg = getPayuConfig()
  const {
    status, email, firstname, productinfo, amount, txnid, key,
    udf1, udf2, udf3, udf4, udf5, hash
  } = body
  const reverse = `${cfg.salt}|${status}||||||${udf5 || ''}|${udf4 || ''}|${udf3 || ''}|${udf2 || ''}|${udf1 || ''}|${email}|${firstname}|${productinfo}|${amount}|${txnid}|${key}`
  const expected = sha512(reverse)
  return expected === hash && String(status).toLowerCase() === 'success'
}

module.exports = {
  name: 'payu',

  async createCheckout ({ order, user }) {
    const cfg = getPayuConfig()
    if (!cfg.key || !cfg.salt) {
      throw new Error('PayU credentials missing. Set PAYU_MERCHANT_KEY and PAYU_MERCHANT_SALT.')
    }

    const amount = Number(order.amount).toFixed(2)
    const productInfo = order.metadata?.productInfo || 'Kadr Portal Payment'
    const firstName = (user.name || 'Customer').split(' ')[0]
    const phone = user.phone_number || '9999999999'
    const surl = `${getApiBaseUrl()}/api/payment/return/payu`
    const furl = `${getApiBaseUrl()}/api/payment/return/payu`

    const hash = buildPayuHash({
      key: cfg.key,
      txnId: order.order_id,
      amount,
      productInfo,
      firstName,
      email: user.email,
      udf1: order.purpose,
      udf2: order.case_id || '',
      udf3: order.user_id,
      udf4: '',
      udf5: '',
      salt: cfg.salt
    })

    return {
      mode: 'form',
      action: cfg.paymentUrl,
      fields: {
        key: cfg.key,
        txnid: order.order_id,
        amount,
        productinfo: productInfo,
        firstname: firstName,
        email: user.email,
        phone,
        surl,
        furl,
        udf1: order.purpose,
        udf2: order.case_id || '',
        udf3: order.user_id,
        hash
      }
    }
  },

  verifyCallback (payload) {
    const ok = verifyPayuResponse(payload)
    return {
      success: ok,
      orderId: payload.txnid,
      gatewayPaymentId: payload.mihpayid || payload.txnid,
      raw: payload
    }
  }
}
