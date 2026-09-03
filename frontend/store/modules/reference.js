import { apiClient } from '../../utils/apiClient'
import { AVAILABLE_LANGUAGES_ENDPOINT } from '../endpoints'

export default {
  namespaced: false,
  actions: {
    async getAllLanguages ({ rootState, commit, dispatch }) {
      if (rootState.allLanguages) return rootState.allLanguages
      try {
        dispatch('spinner/showSpinner')
        const response = await fetch('/languages.json')
        if (!response.ok) throw new Error('Network response was not ok')
        const jsonData = await response.json()
        commit('setAllLanguages', {
          success: true,
          data: jsonData
        })
        return {
          success: true,
          data: jsonData
        }
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

    async getAvailableLanguages ({ rootState, commit, dispatch }) {
      if (rootState.availableLanguages) return rootState.availableLanguages
      try {
        dispatch('spinner/showSpinner')
        const { data } = await apiClient.get(AVAILABLE_LANGUAGES_ENDPOINT)
        if (!data.success) throw new Error(data.error.message)
        commit('setAvailableLanguages', data)
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

    async getStates ({ rootState, commit, dispatch }) {
      if (rootState.availableStates) {
        return rootState.availableStates
      }
      try {
        dispatch('spinner/showSpinner')
        const response = await fetch('/states.json')
        if (!response.ok) throw new Error('Network response was not ok')
        const jsonData = await response.json()
        commit('setAvailableStates', jsonData)
        return jsonData
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
