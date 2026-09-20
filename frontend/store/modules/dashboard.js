import { apiClient } from '../../utils/apiClient'
import { GET_DASHBOARD_CONTENT_ENDPOINT } from '../endpoints'

// Caches the in-flight *promise*, not just the resolved value. StandardLayout
// prefetches this in parallel with getUserData right after login, and
// Dashboard.vue also fetches it on its own mount — without this, both could
// fire before either resolves and race into two real requests, same issue
// fixed for getPaymentAmounts (see store/modules/payments.js).
let inFlightRequest = null

async function fetchDashboardContent (dispatch, commit) {
  try {
    dispatch('spinner/showSpinner')
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
    inFlightRequest = null
  }
}

export default {
  namespaced: false,
  actions: {
    async getDashboardContent ({ rootState, commit, dispatch }, { force = false } = {}) {
      if (!force && rootState.dashboardContent) return rootState.dashboardContent
      if (!force && inFlightRequest) return inFlightRequest
      inFlightRequest = fetchDashboardContent(dispatch, commit)
      return inFlightRequest
    }
  }
}
