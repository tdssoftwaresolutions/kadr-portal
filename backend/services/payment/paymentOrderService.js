const { v4: uuidv4 } = require('uuid')
const prisma = require('../../lib/prisma')
const { createError } = require('../../utils/errors')
const errorCodes = require('../../utils/errors/errorCodes')
const { getActiveGateway } = require('./paymentConfig')
const { getPaymentGateway } = require('./paymentGatewayFactory')
const {
  PAYMENT_PURPOSES,
  PAYMENT_STATUS,
  PURPOSE_AMOUNTS_INR
} = require('./paymentConstants')
const { getProMonthlyPriceInr } = require('../subscription/subscriptionService')
const { fulfillPaymentOrder } = require('./paymentFulfillmentService')
const { alertPaymentFailure } = require('../alerting/criticalAlertService')
const analytics = require('../../utils/analytics')

const dataCrypto = require('../../utils/crypto')

function generateOrderId () {
  return `KADR-${Date.now()}-${uuidv4().slice(0, 8).toUpperCase()}`
}

// Raw gateway payloads can carry payment-instrument metadata, so we encrypt
// them at rest. They are write-only today; use this helper if a read path is
// ever added. Stored as an encrypted JSON string in the gateway_response
// Json? column.
function encryptGatewayResponse (payload) {
  if (payload === null || payload === undefined) return payload
  return dataCrypto.encryptJson(payload)
}

function decryptGatewayResponse (stored) {
  return dataCrypto.decryptJson(stored)
}

async function resolveAmount (purpose, amountOverride) {
  if (purpose === PAYMENT_PURPOSES.MEDIATOR_PRO) {
    return amountOverride != null ? Number(amountOverride) : await getProMonthlyPriceInr()
  }
  if (amountOverride != null) return Number(amountOverride)
  const fixed = PURPOSE_AMOUNTS_INR[purpose]
  if (!fixed) throw createError(errorCodes.INVALID_REQUEST, { message: 'Unknown payment purpose' })
  return fixed
}

async function createPaymentOrder ({ userId, purpose, caseId, amountOverride, metadata = {} }) {
  const gateway = getActiveGateway()
  const amount = await resolveAmount(purpose, amountOverride)
  const orderId = generateOrderId()

  const order = await prisma.payment_orders.create({
    data: {
      order_id: orderId,
      gateway,
      purpose,
      amount,
      currency: 'INR',
      status: PAYMENT_STATUS.PENDING,
      user_id: userId,
      case_id: caseId || null,
      metadata
    }
  })

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, phone_number: true, user_type: true }
  })
  if (!user) throw createError(errorCodes.NOT_FOUND)

  const adapter = getPaymentGateway(gateway)
  const checkout = await adapter.createCheckout({ order, user })

  if (checkout.cashfreeOrderId || checkout.phonepeTransactionId) {
    await prisma.payment_orders.update({
      where: { id: order.id },
      data: { gateway_order_id: checkout.cashfreeOrderId || checkout.phonepeTransactionId || orderId }
    })
  }

  return { order, checkout, gateway }
}

async function getOrderByOrderId (orderId) {
  return prisma.payment_orders.findUnique({ where: { order_id: orderId } })
}

async function markOrderSuccess (order, { gatewayPaymentId, gatewayResponse }) {
  if (order.status === PAYMENT_STATUS.SUCCESS) {
    return order
  }
  const updated = await prisma.payment_orders.update({
    where: { id: order.id },
    data: {
      status: PAYMENT_STATUS.SUCCESS,
      gateway_payment_id: gatewayPaymentId || order.gateway_payment_id,
      gateway_response: gatewayResponse ? encryptGatewayResponse(gatewayResponse) : order.gateway_response,
      fulfilled_at: order.fulfilled_at || new Date()
    }
  })
  await fulfillPaymentOrder(updated)
  return updated
}

async function markOrderFailed (order, gatewayResponse) {
  const updated = await prisma.payment_orders.update({
    where: { id: order.id },
    data: {
      status: PAYMENT_STATUS.FAILED,
      gateway_response: encryptGatewayResponse(gatewayResponse)
    }
  })

  // Central failure hook — covers web, mobile, return-url and webhook paths.
  // No req in this path; payer identity comes from the order.
  analytics.trackPaymentFailed({
    payerUserId: order.user_id,
    orderId: order.order_id,
    amount: order.amount,
    currency: order.currency,
    gateway: order.gateway,
    purpose: order.purpose,
    caseId: order.case_id,
    reason: 'gateway_verification_failed'
  })

  return updated
}

async function verifyAndCompleteOrder (orderId, verificationPayload = {}) {
  const order = await getOrderByOrderId(orderId)
  if (!order) throw createError(errorCodes.NOT_FOUND, { message: 'Payment order not found' })
  if (order.status === PAYMENT_STATUS.SUCCESS) {
    return { order, alreadyCompleted: true }
  }

  const adapter = getPaymentGateway(order.gateway)
  let result

  if (order.gateway === 'payu') {
    result = adapter.verifyCallback(verificationPayload)
  } else if (order.gateway === 'cashfree') {
    result = verificationPayload?.webhook
      ? adapter.verifyWebhook({
        webhook: verificationPayload.webhook,
        rawBody: verificationPayload.rawBody,
        signature: verificationPayload.signature,
        timestamp: verificationPayload.timestamp
      })
      : await adapter.verifyOrder({ orderId: order.order_id })
  } else if (order.gateway === 'phonepe') {
    result = verificationPayload?.webhook
      ? adapter.verifyWebhook(verificationPayload)
      : await adapter.verifyStatus({ orderId: order.order_id })
  }

  // Gateway says payment is still in-flight (e.g. UPI collect awaiting approval).
  // Leave the DB record as PENDING — do not mark it failed. The webhook or a
  // later poll will complete it.
  if (result?.pending) {
    return { order, pending: true }
  }

  if (!result?.success) {
    await markOrderFailed(order, result?.raw || verificationPayload)
    alertPaymentFailure({
      orderId: order.order_id,
      gateway: order.gateway,
      error: new Error('Payment verification failed'),
      userId: order.user_id
    })
    throw createError(errorCodes.INVALID_REQUEST, { message: 'Payment verification failed' })
  }

  const updated = await markOrderSuccess(order, {
    gatewayPaymentId: result.gatewayPaymentId,
    gatewayResponse: result.raw
  })
  return { order: updated, alreadyCompleted: false }
}

module.exports = {
  generateOrderId,
  createPaymentOrder,
  getOrderByOrderId,
  markOrderSuccess,
  markOrderFailed,
  verifyAndCompleteOrder,
  decryptGatewayResponse
}
