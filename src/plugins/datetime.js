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
  install (Vue) {
    ensureTimezoneInitialized()

    Vue.prototype.$formatDateTime = formatDateTime
    Vue.prototype.$formatDate = formatDate
    Vue.prototype.$formatTime = formatTime
    Vue.prototype.$formatRelativeDay = formatRelativeDay
    Vue.prototype.$formatMeetingRange = formatMeetingRange
    Vue.prototype.$getTimezone = getEffectiveTimezone
    Vue.prototype.$getLocale = getEffectiveLocale
    Vue.prototype.$timezoneLabel = getTimezoneLabel

    Vue.filter('formatDateTime', formatDateTime)
    Vue.filter('formatDate', formatDate)
    Vue.filter('formatTime', formatTime)

    // Keep reactive UI in sync when prefs change (optional mixin hook)
    Vue.mixin({
      created () {
        if (this.$options.watchTimezone === true) {
          this._unsubPrefs = onPreferencesChanged(() => {
            this.$forceUpdate()
          })
        }
      },
      beforeDestroy () {
        if (typeof this._unsubPrefs === 'function') {
          this._unsubPrefs()
          this._unsubPrefs = null
        }
      }
    })
  }
}
