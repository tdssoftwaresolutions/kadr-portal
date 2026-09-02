import { apiClient } from '../../utils/apiClient'
import { GET_DASHBOARD_CONTENT_ENDPOINT } from '../endpoints'

export default {
  namespaced: false,
  actions: {
    async getDashboardContent ({ rootState, commit, dispatch }, { force = false } = {}) {
      if (!force && rootState.dashboardContent) return rootState.dashboardContent
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
      }
    }
  }
}
