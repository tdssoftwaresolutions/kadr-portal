import {
  formatDateTime,
  formatDate,
  formatTime,
  formatRelativeDay,
  formatMeetingRange,
  getTimezoneLabel
} from '../utils/dateFormat'
import {
  ensureTimezoneInitialized,
  getEffectiveTimezone,
  getEffectiveLocale,
  onPreferencesChanged
} from '../utils/timezone'

/**
 * Installs global format helpers on Vue so every view can use
 * `this.$formatDateTime(value)` without importing.
 */
export default {
  install (app) {
    ensureTimezoneInitialized()

    app.config.globalProperties.$formatDateTime = formatDateTime
    app.config.globalProperties.$formatDate = formatDate
    app.config.globalProperties.$formatTime = formatTime
    app.config.globalProperties.$formatRelativeDay = formatRelativeDay
    app.config.globalProperties.$formatMeetingRange = formatMeetingRange
    app.config.globalProperties.$getTimezone = getEffectiveTimezone
    app.config.globalProperties.$getLocale = getEffectiveLocale
    app.config.globalProperties.$timezoneLabel = getTimezoneLabel

    // Vue 3 removed template filters. The `formatDateTime`/`formatDate`/`formatTime`
    // filters were unused in templates (verified), so they are dropped; the
    // `$formatX` global methods above remain available everywhere.

    // Keep reactive UI in sync when prefs change (optional mixin hook)
    app.mixin({
      created () {
        if (this.$options.watchTimezone === true) {
          this._unsubPrefs = onPreferencesChanged(() => {
            this.$forceUpdate()
          })
        }
      },
      beforeUnmount () {
        if (typeof this._unsubPrefs === 'function') {
          this._unsubPrefs()
          this._unsubPrefs = null
        }
      }
    })
  }
}
