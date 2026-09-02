import 'mutationobserver-shim'
import { createApp, configureCompat } from 'vue'
import { createBootstrap } from 'bootstrap-vue-next'

// BootstrapVueNext (native Vue 3) requires real Vue 3 v-model semantics
// (modelValue / update:modelValue). Disable the Vue-2 v-model compat behavior
// globally at runtime; our own components using the old value/input pattern are
// migrated to modelValue accordingly.
configureCompat({ COMPONENT_V_MODEL: false })
import * as BootstrapVueNextComponents from 'bootstrap-vue-next'
import './plugins/bootstrap-vue'
import App from './App.vue'
import router from './router'
import createStore from './store'
import VueCookies from 'vue-cookies'
import VueScrollProgressBar from '@guillaumebriday/vue-scroll-progress-bar'
import VueSignaturePad from 'vue-signature-pad'
import datetimePlugin from './plugins/datetime'
import i18nPlugin from './i18n'

async function startApp () {
  const { bootstrapMobileSession, initCapacitorPlugins } = await import('./plugins/capacitor')
  await bootstrapMobileSession()

  const store = createStore(router)

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

  app.use(VueSignaturePad)
  app.use(datetimePlugin)
  app.use(i18nPlugin)
  app.use(VueScrollProgressBar)
  app.use(VueCookies)

  // Auto-register all sofbox base components globally (was Vue.component in Vue 2).
  const components = require.context('./components/sofbox')
  components.keys().forEach((fileName) => {
    const componentConfig = components(fileName)
    const componentName = fileName.split('/').pop().split('.')[0]
    app.component(componentName, componentConfig.default || componentConfig)
  })

  const vm = app.mount('#app')
  window.vm = vm

  await initCapacitorPlugins(store)
}

startApp()
