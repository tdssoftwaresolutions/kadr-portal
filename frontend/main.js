import { createApp } from 'vue'
import {
  createBootstrap,
  BAlert,
  BBadge,
  BBreadcrumb,
  BButton,
  BCard,
  BCardBody,
  BCol,
  BCollapse,
  BContainer,
  BDropdown,
  BDropdownItem,
  BForm,
  BFormCheckbox,
  BFormCheckboxGroup,
  BFormGroup,
  BFormInput,
  BFormRadioGroup,
  BFormSelect,
  BFormSelectOption,
  BFormTextarea,
  BModal,
  BNavbarToggle,
  BOverlay,
  BPagination,
  BRow,
  BTab,
  BTable,
  BTabs
} from 'bootstrap-vue-next'
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

  // Register only the BootstrapVueNext components actually used anywhere in
  // the app (kebab-case tags like <b-button>, <b-table> resolve from their
  // PascalCase registration automatically). Previously this looped over
  // every export the library has — including dozens never used — via
  // `import * as BootstrapVueNextComponents`, which also defeats webpack's
  // tree-shaking for the whole library since every export is referenced
  // dynamically. Named imports above let the unused ones be dropped from
  // the bundle entirely. No v-b-* directives (v-b-toggle etc.) are used
  // anywhere in the app, so there's nothing to register there.
  const bootstrapComponents = {
    BAlert,
    BBadge,
    BBreadcrumb,
    BButton,
    BCard,
    BCardBody,
    BCol,
    BCollapse,
    BContainer,
    BDropdown,
    BDropdownItem,
    BForm,
    BFormCheckbox,
    BFormCheckboxGroup,
    BFormGroup,
    BFormInput,
    BFormRadioGroup,
    BFormSelect,
    BFormSelectOption,
    BFormTextarea,
    BModal,
    BNavbarToggle,
    BOverlay,
    BPagination,
    BRow,
    BTab,
    BTable,
    BTabs
  }
  Object.entries(bootstrapComponents).forEach(([name, comp]) => {
    app.component(name, comp)
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
