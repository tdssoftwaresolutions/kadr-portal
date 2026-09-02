/**
 * Maps Prisma model names (camelCase) to notification trigger table_name + default recipient field.
 * Must align with config/notificationTriggerCatalog.js table names.
 */
module.exports = {
  user: { tableName: 'user', recipientIdField: 'id' },
  cases: { tableName: 'cases', recipientIdField: 'mediator' },
  events: { tableName: 'events', recipientIdField: 'user_id' },
  mediator_invoices: { tableName: 'mediator_invoices', recipientIdField: 'mediator_id' },
  case_messages: { tableName: 'case_messages', recipientIdField: 'author_id' },
  reward_redemption_orders: { tableName: 'reward_redemption_orders', recipientIdField: 'mediator_id' },
  mediator_subscriptions: { tableName: 'mediator_subscriptions', recipientIdField: 'mediator_id' },
  website_contact_threads: { tableName: 'website_contact_threads', recipientIdField: 'portal_user_id' },
  website_contact_messages: { tableName: 'website_contact_messages', recipientIdField: 'admin_id' },
  signature_tracking: { tableName: 'signature_tracking', recipientIdField: 'user_id' },
  notifications: { tableName: 'notifications', recipientIdField: 'user_id' }
}
