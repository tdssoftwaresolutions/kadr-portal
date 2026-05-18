const { PrismaClient } = require('@prisma/client')
const { activatePro, downgradeToFree } = require('../subscription/subscriptionService')
const helper = require('../../utils/helper')
const emailTemplates = require('../email/templates')
const {
  compileFlowToSteps,
  normalizeFlowInput,
  parseFlowJson,
  summarizeFlow
} = require('./fulfillmentFlowCompiler')

const prisma = new PrismaClient()

const ALLOWED_EMAIL_TEMPLATES = new Set([
  'proActivatedFromReward',
  'rewardFulfillmentMessage',
  'mediatorLeftAutoReassign',
  'mediatorManualAssignmentRequired'
])

async function runStep (step, context) {
  const type = step?.type
  if (type === 'SET_SUBSCRIPTION_TIER') {
    const tier = String(step.tier || 'PRO').toUpperCase()
    if (tier === 'FREE') {
      await downgradeToFree(context.mediatorId)
      return
    }
    const days = parseInt(step.durationDays, 10) || 30
    await activatePro({
      mediatorId: context.mediatorId,
      durationDays: days,
      source: 'REWARD',
      rewardOrderId: context.orderId
    })
    return
  }
  if (type === 'MARK_ORDER_FULFILLED') {
    await prisma.reward_redemption_orders.update({
      where: { id: context.orderId },
      data: {
        status: 'FULFILLED',
        fulfilled_at: new Date(),
        fulfilled_by: step.fulfilledBy || null,
        admin_notes: step.note || 'Auto-fulfilled by reward rule'
      }
    })
    return
  }
  if (type === 'SEND_EMAIL' && step.template) {
    const templateKey = String(step.template).trim()
    if (!ALLOWED_EMAIL_TEMPLATES.has(templateKey) || !emailTemplates[templateKey]) return

    const user = await prisma.user.findUnique({
      where: { id: context.mediatorId },
      select: { email: true, name: true }
    })
    if (!user?.email) return

    const durationDays = parseInt(step.durationDays, 10) || 30
    const variables = {
      recipientName: user.name,
      durationDays,
      departedName: user.name,
      subject: step.subject || '',
      bodyHtml: step.bodyHtml || '',
      caseId: step.caseId || ''
    }
    await helper.sendTemplatedEmail(templateKey, user.email, variables)
  }
}

async function runFulfillmentForOrder (orderId) {
  const order = await prisma.reward_redemption_orders.findUnique({
    where: { id: orderId },
    include: {
      catalog_item: {
        include: { fulfillment_rule: true }
      },
      user: { select: { id: true, email: true, name: true } }
    }
  })
  if (!order || order.status === 'FULFILLED') return order
  const item = order.catalog_item
  if (!item || item.fulfillment_type !== 'AUTO' || !item.fulfillment_rule?.active) {
    return order
  }

  const rawSteps = parseFlowJson(item.fulfillment_rule.steps)
  const executable = compileFlowToSteps(rawSteps)
  if (!executable.length) {
    console.warn(`[fulfillment] Rule "${item.fulfillment_rule.name}" has no executable steps for order ${orderId}`)
    return order
  }
  const context = { orderId, mediatorId: order.mediator_id }

  for (const step of executable) {
    await runStep(step, context)
  }

  const updated = await prisma.reward_redemption_orders.findUnique({ where: { id: orderId } })
  if (updated?.status === 'PENDING') {
    await prisma.reward_redemption_orders.update({
      where: { id: orderId },
      data: { status: 'FULFILLED', fulfilled_at: new Date(), admin_notes: 'Auto-fulfilled' }
    })
  }

  return prisma.reward_redemption_orders.findUnique({
    where: { id: orderId },
    include: { catalog_item: true }
  })
}

async function listFulfillmentRules () {
  const rules = await prisma.reward_fulfillment_rules.findMany({
    orderBy: { created_at: 'desc' }
  })
  return rules.map((r) => {
    const parsed = parseFlowJson(r.steps)
    return {
      ...r,
      summary: summarizeFlow(parsed),
      flow: normalizeFlowInput(parsed, Array.isArray(parsed) ? parsed : [])
    }
  })
}

async function getFulfillmentRule (id) {
  const rule = await prisma.reward_fulfillment_rules.findUnique({ where: { id } })
  if (!rule) return null
  const parsed = parseFlowJson(rule.steps)
  return {
    ...rule,
    flow: normalizeFlowInput(parsed, Array.isArray(parsed) ? parsed : [])
  }
}

async function upsertFulfillmentRule ({ id, name, description, active, flow, steps: legacySteps }) {
  const { createError } = require('../../utils/errors')
  const errorCodes = require('../../utils/errors/errorCodes')

  if (!name || !String(name).trim()) throw createError(errorCodes.INVALID_REQUEST)

  const normalizedFlow = normalizeFlowInput(flow, legacySteps)
  const executable = compileFlowToSteps(normalizedFlow)
  if (!executable.length) {
    throw createError(errorCodes.FULFILLMENT_RULE_EMPTY)
  }

  const data = {
    name: String(name).trim(),
    description: description != null ? String(description).trim() : null,
    active: active !== false,
    steps: normalizedFlow
  }
  if (id) return prisma.reward_fulfillment_rules.update({ where: { id }, data })
  return prisma.reward_fulfillment_rules.create({ data })
}

async function deleteFulfillmentRule (id) {
  const { createError } = require('../../utils/errors')
  const errorCodes = require('../../utils/errors/errorCodes')

  const linked = await prisma.reward_catalog_items.count({
    where: { fulfillment_rule_id: id }
  })
  if (linked > 0) {
    throw createError(errorCodes.FULFILLMENT_RULE_IN_USE)
  }
  return prisma.reward_fulfillment_rules.delete({ where: { id } })
}

module.exports = {
  runFulfillmentForOrder,
  listFulfillmentRules,
  getFulfillmentRule,
  upsertFulfillmentRule,
  deleteFulfillmentRule,
  compileFlowToSteps,
  summarizeFlow
}
