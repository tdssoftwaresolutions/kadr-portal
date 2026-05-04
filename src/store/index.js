import Vue from 'vue'
import Vuex from 'vuex'
import axios from 'axios'
import VueCookies from 'vue-cookies'
import alert from './alertStore'
import spinner from './spinnerStore'
Vue.use(Vuex)

const LOGIN_ENDPOINT = '/login'
const RESET_PASSWORD_ENDPOINT = '/resetPassword'
const CONFIRM_PASSWORD_CHANGE_ENDPOINT = '/confirmPasswordChange'
const NEW_USER_SIGNUP_ENDPOINT = '/newUserSignup'
const NEW_MEDIATOR_SIGNUP_ENDPOINT = '/newMediatorSignup'
const IS_EMAIL_EXIST_ENDPOINT = '/isEmailExist'
const LOGOUT_ENDPOINT = '/logout'
const GET_USER_DATA_ENDPOINT = '/getUserData'
const MARK_CASE_RESOLVED = '/markCaseResolved'
const SUBMIT_SIGNATURE = '/submitSignature'
const GET_SIGNATURE_REQUEST_DETAILS = '/getSignatureRequestDetails'
const VERIFY_SIGNATURE_ENDPOINT = '/verify-signature'
const AVAILABLE_LANGUAGES_ENDPOINT = '/getAvailableLanguages'
const GET_INACTIVE_USERS_ENDPOINT = '/getInactiveUsers'
const GET_ACTIVE_USERS_ENDPOINT = '/getActiveUsers'
const GET_ADMIN_ACTIVE_CASES_ENDPOINT = '/activeCases'
const GET_ADMIN_CASE_META_ENDPOINT = '/caseManagementMeta'
const POST_ADMIN_ASSIGN_CASE_MEDIATOR_ENDPOINT = '/assignCaseMediator'
const UPDATE_INACTIVE_USER_ENDPOINT = '/updateInactiveUser'
const REFRESH_TOKEN_ENDPOINT = '/refresh-token'
const SAVE_NOTE_ENDPOINT = '/saveNote'
const SUBMIT_AGREEMENT_SIGNATURE = '/submitAgreementSignature'
const GET_DASHBOARD_CONTENT_ENDPOINT = '/getDashboardContent'
const DELETE_NOTE_ENDPOINT = '/deleteNote'
const GET_AGREEMENT_DETAILS_FOR_SIGNATURE = '/getAgreementDetailsForSignature'
const GET_EXISTING_USER_ENDPOINT = '/getExistingUser'
const UPDATE_USER_PROFILE = '/updateUserProfile'
const GET_CALENDAR_INIT_ENDPOINT = '/getCalendarInit'
const NEW_CALENDAR_EVENT_ENDPOINT = '/newCalendarEvent'
const GET_MY_CASES_ENDPOINT = '/getMyCases'
const GET_MY_BLOGS_ENDPOINT = '/getMyBlogs'
const SAVE_BLOG_ENDPOINT = '/saveBlog'
const DELETE_BLOG_ENDPOINT = '/deleteBlog'
const GET_BLOG_ASSETS = '/getBlogAssets'
const GET_MY_VIDEO_REELS_ENDPOINT = '/getMyVideoReels'
const SAVE_VIDEO_REEL_ENDPOINT = '/saveVideoReel'
const DELETE_VIDEO_REEL_ENDPOINT = '/deleteVideoReel'
const ACCEPT_MEDIATION_REQUEST = '/acceptMediationRequest'
const GOOGLE_AUTH_ENDPOINT = '/authenticateWithGoogle'
const GOOGLE_TOKEN_ENDPOINT = '/getGoogleToken'
const SET_CLIENT_PAYMENT_ENDPOINT = '/setClientPayment'
const SUBMIT_EVENT_FEEDBACK_ENDPOINT = '/submitEventFeedback'
const SEND_OTP = '/sendOtp'
const VERIFY_OTP = '/verifyOTP'
const debug = process.env.NODE_ENV !== 'production'
const getDefaultState = () => {
  return {
    loader: false,
    user: null,
    availableLanguages: null,
    availableStates: null,
    allLanguages: null,
    dashboardContent: null,
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
    modules: {
      alert,
      spinner
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
      }
    },
    actions: {
      resetState ({ commit }) {
        commit('RESET_STATE')
      },
      updateLoader (context, payload) {
        context.commit('commitLoader', payload)
      },
      async login ({ commit, dispatch }, { username, password }) {
        try {
          dispatch('spinner/showSpinner')
          const { data } = await apiClient.post(LOGIN_ENDPOINT, { username, password })
          if (!data.success) throw new Error(data.error.message)
          store.$cookies.set('accessToken', data.data.accessToken, '1d', '/', '', true, 'None')
          store.$router.push({ name: 'dashboard.home' })
          return data
        } catch (error) {
          const msg = error.response?.data?.error?.message || error.message || 'Something went wrong'
          dispatch('alert/showAlert', { message: msg, type: 'danger' }, { root: true })
          return {
            success: false,
            error
          }
        } finally {
          dispatch('spinner/hideSpinner')
        }
      },

      async sendOtp ({ commit, dispatch }, { recordId }) {
        try {
          dispatch('spinner/showSpinner')
          const { data } = await apiClient.post(SEND_OTP, { id: recordId })
          if (!data.success) throw new Error(data.error.message)
          return data
        } catch (error) {
          const msg = error.response?.data?.error?.message || error.message || 'Something went wrong'
          dispatch('alert/showAlert', { message: msg, type: 'danger' }, { root: true })
          return {
            success: false,
            error
          }
        } finally {
          dispatch('spinner/hideSpinner')
        }
      },
      async verifyOtp ({ commit, dispatch }, { requestId, otp }) {
        try {
          dispatch('spinner/showSpinner')
          const { data } = await apiClient.post(VERIFY_OTP, { requestId, otp })
          if (!data.success) throw new Error(data.error.message)
          return data
        } catch (error) {
          const msg = error.response?.data?.error?.message || error.message || 'Something went wrong'
          dispatch('alert/showAlert', { message: msg, type: 'danger' }, { root: true })
          return {
            success: false,
            error
          }
        } finally {
          dispatch('spinner/hideSpinner')
        }
      },
      async getAgreementDetailsForSignature ({ commit, dispatch }, { requestId }) {
        try {
          dispatch('spinner/showSpinner')
          const { data } = await apiClient.get(`${GET_AGREEMENT_DETAILS_FOR_SIGNATURE}?id=${encodeURIComponent(requestId)}`)
          if (!data.success) throw new Error(data.error.message)
          return data
        } catch (error) {
          const msg = error.response?.data?.error?.message || error.message || 'Something went wrong'
          dispatch('alert/showAlert', { message: msg, type: 'danger' }, { root: true })
          return {
            success: false,
            error
          }
        } finally {
          dispatch('spinner/hideSpinner')
        }
      },
      async resetPassword ({ commit, dispatch }, { emailAddress }) {
        try {
          dispatch('spinner/showSpinner')
          const { data } = await apiClient.post(RESET_PASSWORD_ENDPOINT, { emailAddress })
          if (!data.success) throw new Error(data.error.message)
          return data
        } catch (error) {
          const msg = error.response?.data?.error?.message || error.message || 'Something went wrong'
          dispatch('alert/showAlert', { message: msg, type: 'danger' }, { root: true })
          return {
            success: false,
            error
          }
        } finally {
          dispatch('spinner/hideSpinner')
        }
      },
      async getGoogleAccessToken ({ commit, dispatch }) {
        try {
          dispatch('spinner/showSpinner')
          const { data } = await apiClient.get(GOOGLE_TOKEN_ENDPOINT)
          if (!data.success) throw new Error(data.error.message)
          return data
        } catch (error) {
          const msg = error.response?.data?.error?.message || error.message || 'Something went wrong'
          dispatch('alert/showAlert', { message: msg, type: 'danger' }, { root: true })
          return {
            success: false,
            error
          }
        } finally {
          dispatch('spinner/hideSpinner')
        }
      },
      async getExistingUser ({ commit, dispatch }, { token }) {
        try {
          dispatch('spinner/showSpinner')
          const { data } = await apiClient.get(GET_EXISTING_USER_ENDPOINT, {
            headers: {
              'Authorization': token
            }
          })
          if (!data.success) throw new Error(data.error.message)
          return data
        } catch (error) {
          const msg = error.response?.data?.error?.message || error.message || 'Something went wrong'
          dispatch('alert/showAlert', { message: msg, type: 'danger' }, { root: true })
          return {
            success: false,
            error
          }
        } finally {
          dispatch('spinner/hideSpinner')
        }
      },
      async markCaseResolved ({ commit, dispatch }, { caseId, resolveStatus, agreementText, signature }) {
        try {
          dispatch('spinner/showSpinner')
          const { data } = await apiClient.post(MARK_CASE_RESOLVED, { caseId, resolveStatus, agreementText, signature })
          if (!data.success) throw new Error(data.error.message)
          return data
        } catch (error) {
          const msg = error.response?.data?.error?.message || error.message || 'Something went wrong'
          dispatch('alert/showAlert', { message: msg, type: 'danger' }, { root: true })
          return {
            success: false,
            error
          }
        } finally {
          dispatch('spinner/hideSpinner')
        }
      },
      async logout ({ commit, dispatch }) {
        try {
          dispatch('spinner/showSpinner')
          const { data } = await apiClient.get(LOGOUT_ENDPOINT)
          return data
        } catch (error) {
          const msg = error.response?.data?.error?.message || error.message || 'Something went wrong'
          dispatch('alert/showAlert', { message: msg, type: 'danger' }, { root: true })
          return {
            success: false,
            error
          }
        } finally {
          dispatch('spinner/hideSpinner')
        }
      },
      async updateUserProfile ({ commit, dispatch }, { name, phone_number, profile_picture, password }) {
        try {
          dispatch('spinner/showSpinner')
          const { data } = await apiClient.post(UPDATE_USER_PROFILE, { name, phone_number, profile_picture, password })
          if (!data.success) throw new Error(data.error.message)
          return data
        } catch (error) {
          const msg = error.response?.data?.error?.message || error.message || 'Something went wrong'
          dispatch('alert/showAlert', { message: msg, type: 'danger' }, { root: true })
          return {
            success: false,
            error
          }
        } finally {
          dispatch('spinner/hideSpinner')
        }
      },
      async confirmPasswordChange ({ commit, dispatch }, { emailAddress, otp, password }) {
        try {
          dispatch('spinner/showSpinner')
          const { data } = await apiClient.post(CONFIRM_PASSWORD_CHANGE_ENDPOINT, { emailAddress, otp, password })
          if (!data.success) throw new Error(data.error.message)
          return data
        } catch (error) {
          const msg = error.response?.data?.error?.message || error.message || 'Something went wrong'
          dispatch('alert/showAlert', { message: msg, type: 'danger' }, { root: true })
          return {
            success: false,
            error
          }
        } finally {
          dispatch('spinner/hideSpinner')
        }
      },
      async verifySignature ({ commit, dispatch }, { signature, userData }) {
        try {
          dispatch('spinner/showSpinner')
          const { data } = await apiClient.post(VERIFY_SIGNATURE_ENDPOINT, { signature, userData })
          if (!data.success) throw new Error(data.error.message)
          return data
        } catch (error) {
          const msg = error.response?.data?.error?.message || error.message || 'Something went wrong'
          dispatch('alert/showAlert', { message: msg, type: 'danger' }, { root: true })
          return {
            success: false,
            error
          }
        } finally {
          dispatch('spinner/hideSpinner')
        }
      },
      async acceptMediationRequest ({ commit, dispatch }, { caseId }) {
        try {
          dispatch('spinner/showSpinner')
          const { data } = await apiClient.post(ACCEPT_MEDIATION_REQUEST, { caseId })
          if (!data.success) throw new Error(data.error.message)
          return data
        } catch (error) {
          const msg = error.response?.data?.error?.message || error.message || 'Something went wrong'
          dispatch('alert/showAlert', { message: msg, type: 'danger' }, { root: true })
          return {
            success: false,
            error
          }
        } finally {
          dispatch('spinner/hideSpinner')
        }
      },
      async newUserSignup ({ commit, dispatch }, { userDetails, existingUser }) {
        try {
          dispatch('spinner/showSpinner')
          const { data } = await apiClient.post(NEW_USER_SIGNUP_ENDPOINT, { ...userDetails, existingUser })
          if (!data.success) throw new Error(data.error.message)
          return data
        } catch (error) {
          const msg = error.response?.data?.error?.message || error.message || 'Something went wrong'
          dispatch('alert/showAlert', { message: msg, type: 'danger' }, { root: true })
          return {
            success: false,
            error
          }
        } finally {
          dispatch('spinner/hideSpinner')
        }
      },
      async newMediatorSignup ({ commit, dispatch }, { userDetails }) {
        try {
          dispatch('spinner/showSpinner')
          const { data } = await apiClient.post(NEW_MEDIATOR_SIGNUP_ENDPOINT, { userDetails })
          if (!data.success) throw new Error(data.error.message)
          return data
        } catch (error) {
          const msg = error.response?.data?.error?.message || error.message || 'Something went wrong'
          dispatch('alert/showAlert', { message: msg, type: 'danger' }, { root: true })
          return {
            success: false,
            error
          }
        } finally {
          dispatch('spinner/hideSpinner')
        }
      },
      async saveNote ({ commit, dispatch }, { content, id }) {
        try {
          dispatch('spinner/showSpinner')
          const { data } = await apiClient.post(SAVE_NOTE_ENDPOINT, { content, id })
          if (!data.success) throw new Error(data.error.message)
          return data
        } catch (error) {
          const msg = error.response?.data?.error?.message || error.message || 'Something went wrong'
          dispatch('alert/showAlert', { message: msg, type: 'danger' }, { root: true })
          return {
            success: false,
            error
          }
        } finally {
          dispatch('spinner/hideSpinner')
        }
      },
      async setClientPayment ({ commit, dispatch }, { payload }) {
        try {
          dispatch('spinner/showSpinner')
          const { data } = await apiClient.post(SET_CLIENT_PAYMENT_ENDPOINT, { ...payload })
          if (!data.success) throw new Error(data.error.message)
          return data
        } catch (error) {
          const msg = error.response?.data?.error?.message || error.message || 'Something went wrong'
          dispatch('alert/showAlert', { message: msg, type: 'danger' }, { root: true })
          return {
            success: false,
            error
          }
        } finally {
          dispatch('spinner/hideSpinner')
        }
      },
      async googleAuth ({ commit, dispatch }) {
        try {
          dispatch('spinner/showSpinner')
          const { data } = await apiClient.get(GOOGLE_AUTH_ENDPOINT)
          if (!data.success) throw new Error(data.error.message)
          return data
        } catch (error) {
          const msg = error.response?.data?.error?.message || error.message || 'Something went wrong'
          dispatch('alert/showAlert', { message: msg, type: 'danger' }, { root: true })
          return {
            success: false,
            error
          }
        } finally {
          dispatch('spinner/hideSpinner')
        }
      },
      async newCalendarEvent ({ commit, dispatch }, { event }) {
        try {
          dispatch('spinner/showSpinner')
          const { data } = await apiClient.post(NEW_CALENDAR_EVENT_ENDPOINT, { ...event })
          if (!data.success) throw new Error(data.error.message)
          return data
        } catch (error) {
          const msg = error.response?.data?.error?.message || error.message || 'Something went wrong'
          dispatch('alert/showAlert', { message: msg, type: 'danger' }, { root: true })
          return {
            success: false,
            error
          }
        } finally {
          dispatch('spinner/hideSpinner')
        }
      },
      async submitAgreementSignature ({ commit, dispatch }, { signature, requestId }) {
        try {
          dispatch('spinner/showSpinner')
          const { data } = await apiClient.post(SUBMIT_AGREEMENT_SIGNATURE, { signature, requestId })
          if (!data.success) throw new Error(data.error.message)
          return data
        } catch (error) {
          const msg = error.response?.data?.error?.message || error.message || 'Something went wrong'
          dispatch('alert/showAlert', { message: msg, type: 'danger' }, { root: true })
          return {
            success: false,
            error
          }
        } finally {
          dispatch('spinner/hideSpinner')
        }
      },
      async submitSignature ({ commit, dispatch }, { signature, requestId }) {
        try {
          dispatch('spinner/showSpinner')
          const { data } = await apiClient.post(SUBMIT_SIGNATURE, { signature, requestId })
          if (!data.success) throw new Error(data.error.message)
          return data
        } catch (error) {
          const msg = error.response?.data?.error?.message || error.message || 'Something went wrong'
          dispatch('alert/showAlert', { message: msg, type: 'danger' }, { root: true })
          return {
            success: false,
            error
          }
        } finally {
          dispatch('spinner/hideSpinner')
        }
      },
      async getSignatureRequestDetails ({ commit, dispatch }, { requestId }) {
        try {
          dispatch('spinner/showSpinner')
          const { data } = await apiClient.get(`${GET_SIGNATURE_REQUEST_DETAILS}?requestId=${encodeURIComponent(requestId)}`)
          if (!data.success) throw new Error(data.error.message)
          return data
        } catch (error) {
          const msg = error.response?.data?.error?.message || error.message || 'Something went wrong'
          dispatch('alert/showAlert', { message: msg, type: 'danger' }, { root: true })
          return {
            success: false,
            error
          }
        } finally {
          dispatch('spinner/hideSpinner')
        }
      },
      async submitMeetingFeedback ({ dispatch }, payload) {
        try {
          dispatch('spinner/showSpinner')
          const { data } = await apiClient.post(SUBMIT_EVENT_FEEDBACK_ENDPOINT, payload)
          if (!data.success) throw new Error(data.error.message)
          return data
        } catch (error) {
          const msg = error.response?.data?.error?.message || error.message || 'Something went wrong'
          dispatch('alert/showAlert', { message: msg, type: 'danger' }, { root: true })
          return {
            success: false,
            error
          }
        } finally {
          dispatch('spinner/hideSpinner')
        }
      },

      async getUserData ({ commit, dispatch }) {
        try {
          dispatch('spinner/showSpinner')
          const { data } = await apiClient.get(GET_USER_DATA_ENDPOINT)
          if (!data.success) throw new Error(data.error.message)
          return data
        } catch (error) {
          const msg = error.response?.data?.error?.message || error.message || 'Something went wrong'
          dispatch('alert/showAlert', { message: msg, type: 'danger' }, { root: true })
          return {
            success: false,
            error
          }
        } finally {
          dispatch('spinner/hideSpinner')
        }
      },
      async getDashboardContent ({ state, commit, dispatch }, { force = false } = {}) {
        try {
          dispatch('spinner/showSpinner')
          if (!force && state.dashboardContent) return state.dashboardContent
          const { data } = await apiClient.get(GET_DASHBOARD_CONTENT_ENDPOINT)
          if (!data.success) throw new Error(data.error.message)
          commit('setDashboardContent', data)
          return data
        } catch (error) {
          const msg = error.response?.data?.error?.message || error.message || 'Something went wrong'
          dispatch('alert/showAlert', { message: msg, type: 'danger' }, { root: true })
          return {
            success: false,
            error
          }
        } finally {
          dispatch('spinner/hideSpinner')
        }
      },
      async deleteNote ({ commit, dispatch }, { id }) {
        try {
          dispatch('spinner/showSpinner')
          const { data } = await apiClient.post(DELETE_NOTE_ENDPOINT, { id })
          if (!data.success) throw new Error(data.error.message)
          return data
        } catch (error) {
          const msg = error.response?.data?.error?.message || error.message || 'Something went wrong'
          dispatch('alert/showAlert', { message: msg, type: 'danger' }, { root: true })
          return {
            success: false,
            error
          }
        } finally {
          dispatch('spinner/hideSpinner')
        }
      },
      async updateInactiveUsers ({ commit, dispatch }, { isActive, caseId, userId, caseType }) {
        try {
          dispatch('spinner/showSpinner')
          const { data } = await apiClient.post(UPDATE_INACTIVE_USER_ENDPOINT, { isActive, caseId, userId, caseType })
          if (!data.success) throw new Error(data.error.message)
          return data
        } catch (error) {
          const msg = error.response?.data?.error?.message || error.message || 'Something went wrong'
          dispatch('alert/showAlert', { message: msg, type: 'danger' }, { root: true })
          return {
            success: false,
            error
          }
        } finally {
          dispatch('spinner/hideSpinner')
        }
      },
      async isEmailExist ({ commit, dispatch }, { emailAddress }) {
        try {
          dispatch('spinner/showSpinner')
          const { data } = await apiClient.get(`${IS_EMAIL_EXIST_ENDPOINT}?email=${encodeURIComponent(emailAddress)}`)
          if (!data.success) throw new Error(data.error.message)
          return data
        } catch (error) {
          const msg = error.response?.data?.error?.message || error.message || 'Something went wrong'
          dispatch('alert/showAlert', { message: msg, type: 'danger' }, { root: true })
          return {
            success: false,
            error
          }
        } finally {
          dispatch('spinner/hideSpinner')
        }
      },
      async getCalendarInit ({ commit, state, dispatch }, { skipCache }) {
        try {
          dispatch('spinner/showSpinner')
          if (!skipCache && state.calendarInit) {
            return state.calendarInit
          }
          const { data } = await apiClient.get(`${GET_CALENDAR_INIT_ENDPOINT}`)
          if (!data.success) throw new Error(data.error.message)
          commit('setCalendarInit', data)
          return data
        } catch (error) {
          const msg = error.response?.data?.error?.message || error.message || 'Something went wrong'
          dispatch('alert/showAlert', { message: msg, type: 'danger' }, { root: true })
          return {
            success: false,
            error
          }
        } finally {
          dispatch('spinner/hideSpinner')
        }
      },
      async getInactiveUsers ({ commit, dispatch }, { page, type }) {
        try {
          dispatch('spinner/showSpinner')
          const { data } = await apiClient.get(`${GET_INACTIVE_USERS_ENDPOINT}?page=${encodeURIComponent(page)}&type=${encodeURIComponent(type)}`)
          if (!data.success) throw new Error(data.error.message)
          return data
        } catch (error) {
          const msg = error.response?.data?.error?.message || error.message || 'Something went wrong'
          dispatch('alert/showAlert', { message: msg, type: 'danger' }, { root: true })
          return {
            success: false,
            error
          }
        } finally {
          dispatch('spinner/hideSpinner')
        }
      },
      async getActiveUsers ({ commit, dispatch }, { page, type }) {
        try {
          dispatch('spinner/showSpinner')
          const params = type ? `?page=${encodeURIComponent(page)}&type=${encodeURIComponent(type)}` : `?page=${encodeURIComponent(page)}`
          const { data } = await apiClient.get(`${GET_ACTIVE_USERS_ENDPOINT}${params}`)
          if (!data.success) throw new Error(data.error.message)
          return data
        } catch (error) {
          const msg = error.response?.data?.error?.message || error.message || 'Something went wrong'
          dispatch('alert/showAlert', { message: msg, type: 'danger' }, { root: true })
          return {
            success: false,
            error
          }
        } finally {
          dispatch('spinner/hideSpinner')
        }
      },
      async getMyCases ({ commit, dispatch }, { page }) {
        try {
          dispatch('spinner/showSpinner')
          const { data } = await apiClient.get(`${GET_MY_CASES_ENDPOINT}?page=${encodeURIComponent(page)}`)
          if (!data.success) throw new Error(data.error.message)
          return data
        } catch (error) {
          const msg = error.response?.data?.error?.message || error.message || 'Something went wrong'
          dispatch('alert/showAlert', { message: msg, type: 'danger' }, { root: true })
          return {
            success: false,
            error
          }
        } finally {
          dispatch('spinner/hideSpinner')
        }
      },
      async getMyBlogs ({ commit, dispatch }, { page }) {
        try {
          dispatch('spinner/showSpinner')
          const { data } = await apiClient.get(`${GET_MY_BLOGS_ENDPOINT}?page=${encodeURIComponent(page)}`)
          if (!data.success) throw new Error(data.error.message)
          return data
        } catch (error) {
          const msg = error.response?.data?.error?.message || error.message || 'Something went wrong'
          dispatch('alert/showAlert', { message: msg, type: 'danger' }, { root: true })
          return {
            success: false,
            error
          }
        } finally {
          dispatch('spinner/hideSpinner')
        }
      },
      async getBlogAssets ({ commit, dispatch }) {
        try {
          dispatch('spinner/showSpinner')
          const { data } = await apiClient.get(GET_BLOG_ASSETS)
          if (!data.success) throw new Error(data.error.message)
          return data
        } catch (error) {
          const msg = error.response?.data?.error?.message || error.message || 'Something went wrong'
          dispatch('alert/showAlert', { message: msg, type: 'danger' }, { root: true })
          return {
            success: false,
            error
          }
        } finally {
          dispatch('spinner/hideSpinner')
        }
      },
      async saveBlog  ({ commit, dispatch }, { blog, status }) {
        try {
          dispatch('spinner/showSpinner')
          const { data } = await apiClient.post(SAVE_BLOG_ENDPOINT, { blog, status })
          if (!data.success) throw new Error(data.error.message)
          return data
        } catch (error) {
          const msg = error.response?.data?.error?.message || error.message || 'Something went wrong'
          dispatch('alert/showAlert', { message: msg, type: 'danger' }, { root: true })
          return {
            success: false,
            error
          }
        } finally {
          dispatch('spinner/hideSpinner')
        }
      },
      async deleteBlog ({ commit, dispatch }, blogId) {
        try {
          dispatch('spinner/showSpinner')
          const { data } = await apiClient.delete(`${DELETE_BLOG_ENDPOINT}/${blogId}`)
          if (!data.success) throw new Error(data.error.message)
          return data
        } catch (error) {
          const msg = error.response?.data?.error?.message || error.message || 'Something went wrong'
          dispatch('alert/showAlert', { message: msg, type: 'danger' }, { root: true })
          return {
            success: false,
            error
          }
        } finally {
          dispatch('spinner/hideSpinner')
        }
      },
      async getMyVideoReels ({ commit, dispatch }, { page }) {
        try {
          dispatch('spinner/showSpinner')
          const { data } = await apiClient.get(`${GET_MY_VIDEO_REELS_ENDPOINT}?page=${encodeURIComponent(page)}`)
          if (!data.success) throw new Error(data.error.message)
          return data
        } catch (error) {
          const msg = error.response?.data?.error?.message || error.message || 'Something went wrong'
          dispatch('alert/showAlert', { message: msg, type: 'danger' }, { root: true })
          return {
            success: false,
            error
          }
        } finally {
          dispatch('spinner/hideSpinner')
        }
      },
      async saveVideoReel ({ commit, dispatch }, { reel }) {
        try {
          dispatch('spinner/showSpinner')
          const { data } = await apiClient.post(SAVE_VIDEO_REEL_ENDPOINT, { reel })
          if (!data.success) throw new Error(data.error.message)
          return data
        } catch (error) {
          const msg = error.response?.data?.error?.message || error.message || 'Something went wrong'
          dispatch('alert/showAlert', { message: msg, type: 'danger' }, { root: true })
          return {
            success: false,
            error
          }
        } finally {
          dispatch('spinner/hideSpinner')
        }
      },
      async deleteVideoReel ({ commit, dispatch }, reelId) {
        try {
          dispatch('spinner/showSpinner')
          const { data } = await apiClient.delete(`${DELETE_VIDEO_REEL_ENDPOINT}/${reelId}`)
          if (!data.success) throw new Error(data.error.message)
          return data
        } catch (error) {
          const msg = error.response?.data?.error?.message || error.message || 'Something went wrong'
          dispatch('alert/showAlert', { message: msg, type: 'danger' }, { root: true })
          return {
            success: false,
            error
          }
        } finally {
          dispatch('spinner/hideSpinner')
        }
      },
      async getAllLanguages ({ state, commit, dispatch }) {
        try {
          dispatch('spinner/showSpinner')
          if (state.allLanguages) return state.allLanguages
          const response = await fetch('/languages.json')
          if (!response.ok) throw new Error('Network response was not ok')
          const jsonData = await response.json()
          commit('setAllLanguages', {
            success: true,
            data: jsonData
          })
          return {
            success: true,
            data: jsonData
          }
        } catch (error) {
          const msg = error.response?.data?.error?.message || error.message || 'Something went wrong'
          dispatch('alert/showAlert', { message: msg, type: 'danger' }, { root: true })
          return {
            success: false,
            error
          }
        } finally {
          dispatch('spinner/hideSpinner')
        }
      },
      async getAvailableLanguages ({ state, commit, dispatch }) {
        try {
          dispatch('spinner/showSpinner')
          if (state.availableLanguages) return state.availableLanguages
          const { data } = await apiClient.get(AVAILABLE_LANGUAGES_ENDPOINT)
          if (!data.success) throw new Error(data.error.message)
          commit('setAvailableLanguages', data)
          return data
        } catch (error) {
          const msg = error.response?.data?.error?.message || error.message || 'Something went wrong'
          dispatch('alert/showAlert', { message: msg, type: 'danger' }, { root: true })
          return {
            success: false,
            error
          }
        } finally {
          dispatch('spinner/hideSpinner')
        }
      },
      async getStates ({ state, commit, dispatch }) {
        try {
          dispatch('spinner/showSpinner')
          if (state.availableStates) {
            return state.availableStates
          }
          const response = await fetch('/states.json')
          if (!response.ok) throw new Error('Network response was not ok')
          const jsonData = await response.json()
          commit('setAvailableStates', jsonData)
          return jsonData
        } catch (error) {
          const msg = error.response?.data?.error?.message || error.message || 'Something went wrong'
          dispatch('alert/showAlert', { message: msg, type: 'danger' }, { root: true })
          return {
            success: false,
            error
          }
        } finally {
          dispatch('spinner/hideSpinner')
        }
      },
      async getAdminActiveCases ({ dispatch }, { page, mediatorId, firstPartyId, secondPartyId, status }) {
        try {
          dispatch('spinner/showSpinner')
          const params = new URLSearchParams()
          params.set('page', String(page || 1))
          if (mediatorId) params.set('mediatorId', mediatorId)
          if (firstPartyId) params.set('firstPartyId', firstPartyId)
          if (secondPartyId) params.set('secondPartyId', secondPartyId)
          if (status) params.set('status', status)
          const { data } = await apiClient.get(`${GET_ADMIN_ACTIVE_CASES_ENDPOINT}?${params.toString()}`)
          if (!data.success) throw new Error(data.error?.message || 'Request failed')
          return data
        } catch (error) {
          const msg = error.response?.data?.error?.message || error.message || 'Something went wrong'
          dispatch('alert/showAlert', { message: msg, type: 'danger' }, { root: true })
          return { success: false, error }
        } finally {
          dispatch('spinner/hideSpinner')
        }
      },
      async getAdminCaseManagementMeta ({ dispatch }) {
        try {
          dispatch('spinner/showSpinner')
          const { data } = await apiClient.get(GET_ADMIN_CASE_META_ENDPOINT)
          if (!data.success) throw new Error(data.error?.message || 'Request failed')
          return data
        } catch (error) {
          const msg = error.response?.data?.error?.message || error.message || 'Something went wrong'
          dispatch('alert/showAlert', { message: msg, type: 'danger' }, { root: true })
          return { success: false, error }
        } finally {
          dispatch('spinner/hideSpinner')
        }
      },
      async adminAssignCaseMediator ({ dispatch }, { caseId, mediatorId }) {
        try {
          dispatch('spinner/showSpinner')
          const { data } = await apiClient.post(POST_ADMIN_ASSIGN_CASE_MEDIATOR_ENDPOINT, { caseId, mediatorId })
          if (!data.success) throw new Error(data.error?.message || 'Request failed')
          dispatch('alert/showAlert', { message: data.message || 'Mediator updated', type: 'success' }, { root: true })
          return data
        } catch (error) {
          const msg = error.response?.data?.error?.message || error.message || 'Something went wrong'
          dispatch('alert/showAlert', { message: msg, type: 'danger' }, { root: true })
          return { success: false, error }
        } finally {
          dispatch('spinner/hideSpinner')
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
