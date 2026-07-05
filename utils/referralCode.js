/**
 * Human-readable mediator referral codes
 * — 3 letters from the first name + 3-digit suffix (unique per mediator).
 */

function nameToPrefix (name) {
  const firstWord = String(name || '').trim().split(/\s+/)[0] || ''
  const letters = firstWord.replace(/[^a-zA-Z]/g, '').toUpperCase()
  if (letters.length >= 3) return letters.slice(0, 3)
  return (letters + 'XXX').slice(0, 3)
}

function suffixFromUserId (userId, offset = 0) {
  const hex = String(userId || '').replace(/-/g, '')
  const n = parseInt(hex.slice(0, 8), 16) || 0
  return String(((n + offset) % 900) + 100)
}

function buildCandidate (name, userId, offset = 0) {
  return `${nameToPrefix(name)}${suffixFromUserId(userId, offset)}`
}

function normalizeReferralInput (code) {
  return String(code || '').trim().toUpperCase().replace(/\s+/g, '')
}

/**
 * @param {import('@prisma/client').PrismaClient | import('@prisma/client').Prisma.TransactionClient} prisma
 */
async function generateUniqueReferralCode (prisma, { name, userId }) {
  for (let attempt = 0; attempt < 50; attempt++) {
    const candidate = buildCandidate(name, userId, attempt)
    const existing = await prisma.user.findFirst({
      where: { referral_code: candidate },
      select: { id: true }
    })
    if (!existing || existing.id === userId) return candidate
  }
  return `${nameToPrefix(name)}${String(userId).replace(/-/g, '').slice(0, 4).toUpperCase()}`
}

/**
 * @param {import('@prisma/client').PrismaClient | import('@prisma/client').Prisma.TransactionClient} prisma
 */
async function ensureMediatorReferralCode (prisma, userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, user_type: true, referral_code: true }
  })
  if (!user || user.user_type !== 'MEDIATOR') return null
  if (user.referral_code) return user.referral_code

  const referral_code = await generateUniqueReferralCode(prisma, {
    name: user.name,
    userId: user.id
  })
  await prisma.user.update({
    where: { id: userId },
    data: { referral_code }
  })
  return referral_code
}

/**
 * Resolve signup referral input to a referrer mediator id.
 * @param {import('@prisma/client').PrismaClient} prisma
 */
async function resolveReferrerMediatorId (prisma, rawCode) {
  const code = normalizeReferralInput(rawCode)
  if (!code) return null

  const isUuid = /^[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$/i.test(code)

  const referrer = await prisma.user.findFirst({
    where: {
      user_type: 'MEDIATOR',
      active: true,
      is_deleted: false,
      OR: [
        { referral_code: code },
        ...(isUuid ? [{ id: code }] : [])
      ]
    },
    select: { id: true }
  })
  return referrer?.id ?? null
}

module.exports = {
  nameToPrefix,
  normalizeReferralInput,
  generateUniqueReferralCode,
  ensureMediatorReferralCode,
  resolveReferrerMediatorId
}
