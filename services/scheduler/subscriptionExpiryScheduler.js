const cron = require('node-cron')
const { expireDueSubscriptions } = require('../subscription/subscriptionService')
const { withSchedulerLock } = require('./schedulerLockService')
const { alertSchedulerFailure } = require('../alerting/criticalAlertService')

async function runSubscriptionExpiryJob () {
  await withSchedulerLock('subscription-expiry', async () => {
    const count = await expireDueSubscriptions()
    if (count > 0) {
      console.log(`[scheduler] Downgraded ${count} expired Pro subscription(s) to Free`)
    }
    return count
  }, 10 * 60 * 1000)
}

function scheduleSubscriptionExpiryJob () {
  cron.schedule('5 0 * * *', () => {
    runSubscriptionExpiryJob().catch((err) => {
      console.error('[scheduler] Subscription expiry job failed:', err)
      alertSchedulerFailure({ jobName: 'subscription-expiry', error: err })
    })
  }, { timezone: process.env.APP_TIMEZONE || 'Asia/Kolkata' })
  console.log(`[scheduler] Subscription expiry job scheduled at 12:05 AM (${process.env.APP_TIMEZONE || 'Asia/Kolkata'})`)
}

module.exports = { scheduleSubscriptionExpiryJob, runSubscriptionExpiryJob }
