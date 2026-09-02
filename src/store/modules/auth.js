import { apiClient } from '../../utils/apiClient'
import { setTokens, clearTokens } from '../../utils/tokenStorage'
import { getMobileClientHeaders, isNativeApp } from '../../utils/platform'
import {
  LOGIN_ENDPOINT,
  GOOGLE_LOGIN_ENDPOINT,
  LOGOUT_ENDPOINT,
  SEND_OTP,
  VERIFY_OTP,
  RESET_PASSWORD_ENDPOINT,
  CONFIRM_PASSWORD_CHANGE_ENDPOINT,
  NEW_USER_SIGNUP_ENDPOINT,
  NEW_MEDIATOR_SIGNUP_ENDPOINT,
  GOOGLE_AUTH_ENDPOINT,
  GET_EXISTING_USER_ENDPOINT,
  GOOGLE_TOKEN_ENDPOINT,
  IS_EMAIL_EXIST_ENDPOINT,
  VERIFY_SIGNATURE_ENDPOINT
} from '../endpoints'

export default {
  namespaced: false,
  actions: {
    async login ({ commit, dispatch }, { username, password, userType }) {
      try {
        dispatch('spinner/showSpinner')
        const { data } = await apiClient.post(
          LOGIN_ENDPOINT,
          {
            username,
            password,
            ...(userType ? { userType } : {}),
            ...(isNativeApp() ? { clientType: 'mobile' } : {})
          },
          { headers: getMobileClientHeaders() }
        )
        if (!data.success) throw new Error(data.error.message)
        await setTokens({
          accessToken: data.data.accessToken,
          refreshToken: data.data.refreshToken
        })
        this.$router.push({ name: 'dashboard.home' })
        return data
      } catch (error) {
        const errPayload = error.response?.data?.error
        const msg = errPayload?.message || error.message || 'Something went wrong'
        if (errPayload?.code === 'E111') {
          return {
            success: false,
            needsAccountType: true,
            availableTypes: errPayload?.details?.availableTypes || [],
            message: msg
          }
        }
        dispatch('alert/showAlert', { message: msg, type: 'danger' }, { root: true })
        return {
          success: false,
          error
        }
      } finally {
        dispatch('spinner/hideSpinner')
      }
    },

    async logout ({ commit, dispatch }) {
      try {
        dispatch('spinner/showSpinner')
        const { data } = await apiClient.get(LOGOUT_ENDPOINT)
        await clearTokens()
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

    async googleLogin ({ commit, dispatch }, { credential, userType }) {
      try {
        dispatch('spinner/showSpinner')
        const { data } = await apiClient.post(
          GOOGLE_LOGIN_ENDPOINT,
          {
            credential,
            ...(userType ? { userType } : {}),
            ...(isNativeApp() ? { clientType: 'mobile' } : {})
          },
          { headers: getMobileClientHeaders() }
        )
        if (!data.success) throw new Error(data.error.message)
        await setTokens({
          accessToken: data.data.accessToken,
          refreshToken: data.data.refreshToken
        })
        this.$router.push({ name: 'dashboard.home' })
        return data
      } catch (error) {
        const errPayload = error.response?.data?.error
        const msg = errPayload?.message || error.message || 'Something went wrong'
        if (errPayload?.code === 'E111') {
          return {
            success: false,
            needsAccountType: true,
            availableTypes: errPayload?.details?.availableTypes || [],
            message: msg
          }
        }
        dispatch('alert/showAlert', { message: msg, type: 'danger' }, { root: true })
        return {
          success: false,
          error
        }
      } finally {
        dispatch('spinner/hideSpinner')
      }
    },

    async sendOtp ({ commit, dispatch }, { recordId }) {
      try {
        dispatch('spinner/showSpinner')
        const { data } = await apiClient.post(SEND_OTP, { id: recordId })
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

    async verifyOtp ({ commit, dispatch }, { requestId, otp }) {
      try {
        dispatch('spinner/showSpinner')
        const { data } = await apiClient.post(VERIFY_OTP, { requestId, otp })
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

    async resetPassword ({ commit, dispatch }, { emailAddress }) {
      try {
        dispatch('spinner/showSpinner')
        const { data } = await apiClient.post(RESET_PASSWORD_ENDPOINT, { emailAddress })
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

    async confirmPasswordChange ({ commit, dispatch }, { emailAddress, otp, password }) {
      try {
        dispatch('spinner/showSpinner')
        const { data } = await apiClient.post(CONFIRM_PASSWORD_CHANGE_ENDPOINT, { emailAddress, otp, password })
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

    async newUserSignup ({ commit, dispatch }, { userDetails, existingUser }) {
      try {
        dispatch('spinner/showSpinner')
        const { data } = await apiClient.post(NEW_USER_SIGNUP_ENDPOINT, { ...userDetails, existingUser })
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

    async newMediatorSignup ({ commit, dispatch }, { userDetails }) {
      try {
        dispatch('spinner/showSpinner')
        const { data } = await apiClient.post(NEW_MEDIATOR_SIGNUP_ENDPOINT, { userDetails })
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

    async googleAuth ({ commit, dispatch }) {
      try {
        dispatch('spinner/showSpinner')
        const { data } = await apiClient.get(GOOGLE_AUTH_ENDPOINT)
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

    async getExistingUser ({ commit, dispatch }, { token }) {
      try {
        dispatch('spinner/showSpinner')
        const { data } = await apiClient.get(GET_EXISTING_USER_ENDPOINT, {
          headers: {
            'Authorization': token
          }
        })
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

    async getGoogleAccessToken ({ commit, dispatch }) {
      try {
        dispatch('spinner/showSpinner')
        const { data } = await apiClient.get(GOOGLE_TOKEN_ENDPOINT)
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

    async isEmailExist ({ commit, dispatch }, { emailAddress, type }) {
      try {
        dispatch('spinner/showSpinner')
        const params = new URLSearchParams({ email: emailAddress })
        if (type) params.set('type', String(type).toUpperCase())
        const { data } = await apiClient.get(`${IS_EMAIL_EXIST_ENDPOINT}?${params.toString()}`)
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

    async verifySignature ({ commit, dispatch }, { signature, userData, silent = false }) {
      try {
        if (!silent) dispatch('spinner/showSpinner')
        const { data } = await apiClient.post(VERIFY_SIGNATURE_ENDPOINT, { signature, userData })
        if (!data.success) throw new Error(data.error.message)
        commit('setUser', userData)
        return data
      } catch (error) {
        const msg = error.response?.data?.error?.message || error.message || 'Something went wrong'
        dispatch('alert/showAlert', { message: msg, type: 'danger' }, { root: true })
        return {
          success: false,
          error
        }
      } finally {
        if (!silent) dispatch('spinner/hideSpinner')
      }
    }
  }
}
