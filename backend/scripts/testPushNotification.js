#!/usr/bin/env node
/**
 * Send a test browser Web Push notification to an existing registered device.
 *
 * This reuses the app's real delivery path: it loads the VAPID keys from the
 * PUSH channel settings (same as production) and sends via the `web-push`
 * library, so a successful send here means the live flow works too.
 *
 * Look up the target device by ONE of:
 *   --id=<user_push_devices.id>       device row id (uuid)
 *   --token=<subscription endpoint>   the browser subscription endpoint URL
 *   --user=<user_id>                  send to all web devices for that user
 *
 * Optional message overrides:
 *   --title="..."   notification title  (default: "Test notification")
 *   --body="..."    notification body   (default: a timestamped message)
 *   --url=...       click-through URL placed in data.url (default: /admin)
 *
 * Usage examples:
 *   node scripts/testPushNotification.js --id=1f0c...c8
 *   node scripts/testPushNotification.js --token="https://fcm.googleapis.com/fcm/send/abc..."
 *   node scripts/testPushNotification.js --user=3a2b... --title="Hello" --body="It works"
 *
 * Note: shells split on spaces, so always quote values that contain spaces or URLs.
 */
require('dotenv').config()

const webpush = require('web-push')
const prisma = require('../lib/prisma')
const { getChannelSettings } = require('../services/notification/channelConfig')

function parseArgs (argv) {
  const args = {}
  for (const raw of argv.slice(2)) {
    const arg = raw.startsWith('--') ? raw.slice(2) : raw
    const eq = arg.indexOf('=')
    if (eq === -1) {
      args[arg] = true
    } else {
      args[arg.slice(0, eq)] = arg.slice(eq + 1)
    }
  }
  return args
}

async function configureVapid () {
  const settings = await getChannelSettings('PUSH')
  const config = settings?.config || {}
  const { vapidPublicKey, vapidPrivateKey } = config
  const subject = config.vapidSubject || 'mailto:contact@kadr.live'
  if (!vapidPublicKey || !vapidPrivateKey) {
    throw new Error(
      'VAPID keys are not configured in the PUSH channel settings. ' +
      'Run `npm run vapid:generate` first.'
    )
  }
  webpush.setVapidDetails(subject, vapidPublicKey, vapidPrivateKey)
}

async function findDevices (args) {
  if (args.id) {
    const device = await prisma.user_push_devices.findUnique({ where: { id: String(args.id) } })
    return device ? [device] : []
  }
  if (args.token) {
    return prisma.user_push_devices.findMany({ where: { token: String(args.token) } })
  }
  if (args.user) {
    return prisma.user_push_devices.findMany({
      where: { user_id: String(args.user), platform: 'web' }
    })
  }
  return null
}

async function main () {
  const args = parseArgs(process.argv)

  if (!args.id && !args.token && !args.user) {
    console.error('Error: provide one of --id=<deviceId>, --token=<endpoint>, or --user=<userId>.')
    console.error('Run with no target to see usage in the file header.')
    process.exitCode = 1
    return
  }

  await configureVapid()

  const devices = await findDevices(args)
  if (!devices || !devices.length) {
    console.error('No matching push device found for the given selector.')
    process.exitCode = 1
    return
  }

  const title = typeof args.title === 'string' ? args.title : 'Test notification'
  const body = typeof args.body === 'string'
    ? args.body
    : `Kadr web push test at ${new Date().toLocaleString()}`
  const url = typeof args.url === 'string' ? args.url : '/admin'
  const payload = JSON.stringify({ title, body, data: { url } })

  let sent = 0
  let failed = 0

  for (const device of devices) {
    if (device.platform !== 'web') {
      console.warn(`Skipping device ${device.id}: platform is "${device.platform}" (this script only sends browser web push).`)
      continue
    }
    if (!device.p256dh || !device.auth) {
      console.warn(`Skipping device ${device.id}: missing p256dh/auth encryption keys.`)
      continue
    }

    const subscription = {
      endpoint: device.token,
      keys: { p256dh: device.p256dh, auth: device.auth }
    }

    try {
      await webpush.sendNotification(subscription, payload)
      sent += 1
      console.log(`OK Sent to device ${device.id} (user ${device.user_id})`)
    } catch (err) {
      failed += 1
      const status = err.statusCode
      console.error(`x Failed for device ${device.id} - status ${status || 'n/a'}: ${err.body || err.message}`)
      if (status === 404 || status === 410) {
        console.error('  This subscription is expired/gone. The browser needs to re-subscribe.')
      }
    }
  }

  console.log(`\nDone. sent=${sent} failed=${failed}`)
  if (sent === 0) process.exitCode = 1
}

main()
  .catch((err) => {
    console.error('Test push failed:', err.message)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
