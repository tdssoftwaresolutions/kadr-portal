const { PrismaClient } = require('@prisma/client')
const {
  computeProExpiresAt,
  startOfTodayIst,
  isProActiveAt,
  formatSubscriptionExpiryDate
} = require('../../utils/subscriptionDates')

const prisma = new PrismaClient()

const PRO_DURATION_DAYS = 30

async function getProMonthlyPriceInr () {
  const row = await prisma.admin_settings.findUnique({
    where: { key: 'premium_pro_monthly_price_inr' }
  })
  const n = parseInt(row?.value, 10)
  return Number.isFinite(n) && n > 0 ? n : 1000
}

function isProActive (user) {
  if (!user || user.subscription_tier !== 'PRO') return false
  return isProActiveAt(user.subscription_expires_at)
}

async function getEffectiveTier (mediatorId) {
  const user = await prisma.user.findUnique({
    where: { id: mediatorId },
    select: { subscription_tier: true, subscription_expires_at: true }
  })
  if (!user) return 'FREE'
  return isProActive(user) ? 'PRO' : 'FREE'
}

async function syncUserSubscriptionFields (mediatorId, tier, expiresAt, tx = null) {
  const db = tx || prisma
  await db.user.update({
    where: { id: mediatorId },
    data: {
      subscription_tier: tier,
      subscription_expires_at: expiresAt
    }
  })
}

async function activatePro ({
  mediatorId,
  durationDays = PRO_DURATION_DAYS,
  source,
  amountInr = null,
  paymentRef = null,
  rewardOrderId = null,
  tx = null
}) {
  const db = tx || prisma
  const user = await db.user.findUnique({
    where: { id: mediatorId },
    select: { subscription_tier: true, subscription_expires_at: true }
  })
  if (!user) return null

  const now = new Date()
  const days = Math.max(1, parseInt(durationDays, 10) || PRO_DURATION_DAYS)
  const baseDate = (isProActive(user) && user.subscription_expires_at)
    ? new Date(user.subscription_expires_at)
    : now
  const expiresAt = computeProExpiresAt(baseDate, days)

  const run = async (client) => {
    await client.mediator_subscriptions.create({
      data: {
        mediator_id: mediatorId,
        tier: 'PRO',
        source,
        starts_at: now,
        expires_at: expiresAt,
        amount_inr: amountInr,
        payment_ref: paymentRef,
        reward_order_id: rewardOrderId
      }
    })
    await syncUserSubscriptionFields(mediatorId, 'PRO', expiresAt, client)
    return { tier: 'PRO', expiresAt }
  }

  if (tx) return run(tx)
  return prisma.$transaction(run)
}

async function downgradeToFree (mediatorId, tx = null) {
  const db = tx || prisma
  await syncUserSubscriptionFields(mediatorId, 'FREE', null, db)
  return { tier: 'FREE', expiresAt: null }
}

async function getSubscriptionStatus (mediatorId) {
  const [user, priceInr] = await Promise.all([
    prisma.user.findUnique({
      where: { id: mediatorId },
      select: {
        subscription_tier: true,
        subscription_expires_at: true,
        reward_points_balance: true
      }
    }),
    getProMonthlyPriceInr()
  ])
  const tier = isProActive(user) ? 'PRO' : 'FREE'
  const expiresAt = user?.subscription_expires_at || null
  return {
    tier,
    expiresAt,
    expiresAtLabel: expiresAt ? formatSubscriptionExpiryDate(expiresAt) : null,
    monthlyPriceInr: priceInr,
    rewardPointsBalance: user?.reward_points_balance ?? 0
  }
}

async function expireDueSubscriptions () {
  const cutoff = startOfTodayIst()
  const expired = await prisma.user.findMany({
    where: {
      user_type: 'MEDIATOR',
      subscription_tier: 'PRO',
      subscription_expires_at: { lt: cutoff }
    },
    select: { id: true }
  })
  for (const row of expired) {
    await downgradeToFree(row.id)
  }
  return expired.length
}

async function recordFakeProPayment ({ mediatorId, paymentId, amount, currency }) {
  return prisma.$transaction(async (tx) => {
    const result = await activatePro({
      mediatorId,
      durationDays: PRO_DURATION_DAYS,
      source: 'PAYMENT',
      amountInr: amount,
      paymentRef: paymentId,
      tx
    })
    return { ...result, paymentId, amount, currency: currency || 'INR' }
  })
}

module.exports = {
  PRO_DURATION_DAYS,
  getProMonthlyPriceInr,
  isProActive,
  getEffectiveTier,
  activatePro,
  downgradeToFree,
  getSubscriptionStatus,
  expireDueSubscriptions,
  recordFakeProPayment
}
