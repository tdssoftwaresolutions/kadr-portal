import { apiClient } from '../../utils/apiClient'
import {
  GET_USER_DATA_ENDPOINT,
  UPDATE_USER_PROFILE,
  DELETE_MY_ACCOUNT_ENDPOINT,
  ADMIN_SET_USER_DELETED_ENDPOINT
} from '../endpoints'

export default {
  namespaced: false,
  actions: {
    async getUserData ({ commit, dispatch }) {
      try {
        dispatch('spinner/showSpinner')
        const { data } = await apiClient.get(GET_USER_DATA_ENDPOINT)
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

    async updateUserProfile ({ state, commit, dispatch }, { name, phone_number, profile_picture, password, current_password, timezone, locale }) {
      try {
        dispatch('spinner/showSpinner')
        const payload = { name, phone_number, profile_picture, password }
        if (current_password) payload.current_password = current_password
        if (timezone !== undefined) payload.timezone = timezone
        if (locale !== undefined) payload.locale = locale
        const { data } = await apiClient.post(UPDATE_USER_PROFILE, payload)
        if (!data.success) throw new Error(data.error.message)
        const updatedUser = data.user || data.data?.user
        if (updatedUser) {
          commit('setUser', {
            ...(state.user || {}),
            ...updatedUser
          })
        }
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

    async deleteMyAccount ({ commit, dispatch }, { confirm }) {
      try {
        dispatch('spinner/showSpinner')
        const { data } = await apiClient.post(DELETE_MY_ACCOUNT_ENDPOINT, { confirm })
        if (!data.success) throw new Error(data.error?.message || data.message)
        return data
      } catch (error) {
        const msg = error.response?.data?.error?.message || error.message || 'Something went wrong'
        dispatch('alert/showAlert', { message: msg, type: 'danger' }, { root: true })
        return { success: false, error }
      } finally {
        dispatch('spinner/hideSpinner')
      }
    },

    async adminSetUserDeleted ({ commit, dispatch }, { userId, isDeleted }) {
      try {
        dispatch('spinner/showSpinner')
        const { data } = await apiClient.post(ADMIN_SET_USER_DELETED_ENDPOINT, { userId, isDeleted })
        if (!data.success) throw new Error(data.error?.message || data.message)
        dispatch('alert/showAlert', { message: data.message, type: 'success' }, { root: true })
        return data
      } catch (error) {
        const msg = error.response?.data?.error?.message || error.message || 'Something went wrong'
        dispatch('alert/showAlert', { message: msg, type: 'danger' }, { root: true })
        return { success: false, error }
      } finally {
        dispatch('spinner/hideSpinner')
      }
    }
  }
}
