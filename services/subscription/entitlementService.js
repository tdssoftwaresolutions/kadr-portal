const { PrismaClient } = require('@prisma/client')
const { getEffectiveTier } = require('./subscriptionService')
const { createError } = require('../../utils/errors')
const errorCodes = require('../../utils/errors/errorCodes')

const prisma = new PrismaClient()

const DEFAULT_FEATURES = [
  { feature_key: 'court_case_tracker', label: 'Court case tracker', description: 'Track eCourts cases by CNR', included_in_pro: true, sort_order: 10 },
  { feature_key: 'personal_calendar', label: 'Personal client calendar', description: 'Personal meetings with video links', included_in_pro: true, sort_order: 20 },
  { feature_key: 'enhanced_invoices', label: 'Enhanced invoices', description: 'Private invoices with GST and PDF', included_in_pro: true, sort_order: 30 }
]

async function ensurePremiumFeatureCatalog () {
  for (const row of DEFAULT_FEATURES) {
    await prisma.premium_feature_catalog.upsert({
      where: { feature_key: row.feature_key },
      update: { label: row.label, description: row.description },
      create: { ...row, active: true }
    })
  }
}

async function hasFeature (mediatorId, featureKey) {
  await ensurePremiumFeatureCatalog()
  const tier = await getEffectiveTier(mediatorId)
  if (tier !== 'PRO') return false
  const feat = await prisma.premium_feature_catalog.findUnique({
    where: { feature_key: featureKey }
  })
  return Boolean(feat?.active && feat?.included_in_pro)
}

async function assertFeature (mediatorId, featureKey) {
  const ok = await hasFeature(mediatorId, featureKey)
  if (!ok) {
    throw createError(errorCodes.PREMIUM_REQUIRED)
  }
}

async function listFeaturesForMediator (mediatorId) {
  await ensurePremiumFeatureCatalog()
  const tier = await getEffectiveTier(mediatorId)
  const rows = await prisma.premium_feature_catalog.findMany({
    where: { active: true },
    orderBy: [{ sort_order: 'asc' }, { label: 'asc' }]
  })
  return rows.map((r) => ({
    featureKey: r.feature_key,
    label: r.label,
    description: r.description || '',
    includedInPro: r.included_in_pro,
    unlocked: tier === 'PRO' && r.included_in_pro
  }))
}

async function listFeaturesAdmin () {
  await ensurePremiumFeatureCatalog()
  return prisma.premium_feature_catalog.findMany({
    orderBy: [{ sort_order: 'asc' }, { feature_key: 'asc' }]
  })
}

async function updateFeatureAdmin ({ id, included_in_pro, active, label, description, sort_order }) {
  const data = {}
  if (typeof included_in_pro === 'boolean') data.included_in_pro = included_in_pro
  if (typeof active === 'boolean') data.active = active
  if (label != null) data.label = String(label).trim()
  if (description != null) data.description = String(description).trim()
  if (sort_order != null) data.sort_order = parseInt(sort_order, 10) || 0
  return prisma.premium_feature_catalog.update({ where: { id }, data })
}

module.exports = {
  ensurePremiumFeatureCatalog,
  hasFeature,
  assertFeature,
  listFeaturesForMediator,
  listFeaturesAdmin,
  updateFeatureAdmin
}
