/* Kadr Web Push service worker.
 *
 * Handles incoming push messages and notification clicks. This file is served
 * from the site root (copied verbatim from public/) so its scope covers the app.
 */
/* eslint-disable no-restricted-globals */

self.addEventListener('install', () => {
  // Activate immediately so pushes work without requiring a reload.
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('push', (event) => {
  let payload = {}
  try {
    payload = event.data ? event.data.json() : {}
  } catch (e) {
    payload = { title: 'Kadr.live', body: event.data ? event.data.text() : '' }
  }

  const title = payload.title || 'Kadr.live'
  const data = payload.data || {}
  const options = {
    body: payload.body || '',
    // Use stable, non-hashed public icons that actually exist in the build.
    // (The previous '/admin/img/logo.png' path 404s because build assets are
    // content-hashed and the SW is served from the site root, not /admin.)
    icon: data.icon || '/img/icons/android-chrome-192x192.png',
    badge: data.badge || '/img/icons/favicon-32x32.png',
    tag: data.tag || undefined,
    renotify: Boolean(data.tag),
    data: {
      url: data.url || data.link || '/admin/',
      ...data
    }
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl = (event.notification.data && event.notification.data.url) || '/admin/'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Focus an existing tab if one is already open, otherwise open a new one.
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus()
          if ('navigate' in client) {
            try { client.navigate(targetUrl) } catch (e) { /* cross-origin, ignore */ }
          }
          return undefined
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl)
      }
      return undefined
    })
  )
})
