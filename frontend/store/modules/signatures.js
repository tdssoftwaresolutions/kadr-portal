import { apiClient } from '../../utils/apiClient'
import {
  GET_AGREEMENT_DETAILS_FOR_SIGNATURE,
  SUBMIT_AGREEMENT_SIGNATURE,
  SUBMIT_SIGNATURE,
  GET_SIGNATURE_REQUEST_DETAILS
} from '../endpoints'

export default {
  namespaced: false,
  actions: {
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
    }
  }
}
