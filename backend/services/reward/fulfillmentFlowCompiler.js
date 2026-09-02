const { findAction } = require('../../config/rewardFulfillmentCatalog')

const FLOW_VERSION = 2

function parseFlowJson (raw) {
  if (raw == null) return null
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw)
    } catch {
      return null
    }
  }
  return raw
}

function isLegacySteps (steps) {
  return Array.isArray(steps)
}

function isFlowDefinition (steps) {
  const flow = parseFlowJson(steps)
  if (!flow || typeof flow !== 'object' || Array.isArray(flow)) return false
  if (flow.version === FLOW_VERSION) return true
  return Boolean(flow.flowLogic && (Array.isArray(flow.steps) || Array.isArray(flow.branches)))
}

function defaultParamsForAction (entityKey, actionKey) {
  const action = findAction(entityKey, actionKey)
  if (!action) return {}
  const params = {}
  for (const field of action.params || []) {
    if (field.default !== undefined) params[field.key] = field.default
  }
  return params
}

function compileUiStep (uiStep) {
  if (!uiStep?.entity || !uiStep?.action) return null
  const params = uiStep.params || {}
  const key = `${uiStep.entity}.${uiStep.action}`

  switch (key) {
    case 'subscription.set_tier':
      return {
        type: 'SET_SUBSCRIPTION_TIER',
        tier: params.tier || 'PRO',
        durationDays: parseInt(params.durationDays, 10) || 30
      }
    case 'reward_order.mark_fulfilled':
      return {
        type: 'MARK_ORDER_FULFILLED',
        note: params.note || 'Auto-fulfilled by reward rule'
      }
    case 'email.send_message': {
      const bodyHtml = params.messageHtml || params.bodyHtml || ''
      const textOnly = String(bodyHtml).replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim()
      if (!textOnly) return null
      return {
        type: 'SEND_EMAIL',
        template: 'rewardFulfillmentMessage',
        subject: params.subject || 'Your reward from Kadr',
        bodyHtml
      }
    }
    case 'email.send_template':
      if (!params.template) return null
      return {
        type: 'SEND_EMAIL',
        template: params.template,
        durationDays: parseInt(params.durationDays, 10) || 30
      }
    case 'user.noop':
      return null
    default:
      return null
  }
}

/**
 * AND pipeline: run steps in order. Steps after an "OR" join start an alternative chain;
 * only the first compilable step in each OR-chain runs (alternatives, not cumulative).
 */
function compileAndPipeline (uiSteps) {
  if (!Array.isArray(uiSteps) || !uiSteps.length) return []

  const executable = []
  let orChain = []

  const flushOrChain = () => {
    for (const step of orChain) {
      const compiled = compileUiStep(step)
      if (compiled) {
        executable.push(compiled)
        break
      }
    }
    orChain = []
  }

  for (let i = 0; i < uiSteps.length; i++) {
    const step = uiSteps[i]
    const join = i === 0 ? null : (step.join || 'AND')

    if (join === 'OR') {
      orChain.push(step)
    } else {
      if (orChain.length) flushOrChain()
      const compiled = compileUiStep(step)
      if (compiled) executable.push(compiled)
    }
  }
  if (orChain.length) flushOrChain()

  return executable
}

/**
 * Flatten flow definition to executable legacy step array for runFulfillmentForOrder.
 */
function compileFlowToSteps (flowOrSteps) {
  const raw = parseFlowJson(flowOrSteps)
  if (isLegacySteps(raw)) return raw.filter((s) => s && s.type)
  if (!isFlowDefinition(raw)) return []

  const flow = raw

  if (flow.flowLogic === 'OR') {
    const idx = Math.max(0, parseInt(flow.activeBranchIndex, 10) || 0)
    const branch = (flow.branches || [])[idx]
    const steps = branch?.steps || []
    return compileAndPipeline(steps)
  }

  let steps = flow.steps || []
  if (!steps.length && flow.branches?.length) {
    const idx = Math.max(0, parseInt(flow.activeBranchIndex, 10) || 0)
    steps = flow.branches[idx]?.steps || flow.branches[0]?.steps || []
  }
  return compileAndPipeline(steps)
}

function legacyStepToUi (legacy) {
  if (!legacy?.type) return null
  switch (legacy.type) {
    case 'SET_SUBSCRIPTION_TIER':
      return {
        id: `step-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        entity: 'subscription',
        action: 'set_tier',
        join: 'AND',
        params: {
          tier: legacy.tier || 'PRO',
          durationDays: legacy.durationDays ?? 30
        }
      }
    case 'MARK_ORDER_FULFILLED':
      return {
        id: `step-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        entity: 'reward_order',
        action: 'mark_fulfilled',
        join: 'AND',
        params: { note: legacy.note || 'Auto-fulfilled by reward rule' }
      }
    case 'SEND_EMAIL':
      if (legacy.template === 'rewardFulfillmentMessage' || legacy.bodyHtml) {
        return {
          id: `step-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          entity: 'email',
          action: 'send_message',
          join: 'AND',
          params: {
            subject: legacy.subject || 'Your reward from Kadr',
            messageHtml: legacy.bodyHtml || ''
          }
        }
      }
      return {
        id: `step-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        entity: 'email',
        action: 'send_template',
        join: 'AND',
        params: {
          template: legacy.template || 'proActivatedFromReward',
          durationDays: legacy.durationDays ?? 30
        }
      }
    default:
      return null
  }
}

function migrateLegacyToFlow (legacySteps) {
  const steps = (legacySteps || []).map(legacyStepToUi).filter(Boolean)
  steps.forEach((s, i) => {
    s.join = i === 0 ? null : 'AND'
  })
  return {
    version: FLOW_VERSION,
    flowLogic: 'AND',
    activeBranchIndex: 0,
    branches: [{ id: 'branch-1', label: 'Path 1', logic: 'AND', steps: [...steps] }],
    steps
  }
}

function normalizeFlowInput (flow, legacySteps) {
  const parsed = parseFlowJson(flow)
  if (isFlowDefinition(parsed)) return parsed
  if (isLegacySteps(legacySteps)) return migrateLegacyToFlow(legacySteps)
  if (isLegacySteps(parsed)) return migrateLegacyToFlow(parsed)
  return {
    version: FLOW_VERSION,
    flowLogic: 'AND',
    activeBranchIndex: 0,
    branches: [{ id: 'branch-1', label: 'Path 1', logic: 'AND', steps: [] }],
    steps: []
  }
}

function summarizeFlow (flowOrSteps) {
  const compiled = compileFlowToSteps(flowOrSteps)
  if (!compiled.length) return 'No actions configured'
  const labels = {
    SET_SUBSCRIPTION_TIER: 'Grant Pro',
    MARK_ORDER_FULFILLED: 'Mark fulfilled',
    SEND_EMAIL: 'Send email'
  }
  return compiled.map((s) => labels[s.type] || s.type.replace(/_/g, ' ')).join(' · ')
}

module.exports = {
  FLOW_VERSION,
  parseFlowJson,
  isLegacySteps,
  isFlowDefinition,
  defaultParamsForAction,
  compileUiStep,
  compileFlowToSteps,
  compileAndPipeline,
  migrateLegacyToFlow,
  normalizeFlowInput,
  summarizeFlow
}
