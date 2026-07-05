/**
 * Admin-facing catalog for reward fulfillment flow builder.
 * Extend entities/actions here when new tables or fields are supported.
 */
const EMAIL_TEMPLATES = [
  { key: 'proActivatedFromReward', label: 'Pro activated from reward', entity: 'email' },
  { key: 'mediatorLeftAutoReassign', label: 'Mediator left — cases reassigned (admin)', entity: 'email' },
  { key: 'mediatorManualAssignmentRequired', label: 'Manual mediator assignment required', entity: 'email' }
]

const ENTITIES = [
  {
    key: 'user',
    label: 'User',
    description: 'Mediator user account fields',
    icon: 'ri-user-line',
    actions: [
      {
        key: 'noop',
        label: 'No action (placeholder)',
        description: 'Reserved for future user-field updates',
        params: []
      }
    ]
  },
  {
    key: 'subscription',
    label: 'Subscription',
    description: 'Pro tier and expiry on user account',
    icon: 'ri-vip-crown-line',
    actions: [
      {
        key: 'set_tier',
        label: 'Set subscription tier',
        description: 'Upgrade or extend Pro subscription',
        params: [
          {
            key: 'tier',
            label: 'Tier',
            type: 'select',
            required: true,
            options: [
              { value: 'PRO', text: 'Pro' },
              { value: 'FREE', text: 'Free' }
            ],
            default: 'PRO'
          },
          {
            key: 'durationDays',
            label: 'Extend expiry by (days)',
            type: 'number',
            required: true,
            min: 1,
            max: 3650,
            default: 30,
            hint: 'Only applies when tier is Pro. Extends from today or current expiry.'
          }
        ]
      }
    ]
  },
  {
    key: 'reward_order',
    label: 'Reward order',
    description: 'Redemption order record',
    icon: 'ri-gift-line',
    actions: [
      {
        key: 'mark_fulfilled',
        label: 'Mark order as fulfilled',
        description: 'Closes the redemption order',
        params: [
          {
            key: 'note',
            label: 'Admin note (optional)',
            type: 'text',
            required: false,
            default: 'Auto-fulfilled by reward rule'
          }
        ]
      }
    ]
  },
  {
    key: 'email',
    label: 'Email',
    description: 'Send notification email to mediator',
    icon: 'ri-mail-send-line',
    actions: [
      {
        key: 'send_message',
        label: 'Send email message',
        description: 'Custom message; greeting and footer are added automatically',
        params: [
          {
            key: 'subject',
            label: 'Email subject',
            type: 'text',
            required: true,
            default: 'Your reward from Kadr'
          },
          {
            key: 'messageHtml',
            label: 'Message',
            type: 'richtext',
            required: true,
            hint: 'Main body only — header, greeting, and footer are added by Kadr.'
          }
        ]
      }
    ]
  }
]

const FLOW_LOGIC_OPTIONS = [
  { value: 'AND', text: 'AND — run all actions in order' },
  { value: 'OR', text: 'OR — run one path only (select below)' }
]

function getCatalog () {
  return {
    version: 1,
    flowLogicOptions: FLOW_LOGIC_OPTIONS,
    entities: ENTITIES,
    emailTemplates: EMAIL_TEMPLATES
  }
}

function findAction (entityKey, actionKey) {
  const entity = ENTITIES.find((e) => e.key === entityKey)
  if (!entity) return null
  return entity.actions.find((a) => a.key === actionKey) || null
}

module.exports = {
  EMAIL_TEMPLATES,
  ENTITIES,
  FLOW_LOGIC_OPTIONS,
  getCatalog,
  findAction
}
