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
const GET_SETTINGS_ENDPOINT = '/settings'
const POST_SETTINGS_ENDPOINT = '/settings'
const POST_CASE_COMMISSION_ENDPOINT = '/cases/commission'
const GET_INVOICES_ENDPOINT = '/invoices'
const GET_TRANSACTIONS_ENDPOINT = '/transactions'
const POST_SYNC_INVOICES_ENDPOINT = '/invoices/sync'
const POST_MARK_INVOICE_PAID_ENDPOINT = '/invoices/mark-paid'
const GET_INVOICE_PDF_ENDPOINT = '/invoices'
const GET_MEDIATOR_BANK_ACCOUNT_ENDPOINT = '/mediator-bank-account'
const POST_MEDIATOR_BANK_ACCOUNT_ENDPOINT = '/mediator-bank-account'
const UPDATE_INACTIVE_USER_ENDPOINT = '/updateInactiveUser'
const ADMIN_BLOG_TAXONOMY_ENDPOINT = '/blog-taxonomy'
const ADMIN_BLOG_CATEGORIES_ENDPOINT = '/blog-categories'
const ADMIN_BLOG_TAGS_ENDPOINT = '/blog-tags'
const ADMIN_USERS_ENDPOINT = '/users'
const ADMIN_USERS_ACTIVE_ENDPOINT = '/users/active'
const REFRESH_TOKEN_ENDPOINT = '/refresh-token'
const SAVE_NOTE_ENDPOINT = '/saveNote'
const SUBMIT_AGREEMENT_SIGNATURE = '/submitAgreementSignature'
const GET_DASHBOARD_CONTENT_ENDPOINT = '/getDashboardContent'
const DELETE_NOTE_ENDPOINT = '/deleteNote'
const GET_AGREEMENT_DETAILS_FOR_SIGNATURE = '/getAgreementDetailsForSignature'
const GET_EXISTING_USER_ENDPOINT = '/getExistingUser'
const UPDATE_USER_PROFILE = '/updateUserProfile'
const DELETE_MY_ACCOUNT_ENDPOINT = '/deleteMyAccount'
const ADMIN_SET_USER_DELETED_ENDPOINT = '/admin/setUserDeleted'
const GET_MY_REWARDS_ENDPOINT = '/mediator/rewards'
const REDEEM_REWARD_ENDPOINT = '/mediator/redeem-reward'
const MEDIATOR_LEGAL_FEEDS_CATALOG_ENDPOINT = '/mediator/legal-feeds/catalog'
const MEDIATOR_LEGAL_FEEDS_ENDPOINT = '/mediator/legal-feeds'
const MEDIATOR_COURT_CASES_ENDPOINT = '/mediator/court-cases'
const ADMIN_REWARD_CATALOG_ENDPOINT = '/admin/reward-catalog'
const ADMIN_REWARD_ORDERS_ENDPOINT = '/admin/reward-orders'
const GET_CALENDAR_INIT_ENDPOINT = '/getCalendarInit'
const NEW_CALENDAR_EVENT_ENDPOINT = '/newCalendarEvent'
const GET_PAST_MEDIATIONS_ENDPOINT = '/getPastMediations'
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
const GET_CASE_CORRESPONDENCE_ENDPOINT = '/case-correspondence'
const POST_CASE_CORRESPONDENCE_ENDPOINT = '/case-correspondence'
const GET_ADMIN_CASE_CORRESPONDENCE_ENDPOINT = '/admin/case-correspondence'
const GET_ADMIN_CORRESPONDENCE_INBOX_ENDPOINT = '/admin/correspondence/inbox'
const POST_ADMIN_CORRESPONDENCE_INBOX_MARK_READ_ENDPOINT = '/admin/correspondence/inbox/mark-read'
const GET_ADMIN_CORRESPONDENCE_CONTEXT_ENDPOINT = '/admin/correspondence/context'
const GET_ADMIN_CORRESPONDENCE_CASES_ENDPOINT = '/admin/correspondence/cases'
const GET_ADMIN_WEBSITE_CONTACT_INBOX_ENDPOINT = '/admin/website-contact/inbox'
const POST_PUBLIC_WEBSITE_CONTACT_LEAD_ENDPOINT = '/public/website-contact-lead'
const GET_PORTAL_SUPPORT_THREADS_ENDPOINT = '/portal/support/threads'
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

function parseApiResponse (body) {
  if (!body?.success) {
    const message = body?.error?.message || body?.message || 'Request failed'
    throw new Error(message)
  }
  const payload = body.data || {}
  return {
    success: true,
    message: body.message,
    ...payload,
    data: payload
  }
}

const plugin = (router) => (store) => {
  store.$cookies = VueCookies
  store.$router = router
}

apiClient.interceptors.request.use((config) => {
  const excludedEndpoints = [LOGIN_ENDPOINT, GET_EXISTING_USER_ENDPOINT, RESET_PASSWORD_ENDPOINT, CONFIRM_PASSWORD_CHANGE_ENDPOINT, NEW_USER_SIGNUP_ENDPOINT, NEW_MEDIATOR_SIGNUP_ENDPOINT, IS_EMAIL_EXIST_ENDPOINT, POST_PUBLIC_WEBSITE_CONTACT_LEAD_ENDPOINT]
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
      },
      invalidateDashboardCaches (state) {
        state.dashboardContent = null
        state.calendarInit = null
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
          commit('invalidateDashboardCaches')
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
      async deleteMyAccount ({ commit, dispatch }, { confirm }) {
        try {
          dispatch('spinner/showSpinner')
          const { data } = await apiClient.post(DELETE_MY_ACCOUNT_ENDPOINT, { confirm })
          if (!data.success) throw new Error(data.error?.message || data.message)
          return data
        } catch (error) {
          const msg = error.response?.data?.error?.message || error.message || 'Something went wrong'
          dispatch('alert/showAlert', { message: msg, type: 'danger' }, { root: true })
          return { success: false, error }
        } finally {
          dispatch('spinner/hideSpinner')
        }
      },
      async adminSetUserDeleted ({ commit, dispatch }, { userId, isDeleted }) {
        try {
          dispatch('spinner/showSpinner')
          const { data } = await apiClient.post(ADMIN_SET_USER_DELETED_ENDPOINT, { userId, isDeleted })
          if (!data.success) throw new Error(data.error?.message || data.message)
          dispatch('alert/showAlert', { message: data.message, type: 'success' }, { root: true })
          return data
        } catch (error) {
          const msg = error.response?.data?.error?.message || error.message || 'Something went wrong'
          dispatch('alert/showAlert', { message: msg, type: 'danger' }, { root: true })
          return { success: false, error }
        } finally {
          dispatch('spinner/hideSpinner')
        }
      },
      async getMyRewards ({ commit, dispatch }, { page = 1 }) {
        try {
          const { data } = await apiClient.get(`${GET_MY_REWARDS_ENDPOINT}?page=${encodeURIComponent(page)}`)
          if (!data.success) throw new Error(data.error?.message || data.message)
          return data
        } catch (error) {
          const msg = error.response?.data?.error?.message || error.message || 'Something went wrong'
          dispatch('alert/showAlert', { message: msg, type: 'danger' }, { root: true })
          return { success: false, error }
        }
      },
      async redeemReward ({ commit, dispatch }, { catalogItemId }) {
        try {
          dispatch('spinner/showSpinner')
          const { data } = await apiClient.post(REDEEM_REWARD_ENDPOINT, { catalogItemId })
          if (!data.success) throw new Error(data.error?.message || data.message)
          dispatch('alert/showAlert', { message: data.message || 'Reward redeemed', type: 'success' }, { root: true })
          return data
        } catch (error) {
          const msg = error.response?.data?.error?.message || error.message || 'Something went wrong'
          dispatch('alert/showAlert', { message: msg, type: 'danger' }, { root: true })
          return { success: false, error }
        } finally {
          dispatch('spinner/hideSpinner')
        }
      },
      async getMediatorLegalFeedCatalog ({ dispatch }) {
        try {
          const { data } = await apiClient.get(MEDIATOR_LEGAL_FEEDS_CATALOG_ENDPOINT)
          return parseApiResponse(data)
        } catch (error) {
          const msg = error.response?.data?.error?.message || error.message || 'Something went wrong'
          dispatch('alert/showAlert', { message: msg, type: 'danger' }, { root: true })
          return { success: false, error }
        }
      },
      async getMediatorLegalFeeds ({ dispatch }, { feed = 'judgments', limit = 12 } = {}) {
        try {
          const { data } = await apiClient.get(
            `${MEDIATOR_LEGAL_FEEDS_ENDPOINT}?feed=${encodeURIComponent(feed)}&limit=${encodeURIComponent(limit)}`
          )
          return parseApiResponse(data)
        } catch (error) {
          const msg = error.response?.data?.error?.message || error.message || 'Something went wrong'
          dispatch('alert/showAlert', { message: msg, type: 'danger' }, { root: true })
          return { success: false, error }
        }
      },
      async getMediatorCourtCaseTrackers ({ dispatch }) {
        try {
          const { data } = await apiClient.get(MEDIATOR_COURT_CASES_ENDPOINT)
          return parseApiResponse(data)
        } catch (error) {
          const msg = error.response?.data?.error?.message || error.message || 'Something went wrong'
          dispatch('alert/showAlert', { message: msg, type: 'danger' }, { root: true })
          return { success: false, error }
        }
      },
      async addMediatorCourtCaseTracker ({ dispatch }, { cnr, label }) {
        try {
          dispatch('spinner/showSpinner')
          const { data } = await apiClient.post(MEDIATOR_COURT_CASES_ENDPOINT, { cnr, label })
          const result = parseApiResponse(data)
          dispatch('alert/showAlert', { message: result.message || data.message || 'Case tracked', type: 'success' }, { root: true })
          return result
        } catch (error) {
          const apiErr = error.response?.data?.error
          const msg = apiErr?.message || error.message || 'Something went wrong'
          dispatch('alert/showAlert', { message: msg, type: 'danger' }, { root: true })
          return { success: false, error: { message: msg, details: apiErr?.details || null } }
        } finally {
          dispatch('spinner/hideSpinner')
        }
      },
      async refreshMediatorCourtCaseTracker ({ dispatch }, { id }) {
        try {
          dispatch('spinner/showSpinner')
          const { data } = await apiClient.post(`${MEDIATOR_COURT_CASES_ENDPOINT}/${encodeURIComponent(id)}/refresh`)
          const result = parseApiResponse(data)
          dispatch('alert/showAlert', { message: result.message || data.message || 'Refreshed', type: 'success' }, { root: true })
          return result
        } catch (error) {
          const msg = error.response?.data?.error?.message || error.message || 'Something went wrong'
          dispatch('alert/showAlert', { message: msg, type: 'danger' }, { root: true })
          return { success: false, error }
        } finally {
          dispatch('spinner/hideSpinner')
        }
      },
      async getMediatorCourtCaseDetails ({ dispatch }, { id }) {
        try {
          const { data } = await apiClient.get(`${MEDIATOR_COURT_CASES_ENDPOINT}/${encodeURIComponent(id)}/details`)
          return parseApiResponse(data)
        } catch (error) {
          const msg = error.response?.data?.error?.message || error.message || 'Something went wrong'
          dispatch('alert/showAlert', { message: msg, type: 'danger' }, { root: true })
          return { success: false, error }
        }
      },
      async removeMediatorCourtCaseTracker ({ dispatch }, { id }) {
        try {
          const { data } = await apiClient.delete(`${MEDIATOR_COURT_CASES_ENDPOINT}/${encodeURIComponent(id)}`)
          const result = parseApiResponse(data)
          dispatch('alert/showAlert', { message: result.message || data.message || 'Removed', type: 'success' }, { root: true })
          return result
        } catch (error) {
          const msg = error.response?.data?.error?.message || error.message || 'Something went wrong'
          dispatch('alert/showAlert', { message: msg, type: 'danger' }, { root: true })
          return { success: false, error }
        }
      },
      async getRewardCatalogAdmin ({ commit, dispatch }) {
        try {
          const { data } = await apiClient.get(ADMIN_REWARD_CATALOG_ENDPOINT)
          if (!data.success) throw new Error(data.error?.message || data.message)
          return data
        } catch (error) {
          const msg = error.response?.data?.error?.message || error.message || 'Something went wrong'
          dispatch('alert/showAlert', { message: msg, type: 'danger' }, { root: true })
          return { success: false, error }
        }
      },
      async saveRewardCatalogItem ({ commit, dispatch }, payload) {
        try {
          dispatch('spinner/showSpinner')
          const { data } = await apiClient.post(ADMIN_REWARD_CATALOG_ENDPOINT, payload)
          if (!data.success) throw new Error(data.error?.message || data.message)
          dispatch('alert/showAlert', { message: data.message || 'Saved', type: 'success' }, { root: true })
          return data
        } catch (error) {
          const msg = error.response?.data?.error?.message || error.message || 'Something went wrong'
          dispatch('alert/showAlert', { message: msg, type: 'danger' }, { root: true })
          return { success: false, error }
        } finally {
          dispatch('spinner/hideSpinner')
        }
      },
      async deleteRewardCatalogItem ({ commit, dispatch }, { id }) {
        try {
          dispatch('spinner/showSpinner')
          const { data } = await apiClient.delete(`${ADMIN_REWARD_CATALOG_ENDPOINT}/${id}`)
          if (!data.success) throw new Error(data.error?.message || data.message)
          dispatch('alert/showAlert', { message: data.message || 'Removed', type: 'success' }, { root: true })
          return data
        } catch (error) {
          const msg = error.response?.data?.error?.message || error.message || 'Something went wrong'
          dispatch('alert/showAlert', { message: msg, type: 'danger' }, { root: true })
          return { success: false, error }
        } finally {
          dispatch('spinner/hideSpinner')
        }
      },
      async getRewardOrdersAdmin ({ commit, dispatch }, { page = 1, status }) {
        try {
          dispatch('spinner/showSpinner')
          let url = `${ADMIN_REWARD_ORDERS_ENDPOINT}?page=${encodeURIComponent(page)}`
          if (status) url += `&status=${encodeURIComponent(status)}`
          const { data } = await apiClient.get(url)
          if (!data.success) throw new Error(data.error?.message || data.message)
          return data
        } catch (error) {
          const msg = error.response?.data?.error?.message || error.message || 'Something went wrong'
          dispatch('alert/showAlert', { message: msg, type: 'danger' }, { root: true })
          return { success: false, error }
        } finally {
          dispatch('spinner/hideSpinner')
        }
      },
      async fulfillRewardOrder ({ commit, dispatch }, { id, admin_notes }) {
        try {
          dispatch('spinner/showSpinner')
          const { data } = await apiClient.post(`${ADMIN_REWARD_ORDERS_ENDPOINT}/${id}/fulfill`, { admin_notes })
          if (!data.success) throw new Error(data.error?.message || data.message)
          dispatch('alert/showAlert', { message: data.message || 'Order fulfilled', type: 'success' }, { root: true })
          return data
        } catch (error) {
          const msg = error.response?.data?.error?.message || error.message || 'Something went wrong'
          dispatch('alert/showAlert', { message: msg, type: 'danger' }, { root: true })
          return { success: false, error }
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
          commit('setUser', userData)
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
          commit('invalidateDashboardCaches')
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
          commit('invalidateDashboardCaches')
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
          commit('invalidateDashboardCaches')
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
      async submitMeetingFeedback ({ commit, dispatch }, payload) {
        try {
          dispatch('spinner/showSpinner')
          const { data } = await apiClient.post(SUBMIT_EVENT_FEEDBACK_ENDPOINT, payload)
          if (!data.success) throw new Error(data.error.message)
          commit('invalidateDashboardCaches')
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
      async updateInactiveUsers ({ commit, dispatch }, { isActive, caseId, userId, caseType, sendWelcomeEmail = true }) {
        try {
          dispatch('spinner/showSpinner')
          const { data } = await apiClient.post(UPDATE_INACTIVE_USER_ENDPOINT, { isActive, caseId, userId, caseType, sendWelcomeEmail })
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
      async getActiveUsers ({ commit, dispatch }, { page, type, includeInactive = false, includeDeleted = false }) {
        try {
          dispatch('spinner/showSpinner')
          const params = type
            ? `?page=${encodeURIComponent(page)}&type=${encodeURIComponent(type)}&includeInactive=${encodeURIComponent(includeInactive)}&includeDeleted=${encodeURIComponent(includeDeleted)}`
            : `?page=${encodeURIComponent(page)}&includeInactive=${encodeURIComponent(includeInactive)}&includeDeleted=${encodeURIComponent(includeDeleted)}`
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
      async getPastMediations ({ commit, dispatch }, { page }) {
        try {
          dispatch('spinner/showSpinner')
          const { data } = await apiClient.get(`${GET_PAST_MEDIATIONS_ENDPOINT}?page=${encodeURIComponent(page)}`)
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
      },
      async getAdminSettings ({ dispatch }) {
        try {
          dispatch('spinner/showSpinner')
          const { data } = await apiClient.get(GET_SETTINGS_ENDPOINT)
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
      async saveAdminSettings ({ dispatch }, payload) {
        try {
          dispatch('spinner/showSpinner')
          const { data } = await apiClient.post(POST_SETTINGS_ENDPOINT, payload)
          if (!data.success) throw new Error(data.error?.message || 'Request failed')
          dispatch('alert/showAlert', { message: data.message || 'Settings saved', type: 'success' }, { root: true })
          return data
        } catch (error) {
          const msg = error.response?.data?.error?.message || error.message || 'Something went wrong'
          dispatch('alert/showAlert', { message: msg, type: 'danger' }, { root: true })
          return { success: false, error }
        } finally {
          dispatch('spinner/hideSpinner')
        }
      },
      async updateCaseMediatorCommission ({ dispatch }, payload) {
        try {
          dispatch('spinner/showSpinner')
          const { data } = await apiClient.post(POST_CASE_COMMISSION_ENDPOINT, payload)
          if (!data.success) throw new Error(data.error?.message || 'Request failed')
          dispatch('alert/showAlert', { message: data.message || 'Revenue share updated', type: 'success' }, { root: true })
          return data
        } catch (error) {
          const msg = error.response?.data?.error?.message || error.message || 'Something went wrong'
          dispatch('alert/showAlert', { message: msg, type: 'danger' }, { root: true })
          return { success: false, error }
        } finally {
          dispatch('spinner/hideSpinner')
        }
      },
      async getInvoices ({ dispatch }, { mediatorId, range, status } = {}) {
        try {
          dispatch('spinner/showSpinner')
          const params = new URLSearchParams()
          if (mediatorId) params.set('mediatorId', mediatorId)
          if (range) params.set('range', range)
          if (status) params.set('status', status)
          const query = params.toString()
          const { data } = await apiClient.get(query ? `${GET_INVOICES_ENDPOINT}?${query}` : GET_INVOICES_ENDPOINT)
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
      async getTransactions ({ dispatch }, { range } = {}) {
        try {
          dispatch('spinner/showSpinner')
          const query = range ? `?range=${encodeURIComponent(range)}` : ''
          const { data } = await apiClient.get(`${GET_TRANSACTIONS_ENDPOINT}${query}`)
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
      async syncInvoices ({ dispatch }) {
        try {
          dispatch('spinner/showSpinner')
          const { data } = await apiClient.post(POST_SYNC_INVOICES_ENDPOINT)
          if (!data.success) throw new Error(data.error?.message || 'Request failed')
          dispatch('alert/showAlert', { message: data.message || 'Invoices synced', type: 'success' }, { root: true })
          return data
        } catch (error) {
          const msg = error.response?.data?.error?.message || error.message || 'Something went wrong'
          dispatch('alert/showAlert', { message: msg, type: 'danger' }, { root: true })
          return { success: false, error }
        } finally {
          dispatch('spinner/hideSpinner')
        }
      },
      async markInvoicePaid ({ dispatch }, payload) {
        try {
          dispatch('spinner/showSpinner')
          const { data } = await apiClient.post(POST_MARK_INVOICE_PAID_ENDPOINT, payload)
          if (!data.success) throw new Error(data.error?.message || 'Request failed')
          dispatch('alert/showAlert', { message: data.message || 'Invoice marked paid', type: 'success' }, { root: true })
          return data
        } catch (error) {
          const msg = error.response?.data?.error?.message || error.message || 'Something went wrong'
          dispatch('alert/showAlert', { message: msg, type: 'danger' }, { root: true })
          return { success: false, error }
        } finally {
          dispatch('spinner/hideSpinner')
        }
      },
      async downloadInvoicePdf ({ dispatch }, { invoiceId, invoiceNumber }) {
        try {
          dispatch('spinner/showSpinner')
          const response = await apiClient.get(`${GET_INVOICE_PDF_ENDPOINT}/${encodeURIComponent(invoiceId)}/pdf`, {
            responseType: 'blob'
          })
          const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }))
          const link = document.createElement('a')
          link.href = url
          link.setAttribute('download', `${invoiceNumber || 'invoice'}.pdf`)
          document.body.appendChild(link)
          link.click()
          link.remove()
          window.URL.revokeObjectURL(url)
          return { success: true }
        } catch (error) {
          const msg = error.response?.data?.error?.message || error.message || 'Something went wrong'
          dispatch('alert/showAlert', { message: msg, type: 'danger' }, { root: true })
          return { success: false, error }
        } finally {
          dispatch('spinner/hideSpinner')
        }
      },
      async getMediatorBankAccount ({ dispatch }, { mediatorId } = {}) {
        try {
          dispatch('spinner/showSpinner')
          const url = mediatorId ? `${GET_MEDIATOR_BANK_ACCOUNT_ENDPOINT}?mediatorId=${encodeURIComponent(mediatorId)}` : GET_MEDIATOR_BANK_ACCOUNT_ENDPOINT
          const { data } = await apiClient.get(url)
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
      async saveMediatorBankAccount ({ dispatch }, payload) {
        try {
          dispatch('spinner/showSpinner')
          const { data } = await apiClient.post(POST_MEDIATOR_BANK_ACCOUNT_ENDPOINT, payload)
          if (!data.success) throw new Error(data.error?.message || 'Request failed')
          dispatch('alert/showAlert', { message: data.message || 'Bank account saved', type: 'success' }, { root: true })
          return data
        } catch (error) {
          const msg = error.response?.data?.error?.message || error.message || 'Something went wrong'
          dispatch('alert/showAlert', { message: msg, type: 'danger' }, { root: true })
          return { success: false, error }
        } finally {
          dispatch('spinner/hideSpinner')
        }
      },
      async getAdminBlogTaxonomy ({ dispatch }) {
        try {
          dispatch('spinner/showSpinner')
          const { data } = await apiClient.get(ADMIN_BLOG_TAXONOMY_ENDPOINT)
          if (!data.success) throw new Error(data.error?.message || 'Request failed')
          return data
        } catch (error) {
          const msg = error.response?.data?.error?.message || error.response?.data?.message || error.message || 'Something went wrong'
          dispatch('alert/showAlert', { message: msg, type: 'danger' }, { root: true })
          return { success: false, error }
        } finally {
          dispatch('spinner/hideSpinner')
        }
      },
      async createBlogCategory ({ dispatch }, { name }) {
        try {
          dispatch('spinner/showSpinner')
          const { data } = await apiClient.post(ADMIN_BLOG_CATEGORIES_ENDPOINT, { name })
          if (!data.success) throw new Error(data.error?.message || 'Request failed')
          return data
        } catch (error) {
          const msg = error.response?.data?.error?.message || error.response?.data?.message || error.message || 'Something went wrong'
          dispatch('alert/showAlert', { message: msg, type: 'danger' }, { root: true })
          return { success: false, error }
        } finally {
          dispatch('spinner/hideSpinner')
        }
      },
      async updateBlogCategory ({ dispatch }, { id, name }) {
        try {
          dispatch('spinner/showSpinner')
          const { data } = await apiClient.put(ADMIN_BLOG_CATEGORIES_ENDPOINT, { id, name })
          if (!data.success) throw new Error(data.error?.message || 'Request failed')
          return data
        } catch (error) {
          const msg = error.response?.data?.error?.message || error.response?.data?.message || error.message || 'Something went wrong'
          dispatch('alert/showAlert', { message: msg, type: 'danger' }, { root: true })
          return { success: false, error }
        } finally {
          dispatch('spinner/hideSpinner')
        }
      },
      async deleteBlogCategory ({ dispatch }, { id }) {
        try {
          dispatch('spinner/showSpinner')
          const { data } = await apiClient.delete(`${ADMIN_BLOG_CATEGORIES_ENDPOINT}/${id}`)
          if (!data.success) throw new Error(data.error?.message || 'Request failed')
          return data
        } catch (error) {
          const msg = error.response?.data?.error?.message || error.response?.data?.message || error.message || 'Something went wrong'
          dispatch('alert/showAlert', { message: msg, type: 'danger' }, { root: true })
          return { success: false, error }
        } finally {
          dispatch('spinner/hideSpinner')
        }
      },
      async createBlogTag ({ dispatch }, { name }) {
        try {
          dispatch('spinner/showSpinner')
          const { data } = await apiClient.post(ADMIN_BLOG_TAGS_ENDPOINT, { name })
          if (!data.success) throw new Error(data.error?.message || 'Request failed')
          return data
        } catch (error) {
          const msg = error.response?.data?.error?.message || error.response?.data?.message || error.message || 'Something went wrong'
          dispatch('alert/showAlert', { message: msg, type: 'danger' }, { root: true })
          return { success: false, error }
        } finally {
          dispatch('spinner/hideSpinner')
        }
      },
      async updateBlogTag ({ dispatch }, { id, name }) {
        try {
          dispatch('spinner/showSpinner')
          const { data } = await apiClient.put(ADMIN_BLOG_TAGS_ENDPOINT, { id, name })
          if (!data.success) throw new Error(data.error?.message || 'Request failed')
          return data
        } catch (error) {
          const msg = error.response?.data?.error?.message || error.response?.data?.message || error.message || 'Something went wrong'
          dispatch('alert/showAlert', { message: msg, type: 'danger' }, { root: true })
          return { success: false, error }
        } finally {
          dispatch('spinner/hideSpinner')
        }
      },
      async deleteBlogTag ({ dispatch }, { id }) {
        try {
          dispatch('spinner/showSpinner')
          const { data } = await apiClient.delete(`${ADMIN_BLOG_TAGS_ENDPOINT}/${id}`)
          if (!data.success) throw new Error(data.error?.message || 'Request failed')
          return data
        } catch (error) {
          const msg = error.response?.data?.error?.message || error.response?.data?.message || error.message || 'Something went wrong'
          dispatch('alert/showAlert', { message: msg, type: 'danger' }, { root: true })
          return { success: false, error }
        } finally {
          dispatch('spinner/hideSpinner')
        }
      },
      async getAdminUsers ({ dispatch }) {
        try {
          dispatch('spinner/showSpinner')
          const { data } = await apiClient.get(ADMIN_USERS_ENDPOINT)
          if (!data.success) throw new Error(data.error?.message || 'Request failed')
          return data
        } catch (error) {
          const msg = error.response?.data?.error?.message || error.response?.data?.message || error.message || 'Something went wrong'
          dispatch('alert/showAlert', { message: msg, type: 'danger' }, { root: true })
          return { success: false, error }
        } finally {
          dispatch('spinner/hideSpinner')
        }
      },
      async createAdminUser ({ dispatch }, payload) {
        try {
          dispatch('spinner/showSpinner')
          const { data } = await apiClient.post(ADMIN_USERS_ENDPOINT, payload)
          if (!data.success) throw new Error(data.error?.message || 'Request failed')
          return data
        } catch (error) {
          const msg = error.response?.data?.error?.message || error.response?.data?.message || error.message || 'Something went wrong'
          dispatch('alert/showAlert', { message: msg, type: 'danger' }, { root: true })
          return { success: false, error }
        } finally {
          dispatch('spinner/hideSpinner')
        }
      },
      async updateAdminUser ({ dispatch }, payload) {
        try {
          dispatch('spinner/showSpinner')
          const { data } = await apiClient.put(ADMIN_USERS_ENDPOINT, payload)
          if (!data.success) throw new Error(data.error?.message || 'Request failed')
          return data
        } catch (error) {
          const msg = error.response?.data?.error?.message || error.response?.data?.message || error.message || 'Something went wrong'
          dispatch('alert/showAlert', { message: msg, type: 'danger' }, { root: true })
          return { success: false, error }
        } finally {
          dispatch('spinner/hideSpinner')
        }
      },
      async setAdminUserActive ({ dispatch }, { userId, active }) {
        try {
          dispatch('spinner/showSpinner')
          const { data } = await apiClient.post(ADMIN_USERS_ACTIVE_ENDPOINT, { userId, active })
          if (!data.success) throw new Error(data.error?.message || 'Request failed')
          return data
        } catch (error) {
          const msg = error.response?.data?.error?.message || error.response?.data?.message || error.message || 'Something went wrong'
          dispatch('alert/showAlert', { message: msg, type: 'danger' }, { root: true })
          return { success: false, error }
        } finally {
          dispatch('spinner/hideSpinner')
        }
      },
      async getCaseCorrespondence (ctx, { caseId, channel }) {
        try {
          const { data } = await apiClient.get(
            `${GET_CASE_CORRESPONDENCE_ENDPOINT}?caseId=${encodeURIComponent(caseId)}&channel=${encodeURIComponent(channel)}`
          )
          if (!data.success) throw new Error(data.error?.message || 'Request failed')
          return data
        } catch (error) {
          return {
            success: false,
            error,
            message: error.response?.data?.error?.message || error.message
          }
        }
      },
      async postCaseCorrespondence (ctx, payload) {
        try {
          const { data } = await apiClient.post(POST_CASE_CORRESPONDENCE_ENDPOINT, payload)
          if (!data.success) throw new Error(data.error?.message || 'Request failed')
          return data
        } catch (error) {
          return {
            success: false,
            error,
            message: error.response?.data?.error?.message || error.message
          }
        }
      },
      async getAdminCaseCorrespondence (ctx, { caseId }) {
        try {
          const { data } = await apiClient.get(
            `${GET_ADMIN_CASE_CORRESPONDENCE_ENDPOINT}?caseId=${encodeURIComponent(caseId)}`
          )
          if (!data.success) throw new Error(data.error?.message || 'Request failed')
          return data
        } catch (error) {
          return {
            success: false,
            error,
            message: error.response?.data?.error?.message || error.message
          }
        }
      },
      async getAdminCorrespondenceInbox (ctx) {
        try {
          const { data } = await apiClient.get(GET_ADMIN_CORRESPONDENCE_INBOX_ENDPOINT)
          if (!data.success) throw new Error(data.error?.message || 'Request failed')
          return data
        } catch (error) {
          return {
            success: false,
            error,
            message: error.response?.data?.error?.message || error.message
          }
        }
      },
      async markAdminCorrespondenceInboxRead (ctx, payload) {
        try {
          const { data } = await apiClient.post(POST_ADMIN_CORRESPONDENCE_INBOX_MARK_READ_ENDPOINT, payload)
          if (!data.success) throw new Error(data.error?.message || 'Request failed')
          return data
        } catch (error) {
          return {
            success: false,
            error,
            message: error.response?.data?.error?.message || error.message
          }
        }
      },
      async getAdminCorrespondenceContext (ctx, { caseId }) {
        try {
          const { data } = await apiClient.get(
            `${GET_ADMIN_CORRESPONDENCE_CONTEXT_ENDPOINT}?caseId=${encodeURIComponent(caseId)}`
          )
          if (!data.success) throw new Error(data.error?.message || 'Request failed')
          return data
        } catch (error) {
          return {
            success: false,
            error,
            message: error.response?.data?.error?.message || error.message
          }
        }
      },
      async getAdminCorrespondenceCasesForPicker (ctx, { page = 1, search = '' } = {}) {
        try {
          const q = new URLSearchParams()
          q.set('page', String(page))
          if (search) q.set('search', search)
          const { data } = await apiClient.get(`${GET_ADMIN_CORRESPONDENCE_CASES_ENDPOINT}?${q.toString()}`)
          if (!data.success) throw new Error(data.error?.message || 'Request failed')
          return data
        } catch (error) {
          return {
            success: false,
            error,
            message: error.response?.data?.error?.message || error.message
          }
        }
      },
      async getAdminWebsiteContactInbox (ctx) {
        try {
          const { data } = await apiClient.get(GET_ADMIN_WEBSITE_CONTACT_INBOX_ENDPOINT)
          if (!data.success) throw new Error(data.error?.message || 'Request failed')
          return data
        } catch (error) {
          return {
            success: false,
            error,
            message: error.response?.data?.error?.message || error.message
          }
        }
      },
      async getAdminWebsiteContactThread (ctx, { threadId }) {
        try {
          const { data } = await apiClient.get(`/admin/website-contact/thread/${encodeURIComponent(threadId)}`)
          if (!data.success) throw new Error(data.error?.message || 'Request failed')
          return data
        } catch (error) {
          return {
            success: false,
            error,
            message: error.response?.data?.error?.message || error.message
          }
        }
      },
      async postAdminWebsiteContactReply (ctx, { threadId, body }) {
        try {
          const { data } = await apiClient.post(
            `/admin/website-contact/thread/${encodeURIComponent(threadId)}/messages`,
            { body }
          )
          if (!data.success) throw new Error(data.error?.message || 'Request failed')
          return data
        } catch (error) {
          return {
            success: false,
            error,
            message: error.response?.data?.error?.message || error.message
          }
        }
      },
      async submitPublicWebsiteContactLead (ctx, { email, title, description, phone, name, apiKey } = {}) {
        try {
          const headers = {}
          if (apiKey) headers['x-website-contact-key'] = apiKey
          const { data } = await apiClient.post(
            POST_PUBLIC_WEBSITE_CONTACT_LEAD_ENDPOINT,
            { email, title, description, phone, name },
            { headers }
          )
          if (!data.success) throw new Error(data.error?.message || 'Request failed')
          return data
        } catch (error) {
          return {
            success: false,
            error,
            message: error.response?.data?.error?.message || error.message
          }
        }
      },
      async getPortalSupportThreads (ctx) {
        try {
          const { data } = await apiClient.get(GET_PORTAL_SUPPORT_THREADS_ENDPOINT)
          if (!data.success) throw new Error(data.error?.message || 'Request failed')
          return data
        } catch (error) {
          return { success: false, error, message: error.response?.data?.error?.message || error.message }
        }
      },
      async getPortalSupportThread (ctx, { threadId }) {
        try {
          const { data } = await apiClient.get(`/portal/support/thread/${encodeURIComponent(threadId)}`)
          if (!data.success) throw new Error(data.error?.message || 'Request failed')
          return data
        } catch (error) {
          return { success: false, error, message: error.response?.data?.error?.message || error.message }
        }
      },
      async createPortalSupportThread (ctx, { topic, body }) {
        try {
          const { data } = await apiClient.post('/portal/support/thread', { topic, body })
          if (!data.success) throw new Error(data.error?.message || 'Request failed')
          return data
        } catch (error) {
          return { success: false, error, message: error.response?.data?.error?.message || error.message }
        }
      },
      async postPortalSupportUserMessage (ctx, { threadId, body }) {
        try {
          const { data } = await apiClient.post(
            `/portal/support/thread/${encodeURIComponent(threadId)}/messages`,
            { body }
          )
          if (!data.success) throw new Error(data.error?.message || 'Request failed')
          return data
        } catch (error) {
          return { success: false, error, message: error.response?.data?.error?.message || error.message }
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
