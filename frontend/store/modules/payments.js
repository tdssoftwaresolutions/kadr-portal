import { apiClient } from '../../utils/apiClient'
import { dispatchApiErrorAlert, parseApiResponse } from '../helpers'
import {
  PAYMENT_CONFIG_ENDPOINT,
  PAYMENT_INITIATE_ENDPOINT,
  PAYMENT_VERIFY_ENDPOINT,
  PAYMENT_AMOUNTS_ENDPOINT
} from '../endpoints'

let cachedAmounts = null

export default {
  namespaced: false,
  actions: {
    async getPaymentConfig ({ dispatch }) {
      try {
        const { data } = await apiClient.get(PAYMENT_CONFIG_ENDPOINT)
        return parseApiResponse(data)
      } catch (error) {
        dispatchApiErrorAlert(dispatch, error)
        return { success: false, error }
      }
    },

    // Fixed-price purposes (CLIENT_NOTICE / CLIENT_MEDIATION) are env-configured
    // server-side — fetch once and cache for the session rather than hardcoding.
    async getPaymentAmounts ({ dispatch }) {
      if (cachedAmounts) return { success: true, data: cachedAmounts }
      try {
        const { data } = await apiClient.get(PAYMENT_AMOUNTS_ENDPOINT)
        const result = parseApiResponse(data)
        if (result.success) cachedAmounts = result.data
        return result
      } catch (error) {
        dispatchApiErrorAlert(dispatch, error)
        return { success: false, error }
      }
    },

    async initiatePayment ({ dispatch, commit }, { purpose, caseId, amount }) {
      try {
        dispatch('spinner/showSpinner')
        const { data } = await apiClient.post(PAYMENT_INITIATE_ENDPOINT, { purpose, caseId, amount })
        const result = parseApiResponse(data)
        return result
      } catch (error) {
        dispatchApiErrorAlert(dispatch, error)
        return { success: false, error }
      } finally {
        dispatch('spinner/hideSpinner')
      }
    },

    async verifyPayment ({ dispatch, commit }, { orderId, gatewayPayload }) {
      try {
        dispatch('spinner/showSpinner')
        const { data } = await apiClient.post(PAYMENT_VERIFY_ENDPOINT, { orderId, gatewayPayload })
        const result = parseApiResponse(data)
        if (result.success) {
          commit('invalidateDashboardCaches')
        }
        return result
      } catch (error) {
        dispatchApiErrorAlert(dispatch, error)
        return { success: false, error }
      } finally {
        dispatch('spinner/hideSpinner')
      }
    },

    async purchaseProSubscription ({ dispatch, commit }, { paymentId, amount }) {
      return dispatch('initiatePayment', {
        purpose: 'MEDIATOR_PRO',
        amount
      })
    }
  }
}
