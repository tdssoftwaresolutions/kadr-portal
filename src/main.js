import 'mutationobserver-shim'
import Vue from 'vue'
import './plugins/bootstrap-vue'
import { VuejsDatatableFactory } from 'vuejs-datatable'
import App from './App.vue'
import router from './router'
import createStore from './store'
import _ from 'lodash'
import HighchartsVue from 'highcharts-vue'
import VueCookies from 'vue-cookies'
import VueScrollProgressBar from '@guillaumebriday/vue-scroll-progress-bar'
import VueSignaturePad from 'vue-signature-pad'

Vue.use(VueSignaturePad)

const components = require.context('./components/sofbox')
_.forEach(components.keys(), (fileName) => {
  const componentConfig = components(fileName)
  const componentName = fileName.split('/').pop().split('.')[0]
  Vue.component(componentName, componentConfig.default || componentConfig)
})

Vue.filter('reverse', function (value) {
  // slice to make a copy of array, then reverse the copy
  return value.slice().reverse()
})
Vue.use(HighchartsVue)

Vue.use(VueScrollProgressBar)
Vue.use(VueCookies)

Vue.config.productionTip = false

Vue.use(VuejsDatatableFactory)

const store = createStore(router)
console.log('Vue app is mounting...')
const vm = new Vue({
  router,
  store,
  render: h => h(App)
}).$mount('#app')

window.vm = vm
