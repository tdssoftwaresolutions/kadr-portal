import Vue from 'vue'
import en from './locales/en.json'
import hi from './locales/hi.json'

/**
 * Simple i18n plugin for Hindi/English support in the admin portal.
 *
 * Usage in components:
 *   {{ $t('key') }}
 *   this.$t('key')
 *   this.$i18n.locale = 'hi' // switch to Hindi
 *
 * Locale is persisted in localStorage.
 */

const DEFAULT_LOCALE = 'en'
const SUPPORTED_LOCALES = ['en', 'hi']
const STORAGE_KEY = 'kadr_locale'

const messages = { en, hi }

function getStoredLocale () {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored && SUPPORTED_LOCALES.includes(stored)) return stored
  } catch (e) { /* ignore */ }
  return DEFAULT_LOCALE
}

function setStoredLocale (locale) {
  try {
    localStorage.setItem(STORAGE_KEY, locale)
  } catch (e) { /* ignore */ }
}

class I18n {
  constructor () {
    this.locale = getStoredLocale()
  }

  t (key, params = {}) {
    const keys = key.split('.')
    let value = messages[this.locale]
    for (const k of keys) {
      if (value && typeof value === 'object') {
        value = value[k]
      } else {
        value = undefined
        break
      }
    }

    // Fallback to English if key not found in current locale
    if (value === undefined && this.locale !== 'en') {
      value = messages.en
      for (const k of keys) {
        if (value && typeof value === 'object') {
          value = value[k]
        } else {
          value = undefined
          break
        }
      }
    }

    if (value === undefined) return key

    // Simple parameter interpolation: {name} -> value
    if (typeof value === 'string' && params) {
      return value.replace(/\{(\w+)\}/g, (_, paramKey) => {
        return params[paramKey] !== undefined ? params[paramKey] : `{${paramKey}}`
      })
    }

    return value
  }

  setLocale (locale) {
    if (SUPPORTED_LOCALES.includes(locale)) {
      this.locale = locale
      setStoredLocale(locale)
    }
  }

  get currentLocale () {
    return this.locale
  }

  get availableLocales () {
    return SUPPORTED_LOCALES
  }
}

const i18n = new I18n()

// Make reactive via Vue.observable
const state = Vue.observable({ locale: i18n.locale })

const i18nPlugin = {
  install (Vue) {
    Vue.prototype.$i18n = {
      get locale () { return state.locale },
      set locale (val) {
        i18n.setLocale(val)
        state.locale = val
      },
      availableLocales: SUPPORTED_LOCALES
    }
    Vue.prototype.$t = function (key, params) {
      // Access state.locale to trigger reactivity
      const _ = state.locale // eslint-disable-line no-unused-vars
      return i18n.t(key, params)
    }
  }
}

export default i18nPlugin
export { i18n, SUPPORTED_LOCALES, DEFAULT_LOCALE }
