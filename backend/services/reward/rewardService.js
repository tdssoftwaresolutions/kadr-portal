const prisma = require('../../lib/prisma.js')
const { ensureMediatorReferralCode } = require('../../utils/referralCode')

const REWARD_SETTING_DEFAULTS = [
  { key: 'reward_points_mediator_join', label: 'Reward points — mediator joins (approved)', value: '1000' },
  { key: 'reward_points_case_closed', label: 'Reward points — case closed', value: '2000' },
  { key: 'reward_points_blog', label: 'Reward points — blog published', value: '500' },
  { key: 'reward_points_video_reel', label: 'Reward points — video reel shared', value: '300' },
  { key: 'reward_points_blog_10_comments', label: 'Reward points — 10 comments on a blog', value: '200' },
  { key: 'reward_points_meeting_feedback', label: 'Reward points — meeting feedback submitted', value: '50' },
  { key: 'reward_points_referral', label: 'Reward points — successful mediator referral', value: '500' }
]

const REASON_LABELS = {
  mediator_join: 'Welcome bonus — account approved',
  case_closed: 'Case closed',
  blog_published: 'Blog published',
  video_reel_shared: 'Video reel shared',
  blog_10_comments: '10 comments on your blog',
  meeting_feedback: 'Meeting feedback submitted',
  referral_invite: 'Referred a new mediator',
  reward_redemption: 'Reward redemption',
  blog_published_reversal: 'Blog deleted — points reversed',
  blog_10_comments_reversal: 'Blog deleted — comment milestone reversed',
  video_reel_shared_reversal: 'Video reel deleted — points reversed'
}

const REVERSAL_REASON_CODES = {
  blog_published: 'blog_published_reversal',
  blog_10_comments: 'blog_10_comments_reversal',
  video_reel_shared: 'video_reel_shared_reversal'
}

const EARNING_GUIDE = [
  { reasonCode: 'mediator_join', title: 'Join KADR as a mediator', description: 'Earn points when your mediator account is approved.' },
  { reasonCode: 'case_closed', title: 'Close a case successfully', description: 'Earn points when a case you mediated is marked closed.' },
  { reasonCode: 'blog_published', title: 'Publish a blog post', description: 'Earn points when you publish an original blog on KADR. Editing an already-published blog does not earn again; deleting it reverses the points.' },
  { reasonCode: 'blog_10_comments', title: 'Get 10 comments on your blog', description: 'Earn a bonus when one of your published blogs receives at least 10 comments.' },
  { reasonCode: 'video_reel_shared', title: 'Share a video reel', description: 'Earn points when you add a new video reel. Updates do not earn again; deleting reverses the points.' },
  { reasonCode: 'meeting_feedback', title: 'Submit meeting feedback', description: 'Earn points when you complete feedback for a mediation session.' },
  { reasonCode: 'referral_invite', title: 'Refer another mediator', description: 'Earn points when someone you referred is approved as a mediator.' }
]

const REASON_TO_SETTING_KEY = {
  mediator_join: 'reward_points_mediator_join',
  case_closed: 'reward_points_case_closed',
  blog_published: 'reward_points_blog',
  video_reel_shared: 'reward_points_video_reel',
  blog_10_comments: 'reward_points_blog_10_comments',
  meeting_feedback: 'reward_points_meeting_feedback',
  referral_invite: 'reward_points_referral'
}

function toInt (value, fallback = 0) {
  const n = parseInt(value, 10)
  return Number.isFinite(n) ? n : fallback
}

async function ensureRewardSettings () {
  for (const row of REWARD_SETTING_DEFAULTS) {
    await prisma.admin_settings.upsert({
      where: { key: row.key },
      update: { label: row.label },
      create: row
    })
  }
}

async function getPointsForReason (reasonCode) {
  await ensureRewardSettings()
  const key = REASON_TO_SETTING_KEY[reasonCode]
  if (!key) return 0
  const row = await prisma.admin_settings.findUnique({ where: { key } })
  return toInt(row?.value, 0)
}

/**
 * Award points idempotently per (mediator, reason, reference_id).
 * @param {object} opts
 * @param {import('@prisma/client').Prisma.TransactionClient} [opts.tx]
 */
async function awardRewardPoints ({
  mediatorId,
  reasonCode,
  referenceId = null,
  description = null,
  tx = null
}) {
  if (!mediatorId || !reasonCode) return null
  const db = tx || prisma
  const points = await getPointsForReason(reasonCode)
  if (points <= 0) return null

  const ref = referenceId != null ? String(referenceId) : `global-${reasonCode}`
  const existing = await db.mediator_reward_transactions.findFirst({
    where: {
      mediator_id: mediatorId,
      reason_code: reasonCode,
      reference_id: ref
    }
  })
  if (existing) return existing

  const label = description || REASON_LABELS[reasonCode] || reasonCode

  const run = async (client) => {
    await client.user.update({
      where: { id: mediatorId },
      data: { reward_points_balance: { increment: points } }
    })
    return client.mediator_reward_transactions.create({
      data: {
        mediator_id: mediatorId,
        points,
        reason_code: reasonCode,
        description: label,
        reference_id: ref
      }
    })
  }

  if (tx) return run(tx)
  return prisma.$transaction(run)
}

/**
 * Reverse a prior award using the original transaction amount (not current admin settings).
 */
async function revokeRewardPointsForReference ({
  mediatorId,
  reasonCode,
  referenceId,
  tx = null
}) {
  if (!mediatorId || !reasonCode || referenceId == null) return null
  const db = tx || prisma
  const ref = String(referenceId)
  const reversalCode = REVERSAL_REASON_CODES[reasonCode] || `${reasonCode}_reversal`

  const award = await db.mediator_reward_transactions.findFirst({
    where: {
      mediator_id: mediatorId,
      reason_code: reasonCode,
      reference_id: ref
    }
  })
  if (!award || award.points <= 0) return null

  const existingReversal = await db.mediator_reward_transactions.findFirst({
    where: {
      mediator_id: mediatorId,
      reason_code: reversalCode,
      reference_id: ref
    }
  })
  if (existingReversal) return existingReversal

  const pointsToDeduct = award.points
  const label = REASON_LABELS[reversalCode] || `Reversed: ${reasonCode}`

  const run = async (client) => {
    const user = await client.user.findUnique({
      where: { id: mediatorId },
      select: { reward_points_balance: true }
    })
    const currentBalance = user?.reward_points_balance ?? 0
    const decrementBy = Math.min(pointsToDeduct, Math.max(0, currentBalance))

    if (decrementBy > 0) {
      await client.user.update({
        where: { id: mediatorId },
        data: { reward_points_balance: { decrement: decrementBy } }
      })
    }

    return client.mediator_reward_transactions.create({
      data: {
        mediator_id: mediatorId,
        points: -pointsToDeduct,
        reason_code: reversalCode,
        description: label,
        reference_id: ref
      }
    })
  }

  if (tx) return run(tx)
  return prisma.$transaction(run)
}

async function revokeContentRewards ({ mediatorId, referenceId, reasonCodes, tx = null }) {
  if (!mediatorId || !referenceId || !Array.isArray(reasonCodes)) return []
  const results = []
  for (const reasonCode of reasonCodes) {
    const row = await revokeRewardPointsForReference({
      mediatorId,
      reasonCode,
      referenceId,
      tx
    })
    if (row) results.push(row)
  }
  return results
}

async function listRewardEarningOptions () {
  await ensureRewardSettings()
  const options = []
  for (const row of EARNING_GUIDE) {
    const points = await getPointsForReason(row.reasonCode)
    if (points <= 0) continue
    options.push({
      reasonCode: row.reasonCode,
      title: row.title,
      description: row.description,
      points
    })
  }
  return options
}

async function listActiveCatalogForMediator (balance) {
  const items = await prisma.reward_catalog_items.findMany({
    where: { active: true },
    orderBy: [{ points_cost: 'asc' }, { sort_order: 'asc' }, { title: 'asc' }]
  })
  return items.map((item) => ({
    id: item.id,
    title: item.title,
    description: item.description || '',
    points_cost: item.points_cost,
    eligible: balance >= item.points_cost
  }))
}

async function listCatalogAdmin () {
  return prisma.reward_catalog_items.findMany({
    orderBy: [{ sort_order: 'asc' }, { created_at: 'desc' }]
  })
}

async function upsertCatalogItem ({
  id,
  title,
  description,
  points_cost,
  active,
  sort_order,
  fulfillment_type,
  fulfillment_rule_id
}) {
  const cost = toInt(points_cost, NaN)
  if (!title || !String(title).trim() || Number.isNaN(cost) || cost <= 0) {
    const { createError } = require('../../utils/errors')
    const errorCodes = require('../../utils/errors/errorCodes')
    throw createError(errorCodes.INVALID_REQUEST)
  }
  const data = {
    title: String(title).trim(),
    description: description != null ? String(description).trim() : null,
    points_cost: cost,
    active: active !== false,
    sort_order: toInt(sort_order, 0),
    fulfillment_type: fulfillment_type === 'AUTO' ? 'AUTO' : 'MANUAL',
    fulfillment_rule_id: fulfillment_rule_id || null
  }
  if (id) {
    return prisma.reward_catalog_items.update({ where: { id }, data })
  }
  return prisma.reward_catalog_items.create({ data })
}

async function deleteCatalogItem (id) {
  const pending = await prisma.reward_redemption_orders.count({
    where: { catalog_item_id: id, status: 'PENDING' }
  })
  if (pending > 0) {
    return prisma.reward_catalog_items.update({
      where: { id },
      data: { active: false }
    })
  }
  return prisma.reward_catalog_items.delete({ where: { id } })
}

async function redeemCatalogItem (mediatorId, catalogItemId) {
  const { createError } = require('../../utils/errors')
  const errorCodes = require('../../utils/errors/errorCodes')

  return prisma.$transaction(async (tx) => {
    const [user, item] = await Promise.all([
      tx.user.findUnique({
        where: { id: mediatorId },
        select: { id: true, reward_points_balance: true, user_type: true, is_deleted: true, active: true }
      }),
      tx.reward_catalog_items.findUnique({ where: { id: catalogItemId } })
    ])
    if (!user || user.user_type !== 'MEDIATOR' || !user.active || user.is_deleted) {
      throw createError(errorCodes.FORBIDDEN)
    }
    if (!item || !item.active) throw createError(errorCodes.NOT_FOUND)
    if (user.reward_points_balance < item.points_cost) {
      throw createError({
        errorCode: 'E311',
        message: 'You do not have enough points for this reward.'
      })
    }

    const order = await tx.reward_redemption_orders.create({
      data: {
        mediator_id: mediatorId,
        catalog_item_id: item.id,
        points_spent: item.points_cost,
        status: 'PENDING'
      }
    })

    await tx.user.update({
      where: { id: mediatorId },
      data: { reward_points_balance: { decrement: item.points_cost } }
    })

    await tx.mediator_reward_transactions.create({
      data: {
        mediator_id: mediatorId,
        points: -item.points_cost,
        reason_code: 'reward_redemption',
        description: `Redeemed: ${item.title}`,
        reference_id: order.id
      }
    })

    return order
  }).then(async (order) => {
    if (order) {
      const { runFulfillmentForOrder } = require('./rewardFulfillmentEngine')
      await runFulfillmentForOrder(order.id).catch((err) => {
        console.error('[reward] Auto-fulfillment failed for order', order.id, err)
      })
    }
    return order
  })
}

async function listRedemptionOrdersAdmin ({ status, page = 1, perPage = 20 }) {
  const skip = (Math.max(1, page) - 1) * perPage
  const where = status ? { status } : {}
  const [orders, total] = await Promise.all([
    prisma.reward_redemption_orders.findMany({
      where,
      orderBy: { created_at: 'desc' },
      skip,
      take: perPage,
      include: {
        catalog_item: { select: { id: true, title: true, description: true, points_cost: true } },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone_number: true,
            referral_code: true
          }
        }
      }
    }),
    prisma.reward_redemption_orders.count({ where })
  ])
  return { orders, total, page: Math.max(1, page), perPage }
}

async function fulfillRedemptionOrder (orderId, adminId, adminNotes) {
  const { createError } = require('../../utils/errors')
  const errorCodes = require('../../utils/errors/errorCodes')

  const order = await prisma.reward_redemption_orders.findUnique({ where: { id: orderId } })
  if (!order) throw createError(errorCodes.NOT_FOUND)
  if (order.status === 'FULFILLED') throw createError(errorCodes.INVALID_REQUEST)

  return prisma.reward_redemption_orders.update({
    where: { id: orderId },
    data: {
      status: 'FULFILLED',
      fulfilled_at: new Date(),
      fulfilled_by: adminId,
      admin_notes: adminNotes != null ? String(adminNotes).trim() : null
    },
    include: {
      catalog_item: true,
      user: { select: { id: true, name: true, email: true, phone_number: true } }
    }
  })
}

async function getMediatorRewardSummary (mediatorId, page = 1, perPage = 20) {
  const skip = (Math.max(1, page) - 1) * perPage
  await ensureMediatorReferralCode(prisma, mediatorId)
  const [user, transactions, total] = await Promise.all([
    prisma.user.findUnique({
      where: { id: mediatorId },
      select: { id: true, reward_points_balance: true, user_type: true, is_deleted: true, referral_code: true }
    }),
    prisma.mediator_reward_transactions.findMany({
      where: { mediator_id: mediatorId },
      orderBy: { created_at: 'desc' },
      skip,
      take: perPage
    }),
    prisma.mediator_reward_transactions.count({ where: { mediator_id: mediatorId } })
  ])
  const balance = user?.reward_points_balance ?? 0
  const catalog = await listActiveCatalogForMediator(balance)
  const earningOptions = await listRewardEarningOptions()

  return {
    balance,
    referralCode: user?.referral_code ?? null,
    catalog,
    earningOptions,
    transactions,
    total,
    page: Math.max(1, page),
    perPage
  }
}

async function processReferralOnActivation (activatedUserId, tx = null) {
  const db = tx || prisma
  const activated = await db.user.findUnique({
    where: { id: activatedUserId },
    select: { id: true, user_type: true, active: true, referred_by_id: true, is_deleted: true }
  })
  if (!activated || activated.user_type !== 'MEDIATOR' || !activated.active || activated.is_deleted) return null
  if (!activated.referred_by_id || activated.referred_by_id === activated.id) return null

  const referrer = await db.user.findUnique({
    where: { id: activated.referred_by_id },
    select: { id: true, user_type: true, active: true, is_deleted: true }
  })
  if (!referrer || referrer.user_type !== 'MEDIATOR' || !referrer.active || referrer.is_deleted) return null

  return awardRewardPoints({
    mediatorId: referrer.id,
    reasonCode: 'referral_invite',
    referenceId: activated.id,
    tx
  })
}

async function onMediatorApproved (mediatorId, tx = null) {
  const db = tx || prisma
  await ensureMediatorReferralCode(db, mediatorId)
  await awardRewardPoints({
    mediatorId,
    reasonCode: 'mediator_join',
    referenceId: mediatorId,
    tx
  })
  await processReferralOnActivation(mediatorId, tx)
  // Redeem a company coupon (quota decrement + premium grant) if the mediator
  // signed up with one. Referral codes won't match the coupon table, so this is
  // a no-op for referral signups (their reward is handled above).
  try {
    const { redeemCouponForApprovedMediator } = require('../coupon/couponService')
    await redeemCouponForApprovedMediator(mediatorId, tx)
  } catch (couponErr) {
    console.error('Coupon redemption on mediator approval:', couponErr)
  }
}

module.exports = {
  REWARD_SETTING_DEFAULTS,
  REASON_LABELS,
  EARNING_GUIDE,
  ensureRewardSettings,
  getPointsForReason,
  awardRewardPoints,
  revokeRewardPointsForReference,
  revokeContentRewards,
  listRewardEarningOptions,
  getMediatorRewardSummary,
  listActiveCatalogForMediator,
  listCatalogAdmin,
  upsertCatalogItem,
  deleteCatalogItem,
  redeemCatalogItem,
  listRedemptionOrdersAdmin,
  fulfillRedemptionOrder,
  processReferralOnActivation,
  onMediatorApproved
}
