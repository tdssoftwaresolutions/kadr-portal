const { PAYMENT_GATEWAYS } = require('./paymentConstants')
const { getBaseUrl, getPortalUrl } = require('../../config/appUrls')

function getActiveGateway () {
  const gateway = String(process.env.PAYMENT_GATEWAY || 'payu').toLowerCase()
  if (!Object.values(PAYMENT_GATEWAYS).includes(gateway)) {
    throw new Error(`Invalid PAYMENT_GATEWAY: ${gateway}. Use payu, cashfree, or phonepe.`)
  }
  return gateway
}

function getPortalBaseUrl () {
  return getPortalUrl('http://localhost:8080')
}

function getApiBaseUrl () {
  return getBaseUrl('http://localhost:3000')
}

function getPayuConfig () {
  return {
    key: process.env.PAYU_MERCHANT_KEY || '',
    salt: process.env.PAYU_MERCHANT_SALT || '',
    env: process.env.PAYU_ENV === 'production' ? 'production' : 'test',
    paymentUrl: process.env.PAYU_ENV === 'production'
      ? 'https://secure.payu.in/_payment'
      : 'https://test.payu.in/_payment'
  }
}

function getCashfreeConfig () {
  const sandbox = process.env.CASHFREE_ENV !== 'production'
  return {
    clientId: process.env.CASHFREE_CLIENT_ID || '',
    clientSecret: process.env.CASHFREE_CLIENT_SECRET || '',
    env: sandbox ? 'sandbox' : 'production',
    apiBase: sandbox
      ? 'https://sandbox.cashfree.com/pg'
      : 'https://api.cashfree.com/pg',
    jsSdk: sandbox
      ? 'https://sdk.cashfree.com/js/v3/cashfree.js'
      : 'https://sdk.cashfree.com/js/v3/cashfree.js'
  }
}

function getPhonePeConfig () {
  const sandbox = process.env.PHONEPE_ENV !== 'production'
  return {
    merchantId: process.env.PHONEPE_MERCHANT_ID || '',
    saltKey: process.env.PHONEPE_SALT_KEY || '',
    saltIndex: process.env.PHONEPE_SALT_INDEX || '1',
    env: sandbox ? 'sandbox' : 'production',
    apiBase: sandbox
      ? 'https://api-preprod.phonepe.com/apis/pg-sandbox'
      : 'https://api.phonepe.com/apis/hermes'
  }
}

function getPublicPaymentConfig () {
  const gateway = getActiveGateway()
  const cfg = { gateway, mode: 'live' }
  if (gateway === PAYMENT_GATEWAYS.CASHFREE) {
    cfg.cashfreeEnv = getCashfreeConfig().env
    cfg.cashfreeJsSdk = getCashfreeConfig().jsSdk
  }
  return cfg
}

module.exports = {
  getActiveGateway,
  getPortalBaseUrl,
  getApiBaseUrl,
  getPayuConfig,
  getCashfreeConfig,
  getPhonePeConfig,
  getPublicPaymentConfig
}
