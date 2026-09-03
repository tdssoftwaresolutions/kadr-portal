import { apiClient } from '../../utils/apiClient'
import { isPremiumGateError } from '../../utils/mediatorEntitlements'
import { dispatchApiErrorAlert, parseApiResponse, triggerPdfBlobDownload } from '../helpers'
import {
  GET_MY_REWARDS_ENDPOINT,
  REDEEM_REWARD_ENDPOINT,
  MEDIATOR_SUBSCRIPTION_ENDPOINT,
  MEDIATOR_LEGAL_FEEDS_ENDPOINT,
  MEDIATOR_COURT_CASES_ENDPOINT,
  MEDIATOR_PRIVATE_INVOICE_SETTINGS,
  MEDIATOR_PRIVATE_INVOICE_UPLOAD,
  MEDIATOR_PRIVATE_INVOICES,
  MEDIATOR_INCOME_ENDPOINT
} from '../endpoints'

export default {
  namespaced: false,
  actions: {
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
        commit('invalidateDashboardCaches')
        await dispatch('loadMediatorSubscription')
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

    async loadMediatorSubscription ({ commit, dispatch }) {
      try {
        const { data } = await apiClient.get(MEDIATOR_SUBSCRIPTION_ENDPOINT)
        const result = parseApiResponse(data)
        const tier = result.tier || result.data?.tier || 'FREE'
        const features = result.features || result.data?.features || []
        commit('setMediatorSubscription', { tier, features })
        return result
      } catch (error) {
        dispatchApiErrorAlert(dispatch, error)
        return { success: false, error }
      }
    },

    async getMySubscription (context) {
      return context.dispatch('loadMediatorSubscription')
    },

    async getMediatorLegalFeeds ({ dispatch }, { feed = 'judgments', limit = 12 } = {}) {
      try {
        const { data } = await apiClient.get(
            `${MEDIATOR_LEGAL_FEEDS_ENDPOINT}?feed=${encodeURIComponent(feed)}&limit=${encodeURIComponent(limit)}`
        )
        return parseApiResponse(data)
      } catch (error) {
        dispatchApiErrorAlert(dispatch, error)
        return { success: false, error }
      }
    },

    async getMediatorCourtCaseTrackers ({ dispatch }) {
      try {
        const { data } = await apiClient.get(MEDIATOR_COURT_CASES_ENDPOINT)
        return parseApiResponse(data)
      } catch (error) {
        if (isPremiumGateError(error)) {
          return { success: false, premiumLocked: true, error }
        }
        dispatchApiErrorAlert(dispatch, error)
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
        if (isPremiumGateError(error)) {
          return { success: false, premiumLocked: true, error }
        }
        const apiErr = error.response?.data?.error
        const msg = apiErr?.message || error.message || 'Something went wrong'
        dispatchApiErrorAlert(dispatch, error)
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
        if (isPremiumGateError(error)) {
          return { success: false, premiumLocked: true, error }
        }
        dispatchApiErrorAlert(dispatch, error)
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
        if (isPremiumGateError(error)) {
          return { success: false, premiumLocked: true, error }
        }
        dispatchApiErrorAlert(dispatch, error)
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
        if (isPremiumGateError(error)) {
          return { success: false, premiumLocked: true, error }
        }
        dispatchApiErrorAlert(dispatch, error)
        return { success: false, error }
      }
    },

    async getPrivateInvoiceSettings ({ dispatch }) {
      try {
        const { data } = await apiClient.get(MEDIATOR_PRIVATE_INVOICE_SETTINGS)
        return parseApiResponse(data)
      } catch (error) {
        if (isPremiumGateError(error)) {
          return { success: false, premiumLocked: true, error }
        }
        dispatchApiErrorAlert(dispatch, error)
        return { success: false, error }
      }
    },

    async savePrivateInvoiceSettings ({ dispatch }, payload) {
      try {
        const { data } = await apiClient.post(MEDIATOR_PRIVATE_INVOICE_SETTINGS, payload)
        return parseApiResponse(data)
      } catch (error) {
        if (isPremiumGateError(error)) {
          return { success: false, premiumLocked: true, error }
        }
        dispatchApiErrorAlert(dispatch, error)
        return { success: false, error }
      }
    },

    async uploadPrivateInvoiceAsset ({ dispatch }, { fileContent, assetType }) {
      try {
        dispatch('spinner/showSpinner')
        const { data } = await apiClient.post(MEDIATOR_PRIVATE_INVOICE_UPLOAD, { fileContent, assetType })
        return parseApiResponse(data)
      } catch (error) {
        if (isPremiumGateError(error)) {
          return { success: false, premiumLocked: true, error }
        }
        dispatchApiErrorAlert(dispatch, error)
        return { success: false, error }
      } finally {
        dispatch('spinner/hideSpinner')
      }
    },

    async getMediatorIncome ({ dispatch }, { range, status, source } = {}) {
      try {
        const params = new URLSearchParams()
        if (range) params.set('range', range)
        if (status) params.set('status', status)
        if (source) params.set('source', source)
        const query = params.toString()
        const { data } = await apiClient.get(query ? `${MEDIATOR_INCOME_ENDPOINT}?${query}` : MEDIATOR_INCOME_ENDPOINT)
        return parseApiResponse(data)
      } catch (error) {
        dispatchApiErrorAlert(dispatch, error)
        return { success: false, error }
      }
    },

    async listPrivateInvoices ({ dispatch }, { page = 1, range, status } = {}) {
      try {
        const params = { page }
        if (range) params.range = range
        if (status) params.status = status
        const { data } = await apiClient.get(MEDIATOR_PRIVATE_INVOICES, { params })
        return parseApiResponse(data)
      } catch (error) {
        if (isPremiumGateError(error)) {
          return { success: false, premiumLocked: true, error }
        }
        dispatchApiErrorAlert(dispatch, error)
        return { success: false, error }
      }
    },

    async createPrivateInvoice ({ dispatch }, payload) {
      try {
        const { data } = await apiClient.post(MEDIATOR_PRIVATE_INVOICES, payload)
        const result = parseApiResponse(data)
        dispatch('alert/showAlert', { message: result.message || 'Invoice created', type: 'success' }, { root: true })
        return result
      } catch (error) {
        if (isPremiumGateError(error)) {
          return { success: false, premiumLocked: true, error }
        }
        dispatchApiErrorAlert(dispatch, error)
        return { success: false, error }
      }
    },

    async updatePrivateInvoice ({ dispatch }, { id, payload }) {
      try {
        const { data } = await apiClient.put(`${MEDIATOR_PRIVATE_INVOICES}/${id}`, payload)
        const result = parseApiResponse(data)
        dispatch('alert/showAlert', { message: result.message || 'Invoice updated', type: 'success' }, { root: true })
        return result
      } catch (error) {
        if (isPremiumGateError(error)) {
          return { success: false, premiumLocked: true, error }
        }
        dispatchApiErrorAlert(dispatch, error)
        return { success: false, error }
      }
    },

    async downloadPrivateInvoicePdf ({ dispatch }, { id, invoiceNumber }) {
      try {
        dispatch('spinner/showSpinner')
        const response = await apiClient.get(`${MEDIATOR_PRIVATE_INVOICES}/${id}/pdf`, { responseType: 'blob' })
        const filename = `${invoiceNumber || `private-invoice-${id}`}.pdf`.replace(/[^\w.-]+/g, '_')
        await triggerPdfBlobDownload(response, filename)
        return { success: true }
      } catch (error) {
        if (isPremiumGateError(error)) {
          return { success: false, premiumLocked: true, error }
        }
        const msg = error.message || error.response?.data?.error?.message || 'Download failed'
        dispatch('alert/showAlert', { message: msg, type: 'danger' }, { root: true })
        return { success: false, error }
      } finally {
        dispatch('spinner/hideSpinner')
      }
    }
  }
}
