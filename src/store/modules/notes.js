import { apiClient } from '../../utils/apiClient'
import { SAVE_NOTE_ENDPOINT, DELETE_NOTE_ENDPOINT } from '../endpoints'

export default {
  namespaced: false,
  actions: {
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
    }
  }
}
