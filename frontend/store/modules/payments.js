import { apiClient } from '../../utils/apiClient'
import { dispatchApiErrorAlert, parseApiResponse } from '../helpers'
import {
  PAYMENT_CONFIG_ENDPOINT,
  PAYMENT_INITIATE_ENDPOINT,
  PAYMENT_VERIFY_ENDPOINT,
  PAYMENT_AMOUNTS_ENDPOINT
} from '../endpoints'

// Caches the in-flight *promise*, not just the resolved value. DashboardClient
// and ClientCases both fetch this independently on mount, and both can fire
// before the first request resolves — a plain "if (cachedAmounts) skip"
// check doesn't catch that window, so both used to race and issue two
// identical GET requests. Every concurrent caller now awaits the same
// promise instead.
let cachedAmountsPromise = null

async function fetchPaymentAmounts (dispatch) {
  try {
    const { data } = await apiClient.get(PAYMENT_AMOUNTS_ENDPOINT)
    const result = parseApiResponse(data)
    if (!result.success) cachedAmountsPromise = null
    return result
  } catch (error) {
    cachedAmountsPromise = null
    dispatchApiErrorAlert(dispatch, error)
    return { success: false, error }
  }
}

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
      if (!cachedAmountsPromise) {
        cachedAmountsPromise = fetchPaymentAmounts(dispatch)
      }
      return cachedAmountsPromise
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
