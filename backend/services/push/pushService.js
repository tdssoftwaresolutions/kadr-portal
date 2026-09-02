const axios = require('axios')
const webpush = require('web-push')
const prisma = require('../../lib/prisma.js')
const { getChannelSettings } = require('../notification/channelConfig')

/**
 * Push delivery for the Kadr portal.
 *
 * Two device kinds share the `user_push_devices` table:
 *  - Browser Web Push (RFC 8291): platform 'web'. `token` holds the subscription
 *    endpoint URL; `p256dh` and `auth` hold the encryption keys. Delivered with
 *    the `web-push` library using VAPID keys stored in the PUSH channel config.
 *  - Mobile (FCM/APNs): platform 'ios'/'android'. `token` holds the device token.
 *    Delivered via FCM when PUSH_FCM_SERVER_KEY is configured.
 */

let vapidConfigured = false

/**
 * Load VAPID keys from the PUSH channel settings config and configure web-push.
 * Cached after first successful configuration; returns false when keys are missing.
 */
async function ensureVapidConfigured () {
  if (vapidConfigured) return true
  const settings = await getChannelSettings('PUSH')
  const config = settings?.config || {}
  const { vapidPublicKey, vapidPrivateKey } = config
  const subject = config.vapidSubject || 'mailto:contact@kadr.live'
  if (!vapidPublicKey || !vapidPrivateKey) return false
  webpush.setVapidDetails(subject, vapidPublicKey, vapidPrivateKey)
  vapidConfigured = true
  return true
}

/** Clears the cached VAPID config so the next send reloads keys (used after admin edits). */
function resetVapidCache () {
  vapidConfigured = false
}

async function getVapidPublicKey () {
  const settings = await getChannelSettings('PUSH')
  return settings?.config?.vapidPublicKey || null
}

function isWebSubscription (input) {
  return Boolean(input && typeof input === 'object' && input.endpoint)
}

/**
 * Registers a push device. Accepts either:
 *  - a browser PushSubscription: { subscription: { endpoint, keys: { p256dh, auth } } }
 *  - a mobile device token: { token, platform }
 */
async function registerDevice ({ userId, token, platform, subscription, userAgent }) {
  const sub = subscription && (subscription.endpoint ? subscription : subscription.subscription)

  if (isWebSubscription(sub)) {
    const endpoint = String(sub.endpoint).trim()
    const keys = sub.keys || {}
    if (!keys.p256dh || !keys.auth) {
      throw new Error('Web push subscription is missing encryption keys')
    }
    await prisma.user_push_devices.upsert({
      where: {
        user_id_token: { user_id: userId, token: endpoint }
      },
      create: {
        user_id: userId,
        token: endpoint,
        platform: 'web',
        p256dh: keys.p256dh,
        auth: keys.auth,
        user_agent: userAgent ? String(userAgent).slice(0, 255) : null
      },
      update: {
        platform: 'web',
        p256dh: keys.p256dh,
        auth: keys.auth,
        user_agent: userAgent ? String(userAgent).slice(0, 255) : null,
        updated_at: new Date()
      }
    })
    return { registered: true, kind: 'web' }
  }

  const normalizedToken = String(token || '').trim()
  if (!normalizedToken) {
    throw new Error('Push token or subscription is required')
  }
  const normalizedPlatform = String(platform || 'unknown').toLowerCase()

  await prisma.user_push_devices.upsert({
    where: {
      user_id_token: { user_id: userId, token: normalizedToken }
    },
    create: {
      user_id: userId,
      token: normalizedToken,
      platform: normalizedPlatform
    },
    update: {
      platform: normalizedPlatform,
      updated_at: new Date()
    }
  })

  return { registered: true, kind: 'mobile' }
}

async function unregisterDevice ({ userId, token, subscription }) {
  const endpoint = isWebSubscription(subscription) ? subscription.endpoint : null
  const key = String(endpoint || token || '').trim()
  if (!key) return { removed: false }

  await prisma.user_push_devices.deleteMany({
    where: { user_id: userId, token: key }
  })
  return { removed: true }
}

/** Removes a dead web subscription (server returned 404/410 Gone). */
async function removeDeadSubscription (endpoint) {
  if (!endpoint) return
  try {
    await prisma.user_push_devices.deleteMany({ where: { token: endpoint } })
  } catch (err) {
    console.error('[push] failed to prune dead subscription', err.message)
  }
}

/** Delivers a Web Push notification to all of a user's browser subscriptions. */
async function sendWebPush (devices, { title, body, data }) {
  const configured = await ensureVapidConfigured()
  if (!configured) {
    console.warn('[push] VAPID keys not configured; run npm run vapid:generate')
    return { sent: 0, failed: 0, skipped: true, reason: 'vapid_not_configured' }
  }

  const payload = JSON.stringify({
    title: title || 'Kadr.live',
    body: body || '',
    data: data || {}
  })

  let sent = 0
  let failed = 0
  await Promise.all(
    devices.map(async (device) => {
      const subscription = {
        endpoint: device.token,
        keys: { p256dh: device.p256dh, auth: device.auth }
      }
      try {
        await webpush.sendNotification(subscription, payload)
        sent += 1
      } catch (err) {
        const status = err.statusCode
        if (status === 404 || status === 410) {
          await removeDeadSubscription(device.token)
        } else {
          console.error('[push] web push delivery failed', status, err.body || err.message)
        }
        failed += 1
      }
    })
  )
  return { sent, failed }
}

/** Delivers to mobile devices via the legacy FCM HTTP API (best-effort). */
async function sendMobilePush (devices, { title, body, data }) {
  const serverKey = process.env.PUSH_FCM_SERVER_KEY
  if (!serverKey) {
    return { sent: 0, skipped: true, reason: 'fcm_not_configured' }
  }
  const tokens = devices.map((d) => d.token).filter(Boolean)
  if (!tokens.length) return { sent: 0, skipped: true, reason: 'no_tokens' }

  try {
    const response = await axios.post(
      'https://fcm.googleapis.com/fcm/send',
      {
        registration_ids: tokens,
        notification: { title: title || 'Kadr.live', body: body || '' },
        data: data || {}
      },
      {
        headers: {
          Authorization: `key=${serverKey}`,
          'Content-Type': 'application/json'
        }
      }
    )
    return { sent: response.data?.success ?? 0, fcm: response.data }
  } catch (err) {
    console.error('[push] FCM delivery failed', err.response?.data || err.message)
    return { sent: 0, failed: tokens.length, error: err.message }
  }
}

/**
 * Server-initiated push to a single user across all their registered devices
 * (browser Web Push + mobile). Returns an aggregate delivery summary.
 */
async function sendToUser (userId, { title, body, data = {} }) {
  const devices = await prisma.user_push_devices.findMany({
    where: { user_id: userId },
    select: { token: true, platform: true, p256dh: true, auth: true }
  })
  if (!devices.length) {
    return { sent: 0, skipped: true, reason: 'no_devices' }
  }

  const webDevices = devices.filter((d) => d.platform === 'web' && d.p256dh && d.auth)
  const mobileDevices = devices.filter((d) => d.platform !== 'web')

  const [web, mobile] = await Promise.all([
    webDevices.length ? sendWebPush(webDevices, { title, body, data }) : Promise.resolve({ sent: 0, skipped: true }),
    mobileDevices.length ? sendMobilePush(mobileDevices, { title, body, data }) : Promise.resolve({ sent: 0, skipped: true })
  ])

  const sent = (web.sent || 0) + (mobile.sent || 0)
  return {
    sent,
    skipped: sent === 0,
    web,
    mobile
  }
}

module.exports = {
  registerDevice,
  unregisterDevice,
  sendToUser,
  getVapidPublicKey,
  ensureVapidConfigured,
  resetVapidCache
}
