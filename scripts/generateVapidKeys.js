#!/usr/bin/env node
/**
 * Generate a VAPID keypair for Web Push and store it in the PUSH channel settings.
 *
 * The public key is exposed to browsers (GET /api/push/vapid-public-key) and used
 * when subscribing. The private key stays server-side and signs push requests.
 *
 * Usage:
 *   node scripts/generateVapidKeys.js               # generate only if not already set
 *   node scripts/generateVapidKeys.js --force       # regenerate and overwrite existing keys
 *
 * WARNING: regenerating keys (--force) invalidates every existing browser
 * subscription. All users would need to re-enable notifications.
 */
require('dotenv').config()

const webpush = require('web-push')
const prisma = require('../lib/prisma')

const force = process.argv.includes('--force')

async function main () {
  const existing = await prisma.notification_channel_settings.findUnique({
    where: { channel: 'PUSH' }
  })
  const config = (existing && existing.config) || {}

  if (config.vapidPublicKey && config.vapidPrivateKey && !force) {
    console.log('VAPID keys already configured. Use --force to regenerate.')
    console.log('Public key:', config.vapidPublicKey)
    return
  }

  const { publicKey, privateKey } = webpush.generateVAPIDKeys()
  const subject = config.vapidSubject || process.env.VAPID_SUBJECT || 'mailto:contact@kadr.live'

  const nextConfig = {
    ...config,
    vapidPublicKey: publicKey,
    vapidPrivateKey: privateKey,
    vapidSubject: subject
  }

  await prisma.notification_channel_settings.upsert({
    where: { channel: 'PUSH' },
    create: {
      channel: 'PUSH',
      enabled: true,
      provider: 'web-push',
      config: nextConfig
    },
    update: {
      provider: 'web-push',
      config: nextConfig
    }
  })

  console.log(force ? 'VAPID keys regenerated.' : 'VAPID keys generated.')
  console.log('Public key:', publicKey)
  console.log('Subject:', subject)
  if (force) {
    console.log('\nNOTE: existing browser subscriptions are now invalid; users must re-enable notifications.')
  }
}

main()
  .catch((err) => {
    console.error('Failed to generate VAPID keys:', err)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
