const axios = require('axios')
const prisma = require('../../lib/prisma.js')

/**
 * Registers a device push token. FCM/APNs delivery is wired when
 * PUSH_FCM_SERVER_KEY (or platform-specific credentials) are configured.
 */
async function registerDevice ({ userId, token, platform }) {
  const normalizedPlatform = String(platform || 'unknown').toLowerCase()
  const normalizedToken = String(token || '').trim()
  if (!normalizedToken) {
    throw new Error('Push token is required')
  }

  await prisma.user_push_devices.upsert({
    where: {
      user_id_token: {
        user_id: userId,
        token: normalizedToken
      }
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

  return { registered: true }
}

async function unregisterDevice ({ userId, token }) {
  const normalizedToken = String(token || '').trim()
  if (!normalizedToken) return { removed: false }

  await prisma.user_push_devices.deleteMany({
    where: {
      user_id: userId,
      token: normalizedToken
    }
  })
  return { removed: true }
}

/**
 * Placeholder for server-initiated push. Integrate firebase-admin or APNs here.
 */
async function sendToUser (userId, { title, body, data = {} }) {
  const devices = await prisma.user_push_devices.findMany({
    where: { user_id: userId },
    select: { token: true, platform: true }
  })
  if (!devices.length) {
    return { sent: 0, skipped: true }
  }
  const serverKey = process.env.PUSH_FCM_SERVER_KEY
  if (!serverKey) {
    console.warn('[push] PUSH_FCM_SERVER_KEY not set; skipping delivery', {
      userId,
      title,
      deviceCount: devices.length
    })
    return { sent: 0, skipped: true, reason: 'not_configured' }
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
    const successCount = response.data?.success ?? 0
    return { sent: successCount, skipped: false, fcm: response.data }
  } catch (err) {
    console.error('[push] FCM delivery failed', err.response?.data || err.message)
    return { sent: 0, skipped: false, failed: true, error: err.message }
  }
}

module.exports = {
  registerDevice,
  unregisterDevice,
  sendToUser
}
