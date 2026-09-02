import { apiClient } from '../../utils/apiClient'
import {
  GET_MY_BLOGS_ENDPOINT,
  GET_BLOG_ASSETS,
  SAVE_BLOG_ENDPOINT,
  DELETE_BLOG_ENDPOINT,
  GET_MY_VIDEO_REELS_ENDPOINT,
  SAVE_VIDEO_REEL_ENDPOINT,
  DELETE_VIDEO_REEL_ENDPOINT
} from '../endpoints'

export default {
  namespaced: false,
  actions: {
    async getMyBlogs ({ commit, dispatch }, { page }) {
      try {
        dispatch('spinner/showSpinner')
        const { data } = await apiClient.get(`${GET_MY_BLOGS_ENDPOINT}?page=${encodeURIComponent(page)}`)
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

    async getBlogAssets ({ commit, dispatch }) {
      try {
        dispatch('spinner/showSpinner')
        const { data } = await apiClient.get(GET_BLOG_ASSETS)
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

    async saveBlog  ({ commit, dispatch }, { blog, status }) {
      try {
        dispatch('spinner/showSpinner')
        const { data } = await apiClient.post(SAVE_BLOG_ENDPOINT, { blog, status })
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

    async deleteBlog ({ commit, dispatch }, blogId) {
      try {
        dispatch('spinner/showSpinner')
        const { data } = await apiClient.delete(`${DELETE_BLOG_ENDPOINT}/${blogId}`)
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

    async getMyVideoReels ({ commit, dispatch }, { page }) {
      try {
        dispatch('spinner/showSpinner')
        const { data } = await apiClient.get(`${GET_MY_VIDEO_REELS_ENDPOINT}?page=${encodeURIComponent(page)}`)
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

    async saveVideoReel ({ commit, dispatch }, { reel }) {
      try {
        dispatch('spinner/showSpinner')
        const { data } = await apiClient.post(SAVE_VIDEO_REEL_ENDPOINT, { reel })
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

    async deleteVideoReel ({ commit, dispatch }, reelId) {
      try {
        dispatch('spinner/showSpinner')
        const { data } = await apiClient.delete(`${DELETE_VIDEO_REEL_ENDPOINT}/${reelId}`)
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
