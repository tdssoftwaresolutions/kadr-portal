function newStepId () {
  return `step-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

export function defaultSimpleRule () {
  return {
    grantPro: true,
    proDays: 30,
    markFulfilled: true,
    sendEmail: true,
    emailSubject: 'Your reward from Kadr',
    emailMessage: '<p>We have activated your <strong>Pro</strong> package. Enjoy premium tools on Kadr.</p>'
  }
}

function getFlowSteps (flow) {
  if (!flow || typeof flow !== 'object') return []
  if (flow.flowLogic === 'OR') {
    const idx = Math.max(0, parseInt(flow.activeBranchIndex, 10) || 0)
    return flow.branches?.[idx]?.steps || flow.branches?.[0]?.steps || []
  }
  return flow.steps || []
}

export function flowToSimple (flow) {
  const simple = defaultSimpleRule()
  simple.grantPro = false
  simple.markFulfilled = false
  simple.sendEmail = false
  simple.emailMessage = ''
  simple.emailSubject = 'Your reward from Kadr'

  const steps = getFlowSteps(flow)
  for (const step of steps) {
    const key = `${step.entity}.${step.action}`
    const p = step.params || {}
    if (key === 'subscription.set_tier' && String(p.tier || 'PRO').toUpperCase() === 'PRO') {
      simple.grantPro = true
      simple.proDays = parseInt(p.durationDays, 10) || 30
    }
    if (key === 'reward_order.mark_fulfilled') {
      simple.markFulfilled = true
    }
    if (key === 'email.send_message') {
      simple.sendEmail = true
      simple.emailSubject = p.subject || simple.emailSubject
      simple.emailMessage = p.messageHtml || p.bodyHtml || ''
    }
    if (key === 'email.send_template') {
      simple.sendEmail = true
      const days = parseInt(p.durationDays, 10) || 30
      if (p.template === 'proActivatedFromReward') {
        simple.emailMessage = `<p>Your <strong>Pro</strong> subscription is now active for <strong>${days}</strong> days. Enjoy premium mediator tools on Kadr.</p>`
      } else {
        simple.emailMessage = '<p>Thank you for redeeming your reward on Kadr.</p>'
      }
    }
  }

  if (!simple.grantPro && !simple.markFulfilled && !simple.sendEmail) {
    return defaultSimpleRule()
  }
  return simple
}

function hasEmailContent (html) {
  if (!html) return false
  const text = String(html).replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim()
  return text.length > 0
}

export function simpleToFlow (simple) {
  const steps = []
  let isFirst = true

  const pushStep = (partial) => {
    steps.push({
      id: newStepId(),
      join: isFirst ? null : 'AND',
      ...partial
    })
    isFirst = false
  }

  if (simple.grantPro) {
    pushStep({
      entity: 'subscription',
      action: 'set_tier',
      params: {
        tier: 'PRO',
        durationDays: Math.max(1, parseInt(simple.proDays, 10) || 30)
      }
    })
  }

  if (simple.markFulfilled) {
    pushStep({
      entity: 'reward_order',
      action: 'mark_fulfilled',
      params: { note: 'Auto-fulfilled by reward' }
    })
  }

  if (simple.sendEmail && hasEmailContent(simple.emailMessage)) {
    pushStep({
      entity: 'email',
      action: 'send_message',
      params: {
        subject: String(simple.emailSubject || 'Your reward from Kadr').trim(),
        messageHtml: simple.emailMessage
      }
    })
  }

  return {
    version: 2,
    flowLogic: 'AND',
    activeBranchIndex: 0,
    branches: [{ id: `branch-${Date.now()}`, label: 'Default', logic: 'AND', steps: [...steps] }],
    steps
  }
}

export function simpleRuleSummary (simple) {
  const parts = []
  if (simple.grantPro) parts.push(`Pro ${simple.proDays || 30} days`)
  if (simple.markFulfilled) parts.push('Mark fulfilled')
  if (simple.sendEmail && hasEmailContent(simple.emailMessage)) parts.push('Send email')
  return parts.length ? parts.join(' · ') : 'No actions'
}

export function validateSimpleRule (simple) {
  if (!simple.grantPro && !simple.markFulfilled && !(simple.sendEmail && hasEmailContent(simple.emailMessage))) {
    return 'Turn on at least one action: Pro subscription, mark fulfilled, or email message.'
  }
  if (simple.grantPro && (!simple.proDays || parseInt(simple.proDays, 10) < 1)) {
    return 'Enter how many days of Pro to grant (at least 1).'
  }
  if (simple.sendEmail && !hasEmailContent(simple.emailMessage)) {
    return 'Write the email message, or turn off “Send email”.'
  }
  return null
}
