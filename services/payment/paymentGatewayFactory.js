const { getActiveGateway } = require('./paymentConfig')
const payuAdapter = require('./adapters/payuAdapter')
const cashfreeAdapter = require('./adapters/cashfreeAdapter')
const phonepeAdapter = require('./adapters/phonepeAdapter')

const ADAPTERS = {
  payu: payuAdapter,
  cashfree: cashfreeAdapter,
  phonepe: phonepeAdapter
}

function getPaymentGateway (gatewayName) {
  const name = (gatewayName || getActiveGateway()).toLowerCase()
  const adapter = ADAPTERS[name]
  if (!adapter) {
    throw new Error(`Unsupported payment gateway: ${name}`)
  }
  return adapter
}

module.exports = {
  getPaymentGateway,
  ADAPTERS
}
