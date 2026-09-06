import { isNativeApp, getMobileClientHeaders } from '../utils/platform'
import { getRefreshToken, setTokens, hasStoredSession } from '../utils/tokenStorage'
import { apiClient, REFRESH_TOKEN_ENDPOINT } from '../utils/apiClient'

let pushInitialized = false

function parseRefreshResponse (data) {
  if (data?.data?.accessToken) return data.data.accessToken
  if (data?.accessToken) return data.accessToken
  return null
}

/**
 * Restore session on cold start using secure refresh token (stay logged in).
 */
export async function bootstrapMobileSession () {
  if (!(await hasStoredSession())) return false

  const refreshToken = await getRefreshToken()
  if (!refreshToken) return true

  try {
    const { data } = await apiClient.post(
      REFRESH_TOKEN_ENDPOINT,
      { refreshToken },
      {
        headers: getMobileClientHeaders(),
        withCredentials: false,
        meta: { silent: true }
      }
    )
    const accessToken = parseRefreshResponse(data)
    if (accessToken) {
      await setTokens({ accessToken, refreshToken })
      return true
    }
  } catch (e) {
    console.warn('[mobile] Session bootstrap failed', e)
  }
  return false
}

export async function initCapacitorPlugins (store) {
  if (!isNativeApp()) return

  try {
    const { SplashScreen } = await import('@capacitor/splash-screen')
    const { StatusBar, Style } = await import('@capacitor/status-bar')
    await StatusBar.setStyle({ style: Style.Light })
    await SplashScreen.hide()
  } catch (e) {
    console.warn('[capacitor] Splash/status setup skipped', e)
  }

  await initPushNotifications(store)
}

async function initPushNotifications (store) {
  if (pushInitialized || !isNativeApp()) return
  pushInitialized = true

  try {
    const { PushNotifications } = await import('@capacitor/push-notifications')
    const permission = await PushNotifications.requestPermissions()
    if (permission.receive !== 'granted') return

    await PushNotifications.register()

    PushNotifications.addListener('registration', async (token) => {
      if (!(await hasStoredSession())) return
      let platform = 'unknown'
      try {
        const { Capacitor } = await import('@capacitor/core')
        platform = Capacitor.getPlatform()
      } catch (_) { /* empty */ }
      try {
        await apiClient.post('/push/register', {
          token: token.value,
          platform
        }, { meta: { silent: true } })
      } catch (e) {
        console.warn('[push] register failed', e)
      }
    })

    PushNotifications.addListener('registrationError', (err) => {
      console.warn('[push] registration error', err)
    })

    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      const title = notification.title || 'Notification'
      const body = notification.body || ''
      if (store?.dispatch) {
        store.dispatch(
          'alert/showAlert',
          { message: `${title}: ${body}`, type: 'info', timeout: 6000 },
          { root: true }
        )
      }
    })

    PushNotifications.addListener('pushNotificationActionPerformed', () => {
      // Deep link handling can be added per notification payload
    })
  } catch (e) {
    console.warn('[push] init skipped', e)
  }
}

export async function unregisterPushToken (token) {
  if (!token || !isNativeApp()) return
  try {
    await apiClient.post('/push/unregister', { token }, { meta: { silent: true } })
  } catch (_) { /* empty */ }
}
