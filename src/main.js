import 'mutationobserver-shim'
import { createApp } from 'vue'
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
