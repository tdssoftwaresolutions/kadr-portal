import { createApp } from 'vue'
import { createBootstrap } from 'bootstrap-vue-next'
import * as BootstrapVueNextComponents from 'bootstrap-vue-next'
import './plugins/bootstrap-vue'
import App from './App.vue'
import router from './router'
import createStore from './store'
import VueCookies from 'vue-cookies'
import VueSignaturePad from 'vue-signature-pad'
import datetimePlugin from './plugins/datetime'
import i18nPlugin from './i18n'
import KadrSpinner from './components/kadr/KadrSpinner.vue'

async function startApp () {
  const { bootstrapMobileSession, initCapacitorPlugins } = await import('./plugins/capacitor')
  await bootstrapMobileSession()

  const store = createStore(router)

  // Let the axios layer drive the global spinner via the loading bridge
  // (avoids a circular import between apiClient and the store).
  const { registerLoadingStore } = await import('./utils/loadingBridge')
  registerLoadingStore(store)

  const app = createApp(App)

  app.use(router)
  app.use(store)
  app.use(createBootstrap())

  // Globally register every BootstrapVueNext component (names start with "B", e.g.
  // BButton) so existing kebab-case tags (<b-button>, <b-table>, …) resolve without
  // per-file imports across the 75 files that use them. Vue maps PascalCase
  // registrations to kebab-case tags automatically. Directives (vB*) are handled
  // separately where needed.
  Object.keys(BootstrapVueNextComponents).forEach((name) => {
    if (/^B[A-Z]/.test(name)) {
      const comp = BootstrapVueNextComponents[name]
      if (comp && (typeof comp === 'object' || typeof comp === 'function')) {
        app.component(name, comp)
      }
    }
  })

  // Globally register BootstrapVueNext directives so template directives like
  // v-b-toggle, v-b-tooltip, v-b-modal, v-b-popover resolve. Exports are named
  // in the form `vBToggle` -> registered as directive `b-toggle` (usable as
  // `v-b-toggle`). Without this, those directives silently fail to resolve.
  Object.keys(BootstrapVueNextComponents).forEach((name) => {
    if (/^vB[A-Z]/.test(name)) {
      const directive = BootstrapVueNextComponents[name]
      if (directive && (typeof directive === 'object' || typeof directive === 'function')) {
        // vBToggle -> 'b-toggle'
        const directiveName = name
          .slice(1)
          .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
          .toLowerCase()
        app.directive(directiveName, directive)
      }
    }
  })

  // The single canonical loading indicator, usable app-wide as <kadr-spinner>.
  app.component('KadrSpinner', KadrSpinner)

  app.use(VueSignaturePad)
  app.use(datetimePlugin)
  app.use(i18nPlugin)
  app.use(VueCookies)

  // Auto-register all sofbox base components globally (was Vue.component in Vue 2).
  // Explicit: recurse subfolders, match only .vue files, register each name once.
  const components = require.context('./components/sofbox', true, /\.vue$/)
  const registered = new Set()
  components.keys().forEach((fileName) => {
    const componentName = fileName.split('/').pop().replace(/\.vue$/, '')
    if (registered.has(componentName)) return
    registered.add(componentName)
    const componentConfig = components(fileName)
    app.component(componentName, componentConfig.default || componentConfig)
  })

  const vm = app.mount('#app')
  window.vm = vm

  await initCapacitorPlugins(store)
}

startApp()
