import { apiClient } from '../../utils/apiClient'
import { dispatchApiErrorAlert, parseApiResponse } from '../helpers'
import { PUSH_PREFERENCES_ENDPOINT } from '../endpoints'

export default {
  namespaced: false,
  actions: {
    async getPushPreferences ({ dispatch }) {
      try {
        const { data } = await apiClient.get(PUSH_PREFERENCES_ENDPOINT, { meta: { silent: true } })
        return parseApiResponse(data)
      } catch (error) {
        dispatchApiErrorAlert(dispatch, error)
        return { success: false, error }
      }
    },

    async savePushPreferences ({ dispatch }, payload) {
      try {
        const { data } = await apiClient.post(PUSH_PREFERENCES_ENDPOINT, payload)
        const result = parseApiResponse(data)
        dispatch('alert/showAlert', { message: result.message || 'Preferences saved', type: 'success' }, { root: true })
        return result
      } catch (error) {
        dispatchApiErrorAlert(dispatch, error)
        return { success: false, error }
      }
    }
  }
}
