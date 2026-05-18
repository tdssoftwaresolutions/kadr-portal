const cron = require('node-cron')
const { expireDueSubscriptions } = require('../subscription/subscriptionService')

async function runSubscriptionExpiryJob () {
  try {
    const count = await expireDueSubscriptions()
    if (count > 0) {
      console.log(`[scheduler] Downgraded ${count} expired Pro subscription(s) to Free`)
    }
  } catch (error) {
    console.error('[scheduler] Subscription expiry job failed', error)
  }
}

function scheduleSubscriptionExpiryJob () {
  cron.schedule('5 0 * * *', runSubscriptionExpiryJob, { timezone: 'Asia/Kolkata' })
  console.log('[scheduler] Subscription expiry job scheduled at 12:05 AM IST daily')
}

module.exports = { scheduleSubscriptionExpiryJob, runSubscriptionExpiryJob }
