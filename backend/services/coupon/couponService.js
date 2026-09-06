const prisma = require('../../lib/prisma')
const { activatePro } = require('../subscription/subscriptionService')
const { normalizeReferralInput } = require('../../utils/referralCode')

/**
 * Coupon codes offered by the company to new mediator signups.
 *
 * A code entered at signup can resolve two ways:
 *   1. A company coupon (this `coupon_codes` table) — may grant premium days
 *      and has an optional redemption limit.
 *   2. A mediator's personal referral code (user.referral_code) — handled by
 *      the existing referral flow (referred_by_id + reward points on approval).
 *
 * Effects (quantity decrement, premium grant) are applied when the mediator is
 * APPROVED — mirroring how referral reward points are awarded — so unapproved
 * signups never consume a coupon slot or receive premium.
 */

function normalizeCode (raw) {
  return normalizeReferralInput(raw) // uppercase, trim, strip spaces
}

function toIntOrNull (value) {
  if (value === '' || value === null || value === undefined) return null
  const n = parseInt(value, 10)
  return Number.isFinite(n) ? n : null
}

/** A coupon still has room if it has no limit, or redeemed_count < usage_limit. */
function hasRemainingQuota (coupon) {
  if (!coupon) return false
  if (coupon.usage_limit === null || coupon.usage_limit === undefined) return true
  return coupon.redeemed_count < coupon.usage_limit
}

function remainingQuota (coupon) {
  if (coupon.usage_limit === null || coupon.usage_limit === undefined) return null
  return Math.max(0, coupon.usage_limit - coupon.redeemed_count)
}

function toAdminView (coupon) {
  return {
    id: coupon.id,
    code: coupon.code,
    title: coupon.title,
    description: coupon.description || '',
    premium_days: coupon.premium_days,
    usage_limit: coupon.usage_limit,
    redeemed_count: coupon.redeemed_count,
    remaining: remainingQuota(coupon),
    active: coupon.active,
    created_at: coupon.created_at
  }
}

// ---------------------------------------------------------------------------
// Admin CRUD
// ---------------------------------------------------------------------------

async function listCoupons () {
  const rows = await prisma.coupon_codes.findMany({ orderBy: { created_at: 'desc' } })
  return rows.map(toAdminView)
}

async function createCoupon ({ code, title, description, premiumDays, usageLimit, active = true }) {
  const normalized = normalizeCode(code)
  if (!normalized) {
    const err = new Error('Coupon code is required.')
    err.userMessage = err.message
    throw err
  }
  if (!String(title || '').trim()) {
    const err = new Error('Coupon title is required.')
    err.userMessage = err.message
    throw err
  }

  const existing = await prisma.coupon_codes.findUnique({ where: { code: normalized } })
  if (existing) {
    const err = new Error('A coupon with this code already exists.')
    err.userMessage = err.message
    throw err
  }

  const limit = toIntOrNull(usageLimit)
  const created = await prisma.coupon_codes.create({
    data: {
      code: normalized,
      title: String(title).trim(),
      description: description ? String(description).trim() : null,
      premium_days: Math.max(0, toIntOrNull(premiumDays) || 0),
      usage_limit: limit !== null ? Math.max(0, limit) : null,
      active: active !== false
    }
  })
  return toAdminView(created)
}

async function deleteCoupon (id) {
  await prisma.coupon_codes.deleteMany({ where: { id } })
  return true
}

// ---------------------------------------------------------------------------
// Signup lookup (public / unauthenticated)
// ---------------------------------------------------------------------------

/**
 * Resolve a code typed on the signup screen to a preview the UI can show.
 * Never throws for "not found"; returns a structured result the caller renders.
 *
 * @returns {Promise<
 *   | { found: false }
 *   | { found: true, type: 'coupon', valid: boolean, code, title, description, premiumDays, reason? }
 *   | { found: true, type: 'referral', valid: true, code, referrerName, referrerId }
 * >}
 */
async function lookupSignupCode (rawCode) {
  const code = normalizeCode(rawCode)
  if (!code) return { found: false }

  // 1) Company coupon takes priority.
  const coupon = await prisma.coupon_codes.findUnique({ where: { code } })
  if (coupon) {
    if (!coupon.active) {
      return { found: true, type: 'coupon', valid: false, code: coupon.code, title: coupon.title, description: coupon.description || '', premiumDays: coupon.premium_days, reason: 'inactive' }
    }
    if (!hasRemainingQuota(coupon)) {
      return { found: true, type: 'coupon', valid: false, code: coupon.code, title: coupon.title, description: coupon.description || '', premiumDays: coupon.premium_days, reason: 'exhausted' }
    }
    return {
      found: true,
      type: 'coupon',
      valid: true,
      code: coupon.code,
      title: coupon.title,
      description: coupon.description || '',
      premiumDays: coupon.premium_days
    }
  }

  // 2) Otherwise, try a mediator referral code.
  const referrer = await prisma.user.findFirst({
    where: {
      user_type: 'MEDIATOR',
      active: true,
      is_deleted: false,
      referral_code: code
    },
    select: { id: true, name: true }
  })
  if (referrer) {
    return { found: true, type: 'referral', valid: true, code, referrerName: referrer.name, referrerId: referrer.id }
  }

  return { found: false }
}

// ---------------------------------------------------------------------------
// Redemption on mediator approval
// ---------------------------------------------------------------------------

/**
 * Apply a company coupon's effects for a newly-approved mediator:
 *  - atomically decrement remaining quota (respecting usage_limit)
 *  - grant PRO for `premium_days` days (if > 0)
 *
 * Idempotent-ish: guarded by the caller only running this once per approval.
 * Referral codes are NOT handled here — the existing reward flow
 * (processReferralOnActivation) awards referral points separately.
 *
 * @param {import('@prisma/client').Prisma.TransactionClient} [tx]
 */
async function applyCouponOnApproval (mediatorId, rawCode, tx = null) {
  const code = normalizeCode(rawCode)
  if (!mediatorId || !code) return null
  const db = tx || prisma

  const coupon = await db.coupon_codes.findUnique({ where: { code } })
  if (!coupon || !coupon.active) return null

  // Only a company coupon is redeemed here. Referral codes won't match this table.
  const run = async (client) => {
    // Atomic, quota-safe decrement: increment redeemed_count only while under limit.
    if (coupon.usage_limit !== null && coupon.usage_limit !== undefined) {
      const res = await client.coupon_codes.updateMany({
        where: {
          id: coupon.id,
          redeemed_count: { lt: coupon.usage_limit }
        },
        data: { redeemed_count: { increment: 1 } }
      })
      // No slots left at redemption time — do not grant premium.
      if (res.count === 0) return { redeemed: false, reason: 'exhausted' }
    } else {
      await client.coupon_codes.update({
        where: { id: coupon.id },
        data: { redeemed_count: { increment: 1 } }
      })
    }

    if (coupon.premium_days > 0) {
      await activatePro({
        mediatorId,
        durationDays: coupon.premium_days,
        source: 'ADMIN_GRANT',
        paymentRef: `coupon:${coupon.code}`,
        tx: client
      })
    }
    return { redeemed: true, couponId: coupon.id, premiumDays: coupon.premium_days }
  }

  if (tx) return run(tx)
  return prisma.$transaction(run)
}

/**
 * Read the mediator's stored signup coupon code and redeem it (if it's a
 * company coupon). Safe to call inside or outside a transaction.
 *
 * @param {import('@prisma/client').Prisma.TransactionClient} [tx]
 */
async function redeemCouponForApprovedMediator (mediatorId, tx = null) {
  if (!mediatorId) return null
  const db = tx || prisma
  const user = await db.user.findUnique({
    where: { id: mediatorId },
    select: { signup_coupon_code: true }
  })
  const code = user?.signup_coupon_code
  if (!code) return null
  return applyCouponOnApproval(mediatorId, code, tx)
}

module.exports = {
  normalizeCode,
  hasRemainingQuota,
  listCoupons,
  createCoupon,
  deleteCoupon,
  lookupSignupCode,
  applyCouponOnApproval,
  redeemCouponForApprovedMediator
}
