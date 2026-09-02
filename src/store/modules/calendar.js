import { apiClient } from '../../utils/apiClient'
import { isPremiumGateError } from '../../utils/mediatorEntitlements'
import { dispatchApiErrorAlert } from '../helpers'
import { GET_CALENDAR_INIT_ENDPOINT, NEW_CALENDAR_EVENT_ENDPOINT } from '../endpoints'

export default {
  namespaced: false,
  actions: {
    async getCalendarInit ({ rootState, commit, dispatch }, { skipCache } = {}) {
      if (!skipCache && rootState.calendarInit) {
        return rootState.calendarInit
      }
      try {
        dispatch('spinner/showSpinner')
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

    async newCalendarEvent ({ commit, dispatch }, { event }) {
      try {
        dispatch('spinner/showSpinner')
        const { data } = await apiClient.post(NEW_CALENDAR_EVENT_ENDPOINT, { ...event })
        if (!data.success) throw new Error(data.error.message)
        commit('invalidateDashboardCaches')
        return data
      } catch (error) {
        if (isPremiumGateError(error)) {
          return { success: false, premiumLocked: true, error }
        }
        dispatchApiErrorAlert(dispatch, error)
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
