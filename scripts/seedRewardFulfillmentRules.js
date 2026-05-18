/**
 * Seed default Pro subscription fulfillment rule (flow builder v2).
 * Run: node scripts/seedRewardFulfillmentRules.js
 */
require('dotenv').config()
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const DEFAULT_FLOW = {
  version: 2,
  flowLogic: 'AND',
  activeBranchIndex: 0,
  branches: [{ id: 'branch-default', label: 'Path 1', logic: 'AND', steps: [] }],
  steps: [
    {
      id: 'step-sub',
      entity: 'subscription',
      action: 'set_tier',
      join: null,
      params: { tier: 'PRO', durationDays: 90 }
    },
    {
      id: 'step-order',
      entity: 'reward_order',
      action: 'mark_fulfilled',
      join: 'AND',
      params: { note: 'Auto-fulfilled — Pro 90 days reward' }
    },
    {
      id: 'step-email',
      entity: 'email',
      action: 'send_message',
      join: 'AND',
      params: {
        subject: 'Your Kadr Pro subscription is active',
        messageHtml: '<p>Your <strong>Pro</strong> subscription is now active for <strong>90</strong> days. Enjoy premium mediator tools on Kadr.</p>'
      }
    }
  ]
}

async function main () {
  const name = 'Pro — 90 days (reward)'
  let rule = await prisma.reward_fulfillment_rules.findFirst({ where: { name } })
  if (!rule) {
    rule = await prisma.reward_fulfillment_rules.create({
      data: {
        name,
        description: 'Grants 90 days Pro, marks order fulfilled, sends confirmation email.',
        active: true,
        steps: DEFAULT_FLOW
      }
    })
    console.log('Created fulfillment rule:', rule.id)
  } else {
    await prisma.reward_fulfillment_rules.update({
      where: { id: rule.id },
      data: { steps: DEFAULT_FLOW, active: true }
    })
    console.log('Updated fulfillment rule:', rule.id)
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
