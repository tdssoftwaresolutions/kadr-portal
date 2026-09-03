import { apiClient } from '../../utils/apiClient'
import {
  MARK_CASE_RESOLVED,
  ACCEPT_MEDIATION_REQUEST,
  SUBMIT_EVENT_FEEDBACK_ENDPOINT,
  GET_PAST_MEDIATIONS_ENDPOINT,
  SET_CLIENT_PAYMENT_ENDPOINT,
  INITIATE_NEW_CASE_ENDPOINT
} from '../endpoints'

export default {
  namespaced: false,
  actions: {
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

    async initiateNewCase ({ commit, dispatch }, payload) {
      try {
        dispatch('spinner/showSpinner')
        const { data } = await apiClient.post(INITIATE_NEW_CASE_ENDPOINT, payload)
        if (!data.success) throw new Error(data.error?.message || 'Request failed')
        commit('invalidateDashboardCaches')
        dispatch('alert/showAlert', {
          message: data.message || 'Your new case has been submitted for review.',
          type: 'success'
        }, { root: true })
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
    }
  }
}
