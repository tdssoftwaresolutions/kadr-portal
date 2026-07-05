/** Tables/fields available for notification trigger rules (admin + code). */
module.exports = {
  tables: [
    {
      name: 'cases',
      label: 'Cases',
      fields: [
        'status', 'sub_status', 'case_id', 'mediator', 'first_party', 'second_party',
        'mediator_commission', 'is_resolved', 'payment_status'
      ]
    },
    {
      name: 'user',
      label: 'Users',
      fields: [
        'name', 'email', 'phone_number', 'user_type', 'active', 'is_deleted',
        'subscription_tier', 'subscription_expires_at', 'reward_points_balance'
      ]
    },
    {
      name: 'events',
      label: 'Calendar events',
      fields: ['title', 'type', 'case_id', 'start_datetime', 'end_datetime', 'meeting_link']
    },
    {
      name: 'mediator_invoices',
      label: 'Mediator invoices',
      fields: ['status', 'case_id', 'mediator_id', 'amount', 'paid_at']
    },
    {
      name: 'case_messages',
      label: 'Case messages',
      fields: ['case_id', 'channel', 'body', 'author_id']
    },
    {
      name: 'reward_redemption_orders',
      label: 'Reward orders',
      fields: ['status', 'mediator_id', 'catalog_item_id', 'points_cost']
    },
    {
      name: 'mediator_subscriptions',
      label: 'Mediator subscriptions',
      fields: ['tier', 'source', 'starts_at', 'expires_at', 'mediator_id']
    },
    {
      name: 'website_contact_threads',
      label: 'Website contact threads',
      fields: ['status', 'portal_user_id', 'support_topic']
    },
    {
      name: 'signature_tracking',
      label: 'Signature tracking',
      fields: ['case_id', 'status', 'expires_at']
    },
    {
      name: 'notifications',
      label: 'In-app notifications',
      fields: ['title', 'description', 'is_read', 'user_id']
    }
  ]
}
