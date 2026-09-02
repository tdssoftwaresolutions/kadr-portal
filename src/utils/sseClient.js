/**
 * SSE Client for real-time updates from the server.
 *
 * Usage:
 *   import { sseClient } from '@/utils/sseClient'
 *   sseClient.connect(accessToken)
 *   sseClient.on('new_message', (data) => { ... })
 *   sseClient.disconnect()
 */

class SSEClient {
  constructor () {
    this.eventSource = null
    this.listeners = new Map()
    this.reconnectAttempts = 0
    this.maxReconnectAttempts = 5
    this.reconnectDelay = 3000
    this.token = null
  }

  connect (token) {
    if (this.eventSource) {
      this.disconnect()
    }

    this.token = token
    const baseUrl = process.env.VUE_APP_API_URL || ''
    const url = `${baseUrl}/api/sse/events`

    // EventSource doesn't support custom headers natively.
    // We'll pass the token as a query param (the server can also accept cookies).
    // For better security, the auth middleware on SSE also checks cookies.
    try {
      this.eventSource = new EventSource(`${url}?token=${encodeURIComponent(token)}`, {
        withCredentials: true
      })

      this.eventSource.onopen = () => {
        this.reconnectAttempts = 0
        this._emit('_connected', { timestamp: Date.now() })
      }

      this.eventSource.onerror = (err) => {
        console.warn('[SSE] Connection error', err)
        this._emit('_error', err)
        this._attemptReconnect()
      }

      // Listen for custom events
      this.eventSource.addEventListener('connected', (event) => {
        const data = JSON.parse(event.data)
        this._emit('connected', data)
      })

      this.eventSource.addEventListener('new_message', (event) => {
        const data = JSON.parse(event.data)
        this._emit('new_message', data)
      })

      this.eventSource.addEventListener('notification', (event) => {
        const data = JSON.parse(event.data)
        this._emit('notification', data)
      })

      this.eventSource.addEventListener('case_update', (event) => {
        const data = JSON.parse(event.data)
        this._emit('case_update', data)
      })
    } catch (err) {
      console.error('[SSE] Failed to create EventSource:', err)
    }
  }

  disconnect () {
    if (this.eventSource) {
      this.eventSource.close()
      this.eventSource = null
    }
    this.reconnectAttempts = 0
  }

  on (event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event).add(callback)
    return () => this.off(event, callback)
  }

  off (event, callback) {
    const eventListeners = this.listeners.get(event)
    if (eventListeners) {
      eventListeners.delete(callback)
    }
  }

  _emit (event, data) {
    const eventListeners = this.listeners.get(event)
    if (eventListeners) {
      for (const callback of eventListeners) {
        try {
          callback(data)
        } catch (err) {
          console.error(`[SSE] Listener error for ${event}:`, err)
        }
      }
    }
  }

  _attemptReconnect () {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.warn('[SSE] Max reconnect attempts reached. Giving up.')
      this.disconnect()
      return
    }

    this.reconnectAttempts++
    const delay = this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1)

    setTimeout(() => {
      if (this.token) {
        console.log(`[SSE] Reconnect attempt ${this.reconnectAttempts}...`)
        this.connect(this.token)
      }
    }, delay)
  }

  get isConnected () {
    return this.eventSource && this.eventSource.readyState === EventSource.OPEN
  }
}

export const sseClient = new SSEClient()
export default sseClient
