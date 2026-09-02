import { createStore } from 'vuex'
import VueCookies from 'vue-cookies'
import { hasUnlockedFeature } from '../utils/mediatorEntitlements'
import { debug, getDefaultState } from './helpers'
import alert from './alertStore'
import spinner from './spinnerStore'
import auth from './modules/auth'
import user from './modules/user'
import cases from './modules/cases'
import signatures from './modules/signatures'
import notes from './modules/notes'
import dashboard from './modules/dashboard'
import calendar from './modules/calendar'
import payments from './modules/payments'
import mediator from './modules/mediator'
import finance from './modules/finance'
import blogs from './modules/blogs'
import reference from './modules/reference'
import admin from './modules/admin'
import correspondence from './modules/correspondence'
import push from './modules/push'

const plugin = (router) => (store) => {
  store.$cookies = VueCookies
  store.$router = router
}

export default (router) => {
  const store = createStore({
    modules: {
      alert,
      spinner,
      auth,
      user,
      cases,
      signatures,
      notes,
      dashboard,
      calendar,
      payments,
      mediator,
      finance,
      blogs,
      reference,
      admin,
      correspondence,
      push
    },
    state: getDefaultState(),
    mutations: {
      RESET_STATE (state) {
        Object.assign(state, getDefaultState())
      },
      commitLoader (state, data) {
        state.loader = data
      },
      setUser (state, user) {
        state.user = user
      },
      setAvailableLanguages (state, data) {
        state.availableLanguages = data
      },
      setAvailableStates (state, data) {
        state.availableStates = data
      },
      setAllLanguages (state, data) {
        state.allLanguages = data
      },
      setDashboardContent (state, data) {
        state.dashboardContent = data
      },
      setCalendarInit (state, data) {
        state.calendarInit = data
      },
      invalidateDashboardCaches (state) {
        state.dashboardContent = null
        state.calendarInit = null
      },
      setMediatorSubscription (state, { tier, features }) {
        state.mediatorSubscriptionTier = tier || 'FREE'
        state.mediatorFeatures = Array.isArray(features) ? features : []
      },
      clearMediatorSubscription (state) {
        state.mediatorSubscriptionTier = 'FREE'
        state.mediatorFeatures = []
      }
    },
    actions: {
      resetState ({ commit }) {
        commit('RESET_STATE')
      }
    },
    getters: {
      loader: state => state.loader,
      user: (state) => state.user,
      availableLanguages: (state) => state.availableLanguages,
      availableStates: (state) => state.availableStates,
      allLanguages: (state) => state.allLanguages,
      dashboardContent: (state) => state.dashboardContent,
      calendarInit: (state) => state.calendarInit,
      mediatorFeatures: (state) => state.mediatorFeatures,
      mediatorSubscriptionTier: (state) => state.mediatorSubscriptionTier,
      isMediatorPro: (state) => state.mediatorSubscriptionTier === 'PRO',
      mediatorHasFeature: (state) => (featureKey) => hasUnlockedFeature(state.mediatorFeatures, featureKey)
    },
    strict: debug,
    plugins: [plugin(router)]
  })
  return store
}
