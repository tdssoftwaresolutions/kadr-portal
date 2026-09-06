import { apiClient } from './apiClient'
import {
  PUSH_VAPID_PUBLIC_KEY_ENDPOINT,
  PUSH_REGISTER_ENDPOINT,
  PUSH_UNREGISTER_ENDPOINT
} from '../store/endpoints'

// Path is relative to the site root. The build serves public/service-worker.js
// from the deploy root; publicPath is '/admin/' so the SW lives under it.
const SERVICE_WORKER_URL = `${process.env.BASE_URL || '/admin/'}service-worker.js`

/** True when the browser supports the Web Push stack (excludes native app shells). */
export function isWebPushSupported () {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

export function getPermissionState () {
  if (typeof Notification === 'undefined') return 'unsupported'
  return Notification.permission // 'default' | 'granted' | 'denied'
}

/** Converts a base64url VAPID public key to the Uint8Array the PushManager expects. */
function urlBase64ToUint8Array (base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

async function registerServiceWorker () {
  const existing = await navigator.serviceWorker.getRegistration(process.env.BASE_URL || '/admin/')
  if (existing) return existing
  return navigator.serviceWorker.register(SERVICE_WORKER_URL)
}

async function fetchVapidPublicKey () {
  const { data } = await apiClient.get(PUSH_VAPID_PUBLIC_KEY_ENDPOINT, { meta: { silent: true } })
  const key = data?.data?.publicKey || data?.publicKey
  if (!key) {
    throw new Error('Web Push is not configured on the server (missing VAPID key).')
  }
  return key
}

/** Returns the current PushSubscription for this browser, or null. */
export async function getExistingSubscription () {
  if (!isWebPushSupported()) return null
  const registration = await registerServiceWorker()
  await navigator.serviceWorker.ready
  return registration.pushManager.getSubscription()
}

export async function isSubscribed () {
  const sub = await getExistingSubscription()
  return Boolean(sub)
}

/**
 * Requests permission (if needed), subscribes with the server VAPID key, and
 * persists the subscription on the backend. Returns the PushSubscription.
 */
export async function subscribe () {
  if (!isWebPushSupported()) {
    throw new Error('This browser does not support push notifications.')
  }

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    throw new Error('Notification permission was not granted.')
  }

  const registration = await registerServiceWorker()
  await navigator.serviceWorker.ready

  let subscription = await registration.pushManager.getSubscription()
  if (!subscription) {
    const publicKey = await fetchVapidPublicKey()
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey)
    })
  }

  await apiClient.post(PUSH_REGISTER_ENDPOINT, {
    subscription: subscription.toJSON()
  }, { meta: { silent: true } })

  return subscription
}

/**
 * Keeps the browser permission and the stored subscription in sync.
 *
 * A subscription can outlive its display permission — e.g. the user clears site
 * data or the browser revokes permission — leaving a "dead" row on the server
 * that the push service still accepts but that can never be displayed. On app
 * load we detect that mismatch and purge the stale subscription (locally and
 * server-side) so the UI and DB reflect reality.
 *
 * Returns a summary: { supported, permission, subscribed, reconciled }.
 *  - reconciled=true means a stale subscription was removed during this call.
 */
export async function reconcilePushState () {
  if (!isWebPushSupported()) {
    return { supported: false, permission: 'unsupported', subscribed: false, reconciled: false }
  }

  const permission = getPermissionState()

  let subscription = null
  try {
    subscription = await getExistingSubscription()
  } catch (e) {
    subscription = null
  }

  // Permission is no longer granted but a subscription still exists -> stale.
  // Remove it both locally and on the server so nothing lingers in the DB.
  if (permission !== 'granted' && subscription) {
    try {
      await unsubscribe()
    } catch (e) {
      /* best-effort cleanup; ignore */
    }
    return { supported: true, permission, subscribed: false, reconciled: true }
  }

  return {
    supported: true,
    permission,
    subscribed: Boolean(subscription),
    reconciled: false
  }
}

/** Unsubscribes locally and removes the subscription from the backend. */
export async function unsubscribe () {
  if (!isWebPushSupported()) return { removed: false }
  const registration = await registerServiceWorker()
  const subscription = await registration.pushManager.getSubscription()
  if (!subscription) return { removed: false }

  const endpoint = subscription.endpoint
  try {
    await subscription.unsubscribe()
  } catch (e) {
    // Even if local unsubscribe fails, still drop it server-side.
  }
  await apiClient.post(PUSH_UNREGISTER_ENDPOINT, {
    subscription: { endpoint }
  }, { meta: { silent: true } })
  return { removed: true }
}
