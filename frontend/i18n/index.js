import { reactive } from 'vue'
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

function lookup (locale, key) {
  const keys = key.split('.')
  let value = messages[locale]
  for (const k of keys) {
    if (value && typeof value === 'object') {
      value = value[k]
    } else {
      return undefined
    }
  }
  return value
}

function translate (locale, key, params = {}) {
  let value = lookup(locale, key)

  // Fallback to English if key not found in current locale.
  if (value === undefined && locale !== DEFAULT_LOCALE) {
    value = lookup(DEFAULT_LOCALE, key)
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

/**
 * Single reactive source of truth for the active locale. Because this is a
 * Vue `reactive()` object, every component that reads `i18n.locale` during
 * render (directly, via `$i18n.locale`, or through `$t()` which reads it)
 * registers a reactive dependency and re-renders automatically when the
 * locale changes. No `$forceUpdate()` required.
 */
const i18n = reactive({
  locale: getStoredLocale(),
  availableLocales: SUPPORTED_LOCALES,
  setLocale (locale) {
    if (SUPPORTED_LOCALES.includes(locale) && locale !== this.locale) {
      this.locale = locale
      setStoredLocale(locale)
    }
  },
  t (key, params) {
    return translate(this.locale, key, params)
  }
})

const i18nPlugin = {
  install (app) {
    // Expose the reactive instance directly so `this.$i18n.locale` reads and
    // writes go through the same reactive object across the whole app.
    app.config.globalProperties.$i18n = i18n
    // `$t` reads `i18n.locale` on every call, establishing the reactive
    // dependency for the calling render/computed.
    app.config.globalProperties.$t = function (key, params) {
      return i18n.t(key, params)
    }
    // Also provide for Composition API consumers if needed.
    app.provide('i18n', i18n)
  }
}

export default i18nPlugin
export { i18n, SUPPORTED_LOCALES, DEFAULT_LOCALE }
