import Vue from 'vue'
import Vuex from 'vuex'
import axios from 'axios'
import VueCookies from 'vue-cookies'
Vue.use(Vuex)

const LOGIN_ENDPOINT = '/login'
const RESET_PASSWORD_ENDPOINT = '/resetPassword'
const CONFIRM_PASSWORD_CHANGE_ENDPOINT = '/confirmPasswordChange'
const NEW_USER_SIGNUP_ENDPOINT = '/newUserSignup'
const NEW_MEDIATOR_SIGNUP_ENDPOINT = '/newMediatorSignup'
const IS_EMAIL_EXIST_ENDPOINT = '/isEmailExist'
const LOGOUT_ENDPOINT = '/logout'
const GET_USER_DATA_ENDPOINT = '/getUserData'
const VERIFY_SIGNATURE_ENDPOINT = '/verify-signature'
const AVAILABLE_LANGUAGES_ENDPOINT = '/getAvailableLanguages'
const GET_INACTIVE_USERS_ENDPOINT = '/getInactiveUsers'
const GET_ACTIVE_USERS_ENDPOINT = '/getActiveUsers'
const UPDATE_INACTIVE_USER_ENDPOINT = '/updateInactiveUser'
const REFRESH_TOKEN_ENDPOINT = '/refresh-token'
const SAVE_NOTE_ENDPOINT = '/saveNote'
const GET_DASHBOARD_CONTENT_ENDPOINT = '/getDashboardContent'
const DELETE_NOTE_ENDPOINT = '/deleteNote'
const GET_EXISTING_USER_ENDPOINT = '/getExistingUser'
const GET_CALENDAR_INIT_ENDPOINT = '/getCalendarInit'
const NEW_CALENDAR_EVENT_ENDPOINT = '/newCalendarEvent'
const GET_MY_CASES_ENDPOINT = '/getMyCases'
const GET_MY_BLOGS_ENDPOINT = '/getMyBlogs'
const SAVE_BLOG_ENDPOINT = '/saveBlog'
const GET_BLOG_ASSETS = '/getBlogAssets'
const ACCEPT_MEDIATION_REQUEST = '/acceptMediationRequest'
const GOOGLE_AUTH_ENDPOINT = '/authenticateWithGoogle'
const SET_CLIENT_PAYMENT_ENDPOINT = '/setClientPayment'
const NEW_CASE_ENDPOINT = '/newCase'
const SUBMIT_SIGNATURE = '/submitSignature'
const GET_SIGNATURE_REQUEST_DETAILS = '/getSignatureRequestDetails'
const GET_AVAILABLE_MEDIATORS = '/getAvailableMediators'
const ASSIGN_MEDIATOR = '/assignMediator'
const SUBMIT_EVENT_FEEDBACK = '/submitEventFeedback'
const MARK_CASE_RESOLVED = '/markCaseResolved'
const UPDATE_USER_PROFILE = '/updateUserProfile'
const GET_MEDIATION_DATA = '/getMediationData'
const GET_AGREEMENT_DETAILS_FOR_SIGNATURE = '/getAgreementDetailsForSignature'
const SUBMIT_AGREEMENT_SIGNATURE = '/submitAgreementSignature'
const LIST_ALL_MEDIATORS_WITH_CASES = '/listAllMediatorsWithCases'
const debug = process.env.NODE_ENV !== 'production'
const getDefaultState = () => {
  return {
    loader: false,
    user: null,
    availableLanguages: null,
    availableStates: null,
    allLanguages: null,
    dashboardContent: null,
    userData: null,
    calendarInit: null
  }
}

const apiClient = axios.create({
  baseURL: '/api',
  timeout: 100000
})

const plugin = (router) => (store) => {
  store.$cookies = VueCookies
  store.$router = router
}

apiClient.interceptors.request.use((config) => {
  const excludedEndpoints = [LOGIN_ENDPOINT, GET_EXISTING_USER_ENDPOINT, RESET_PASSWORD_ENDPOINT, CONFIRM_PASSWORD_CHANGE_ENDPOINT, NEW_USER_SIGNUP_ENDPOINT, NEW_MEDIATOR_SIGNUP_ENDPOINT, IS_EMAIL_EXIST_ENDPOINT]
  const isExcluded = excludedEndpoints.some((endpoint) =>
    config.url.includes(endpoint)
  )
  if (!isExcluded) {
    const token = VueCookies.get('accessToken')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
  }
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response.data.errorCode === 'E102') {
      try {
        const { data } = await apiClient.post(REFRESH_TOKEN_ENDPOINT)
        VueCookies.set('accessToken', data.accessToken, '1d', '/', '', true, 'None')
        const originalRequest = error.config
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`
        return apiClient(originalRequest) // Retry the request
      } catch (error) {
        console.error('Refreshing tokens failed:', error)
        throw error
      }
    } else {
      return Promise.reject(error)
    }
  }
)

export default (router) => {
  const store = new Vuex.Store({
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
      setUserData (state, data) {
        state.userData = data
      },
      setCalendarInit (state, data) {
        state.calendarInit = data
      }
    },
    actions: {
      resetState ({ commit }) {
        commit('RESET_STATE')
      },
      updateLoader (context, payload) {
        context.commit('commitLoader', payload)
      },
      async login ({ commit }, { username, password }) {
        try {
          const { data } = await apiClient.post(LOGIN_ENDPOINT, { username, password })
          store.$cookies.set('accessToken', data.accessToken, '1d', '/', '', true, 'None')
          store.$router.push({ name: 'dashboard1.home' })
          return data
        } catch (error) {
          return error.response.data
        }
      },
      async resetPassword ({ commit }, { emailAddress }) {
        try {
          const { data } = await apiClient.post(RESET_PASSWORD_ENDPOINT, { emailAddress })
          return data
        } catch (error) {
          return error
        }
      },
      async updateUserProfile ({ commit }, { name, phone_number, profile_picture, password }) {
        try {
          const { data } = await apiClient.post(UPDATE_USER_PROFILE, { name, phone_number, profile_picture, password })
          return data
        } catch (error) {
          return error
        }
      },
      async getExistingUser ({ commit }, { token }) {
        try {
          const { data } = await apiClient.get(GET_EXISTING_USER_ENDPOINT, {
            headers: {
              'Authorization': token
            }
          })
          return data
        } catch (error) {
          return error
        }
      },
      async getAgreementDetailsForSignature ({ commit }, { requestId }) {
        try {
          const { data } = await apiClient.get(`${GET_AGREEMENT_DETAILS_FOR_SIGNATURE}?id=${encodeURIComponent(requestId)}`)
          return data
        } catch (error) {
          return error
        }
      },
      async logout ({ commit }) {
        try {
          const { data } = await apiClient.get(LOGOUT_ENDPOINT)
          return data
        } catch (error) {
          return error
        }
      },
      async LIST_ALL_MEDIATORS_WITH_CASES ({ commit }) {
        try {
          const { data } = await apiClient.get(LIST_ALL_MEDIATORS_WITH_CASES)
          return data
        } catch (error) {
          return error
        }
      },
      async confirmPasswordChange ({ commit }, { emailAddress, otp, password }) {
        try {
          const { data } = await apiClient.post(CONFIRM_PASSWORD_CHANGE_ENDPOINT, { emailAddress, otp, password })
          return data
        } catch (error) {
          return error
        }
      },
      async markCaseResolved ({ commit }, { caseId, resolveStatus, agreementText, signature }) {
        try {
          const { data } = await apiClient.post(MARK_CASE_RESOLVED, { caseId, resolveStatus, agreementText, signature })
          return data
        } catch (error) {
          return error
        }
      },
      async getMediationData ({ commit }, { caseId }) {
        try {
          const { data } = await apiClient.get(`${GET_MEDIATION_DATA}?caseId=${encodeURIComponent(caseId)}`)
          return data
        } catch (error) {
          return error
        }
      },
      async submitAgreementSignature ({ commit }, { signature, requestId }) {
        try {
          const { data } = await apiClient.post(SUBMIT_AGREEMENT_SIGNATURE, { signature, requestId })
          return data
        } catch (error) {
          return error
        }
      },
      async submitSignature ({ commit }, { signature, requestId }) {
        try {
          const { data } = await apiClient.post(SUBMIT_SIGNATURE, { signature, requestId })
          return data
        } catch (error) {
          return error
        }
      },
      async submitEventFeedback ({ commit }, { event_feedback, case_id, event_id }) {
        try {
          const { data } = await apiClient.post(SUBMIT_EVENT_FEEDBACK, { event_feedback, case_id, event_id })
          return data
        } catch (error) {
          return error
        }
      },
      async getSignatureRequestDetails ({ commit }, { requestId }) {
        try {
          const { data } = await apiClient.get(`${GET_SIGNATURE_REQUEST_DETAILS}?requestId=${encodeURIComponent(requestId)}`)
          return data
        } catch (error) {
          return error
        }
      },
      async verifySignature ({ commit }, { signature, userData }) {
        try {
          const { data } = await apiClient.post(VERIFY_SIGNATURE_ENDPOINT, { signature, userData })
          return data
        } catch (error) {
          return error
        }
      },
      async createNewCase ({ commit }, { caseData, userId }) {
        try {
          const { data } = await apiClient.post(NEW_CASE_ENDPOINT, { caseData, userId })
          return data
        } catch (error) {
          return error
        }
      },
      async acceptMediationRequest ({ commit }, { caseId }) {
        try {
          const { data } = await apiClient.post(ACCEPT_MEDIATION_REQUEST, { caseId })
          return data
        } catch (error) {
          return error
        }
      },
      async newUserSignup ({ commit }, { userDetails, existingUser }) {
        try {
          const { data } = await apiClient.post(NEW_USER_SIGNUP_ENDPOINT, { ...userDetails, existingUser })
          return data
        } catch (error) {
          return error
        }
      },
      async newMediatorSignup ({ commit }, { userDetails }) {
        try {
          const { data } = await apiClient.post(NEW_MEDIATOR_SIGNUP_ENDPOINT, { userDetails })
          return data
        } catch (error) {
          return error
        }
      },
      async saveNote ({ commit }, { content, id }) {
        try {
          const { data } = await apiClient.post(SAVE_NOTE_ENDPOINT, { content, id })
          return data
        } catch (error) {
          return error
        }
      },
      async setClientPayment ({ commit }, { payload }) {
        try {
          const { data } = await apiClient.post(SET_CLIENT_PAYMENT_ENDPOINT, { ...payload })
          return data
        } catch (error) {
          return error
        }
      },
      async assignMediator ({ commit }, { caseId, mediatorId }) {
        try {
          const { data } = await apiClient.post(ASSIGN_MEDIATOR, { caseId, mediatorId })
          return data
        } catch (error) {
          return error
        }
      },
      async getAvailableMediators ({ commit }, { caseId }) {
        try {
          const { data } = await apiClient.get(`${GET_AVAILABLE_MEDIATORS}?caseId=${encodeURIComponent(caseId)}`)
          return data
        } catch (error) {
          return error
        }
      },
      async googleAuth ({ commit }) {
        try {
          const { data } = await apiClient.get(GOOGLE_AUTH_ENDPOINT)
          return data
        } catch (error) {
          return error
        }
      },
      async newCalendarEvent ({ commit }, { event }) {
        try {
          const { data } = await apiClient.post(NEW_CALENDAR_EVENT_ENDPOINT, { ...event })
          return data
        } catch (error) {
          return error
        }
      },

      async getUserData ({ state, commit }) {
        try {
          if (state.userData) {
            return state.userData
          }
          const { data } = await apiClient.get(GET_USER_DATA_ENDPOINT)
          commit('setUserData', data)
          return data
        } catch (error) {
          return error
        }
      },
      async getDashboardContent ({ state, commit }) {
        try {
          if (state.dashboardContent) {
            return state.dashboardContent
          }
          const { data } = await apiClient.get(GET_DASHBOARD_CONTENT_ENDPOINT)
          commit('setDashboardContent', data)
          return data
        } catch (error) {
          return error
        }
      },
      async deleteNote ({ commit }, { id }) {
        try {
          const { data } = await apiClient.post(DELETE_NOTE_ENDPOINT, { id })
          return data
        } catch (error) {
          return error
        }
      },
      async updateInactiveUsers ({ commit }, { isActive, caseId, userId, caseType }) {
        try {
          const { data } = await apiClient.post(UPDATE_INACTIVE_USER_ENDPOINT, { isActive, caseId, userId, caseType })
          return data
        } catch (error) {
          return error
        }
      },
      async isEmailExist ({ commit }, { emailAddress }) {
        try {
          const { data } = await apiClient.get(`${IS_EMAIL_EXIST_ENDPOINT}?email=${encodeURIComponent(emailAddress)}`)
          return data
        } catch (error) {
          return error
        }
      },
      async getCalendarInit ({ commit, state }, { skipCache }) {
        try {
          if (!skipCache && state.calendarInit) {
            return state.calendarInit
          }
          const { data } = await apiClient.get(`${GET_CALENDAR_INIT_ENDPOINT}`)
          commit('setCalendarInit', data)
          return data
        } catch (error) {
          return error
        }
      },
      async getInactiveUsers ({ commit }, { page, type }) {
        try {
          const { data } = await apiClient.get(`${GET_INACTIVE_USERS_ENDPOINT}?page=${encodeURIComponent(page)}&type=${encodeURIComponent(type)}`)
          return data
        } catch (error) {
          return error
        }
      },
      async getActiveUsers ({ commit }, { page, type }) {
        try {
          const params = type ? `?page=${encodeURIComponent(page)}&type=${encodeURIComponent(type)}` : `?page=${encodeURIComponent(page)}`
          const { data } = await apiClient.get(`${GET_ACTIVE_USERS_ENDPOINT}${params}`)
          return data
        } catch (error) {
          return error
        }
      },
      async getMyCases ({ commit }, { page }) {
        try {
          const { data } = await apiClient.get(`${GET_MY_CASES_ENDPOINT}?page=${encodeURIComponent(page)}`)
          return data
        } catch (error) {
          return error
        }
      },
      async getMyBlogs ({ commit }, { page }) {
        try {
          const { data } = await apiClient.get(`${GET_MY_BLOGS_ENDPOINT}?page=${encodeURIComponent(page)}`)
          return data
        } catch (error) {
          return error
        }
      },
      async getBlogAssets ({ commit }) {
        try {
          const { data } = await apiClient.get(GET_BLOG_ASSETS)
          return data
        } catch (error) {
          return error
        }
      },
      async saveBlog  ({ commit }, { blog, status }) {
        try {
          const { data } = await apiClient.post(SAVE_BLOG_ENDPOINT, { blog, status })
          return data
        } catch (error) {
          return error
        }
      },
      async getAllLanguages ({ state, commit }) {
        try {
          if (state.allLanguages) {
            return state.allLanguages
          }
          const response = await fetch('/languages.json')
          if (!response.ok) {
            return {
              'errorCode': 'E256',
              'message': 'Network response was not ok'
            }
          }
          const jsonData = await response.json()
          commit('setAllLanguages', jsonData)
          return jsonData
        } catch (error) {
          return error
        }
      },
      async getAvailableLanguages ({ state, commit }) {
        try {
          if (state.availableLanguages) {
            return state.availableLanguages
          }

          const { data } = await apiClient.get(AVAILABLE_LANGUAGES_ENDPOINT)
          commit('setAvailableLanguages', data)
          return data
        } catch (error) {
          return error
        }
      },
      async getStates ({ state, commit }) {
        try {
          if (state.availableStates) {
            return state.availableStates
          }
          const response = await fetch('/states.json')
          if (!response.ok) {
            return {
              'errorCode': 'E256',
              'message': 'Network response was not ok'
            }
          }
          const jsonData = await response.json()
          commit('setAvailableStates', jsonData)
          return jsonData
        } catch (error) {
          return error
        }
      }
    },
    getters: {
      loader: state => state.loader,
      user: (state) => state.user,
      availableLanguages: (state) => state.availableLanguages,
      availableStates: (state) => state.availableStates,
      allLanguages: (state) => state.allLanguages,
      dashboardContent: (state) => state.dashboardContent,
      calendarInit: (state) => state.calendarInit
    },
    strict: debug,
    plugins: [plugin(router)]
  })
  return store
}
