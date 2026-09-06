import { apiClient } from '../../utils/apiClient'
import { dispatchApiErrorAlert, parseApiResponse } from '../helpers'
import {
  UPDATE_INACTIVE_USER_ENDPOINT,
  GET_INACTIVE_USERS_ENDPOINT,
  GET_ACTIVE_USERS_ENDPOINT,
  GET_ADMIN_ACTIVE_CASES_ENDPOINT,
  GET_ADMIN_CASE_META_ENDPOINT,
  POST_ADMIN_ASSIGN_CASE_MEDIATOR_ENDPOINT,
  APPROVE_CASE_TYPE_ENDPOINT,
  ADD_CASE_REPRESENTATIVE_ENDPOINT,
  GET_SETTINGS_ENDPOINT,
  POST_SETTINGS_ENDPOINT,
  GET_ADMIN_WEBSITE_CONTENT_ENDPOINT,
  ADMIN_BLOG_TAXONOMY_ENDPOINT,
  ADMIN_BLOG_CATEGORIES_ENDPOINT,
  ADMIN_BLOG_TAGS_ENDPOINT,
  ADMIN_USERS_ENDPOINT,
  ADMIN_USERS_ACTIVE_ENDPOINT,
  ADMIN_MEDIATOR_OFFBOARDING_PREVIEW,
  ADMIN_PREMIUM_FEATURES,
  ADMIN_REWARD_FULFILLMENT_RULES,
  ADMIN_NOTIFICATION_TEMPLATES,
  ADMIN_NOTIFICATION_CHANNEL_SETTINGS,
  ADMIN_NOTIFICATION_USERS,
  ADMIN_NOTIFICATION_SEND,
  ADMIN_NOTIFICATION_SEND_LOGS,
  ADMIN_NOTIFICATION_PREVIEW_LAYOUT,
  ADMIN_REWARD_CATALOG_ENDPOINT,
  ADMIN_REWARD_ORDERS_ENDPOINT,
  ADMIN_COUPONS_ENDPOINT,
  PUBLIC_COUPON_LOOKUP_ENDPOINT
} from '../endpoints'

export default {
  namespaced: false,
  actions: {
    async updateInactiveUsers ({ commit, dispatch }, { isActive, caseId, userId, caseType, sendWelcomeEmail = true }) {
      try {
        dispatch('spinner/showSpinner')
        const { data } = await apiClient.post(UPDATE_INACTIVE_USER_ENDPOINT, { isActive, caseId, userId, caseType, sendWelcomeEmail })
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

    async getInactiveUsers ({ commit, dispatch }, { page, type }) {
      try {
        dispatch('spinner/showSpinner')
        const { data } = await apiClient.get(`${GET_INACTIVE_USERS_ENDPOINT}?page=${encodeURIComponent(page)}&type=${encodeURIComponent(type)}`)
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

    async getActiveUsers ({ commit, dispatch }, { page, type, includeInactive = false, includeDeleted = false }) {
      try {
        dispatch('spinner/showSpinner')
        const params = type
          ? `?page=${encodeURIComponent(page)}&type=${encodeURIComponent(type)}&includeInactive=${encodeURIComponent(includeInactive)}&includeDeleted=${encodeURIComponent(includeDeleted)}`
          : `?page=${encodeURIComponent(page)}&includeInactive=${encodeURIComponent(includeInactive)}&includeDeleted=${encodeURIComponent(includeDeleted)}`
        const { data } = await apiClient.get(`${GET_ACTIVE_USERS_ENDPOINT}${params}`)
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

    async getAdminActiveCases ({ dispatch }, { page, mediatorId, firstPartyId, secondPartyId, status }) {
      try {
        dispatch('spinner/showSpinner')
        const params = new URLSearchParams()
        params.set('page', String(page || 1))
        if (mediatorId) params.set('mediatorId', mediatorId)
        if (firstPartyId) params.set('firstPartyId', firstPartyId)
        if (secondPartyId) params.set('secondPartyId', secondPartyId)
        if (status) params.set('status', status)
        const { data } = await apiClient.get(`${GET_ADMIN_ACTIVE_CASES_ENDPOINT}?${params.toString()}`)
        if (!data.success) throw new Error(data.error?.message || 'Request failed')
        return data
      } catch (error) {
        const msg = error.response?.data?.error?.message || error.message || 'Something went wrong'
        dispatch('alert/showAlert', { message: msg, type: 'danger' }, { root: true })
        return { success: false, error }
      } finally {
        dispatch('spinner/hideSpinner')
      }
    },

    async getAdminCaseManagementMeta ({ dispatch }) {
      try {
        dispatch('spinner/showSpinner')
        const { data } = await apiClient.get(GET_ADMIN_CASE_META_ENDPOINT)
        if (!data.success) throw new Error(data.error?.message || 'Request failed')
        return data
      } catch (error) {
        const msg = error.response?.data?.error?.message || error.message || 'Something went wrong'
        dispatch('alert/showAlert', { message: msg, type: 'danger' }, { root: true })
        return { success: false, error }
      } finally {
        dispatch('spinner/hideSpinner')
      }
    },

    async adminAssignCaseMediator ({ dispatch }, { caseId, mediatorId }) {
      try {
        dispatch('spinner/showSpinner')
        const { data } = await apiClient.post(POST_ADMIN_ASSIGN_CASE_MEDIATOR_ENDPOINT, { caseId, mediatorId })
        if (!data.success) throw new Error(data.error?.message || 'Request failed')
        dispatch('alert/showAlert', { message: data.message || 'Mediator updated', type: 'success' }, { root: true })
        return data
      } catch (error) {
        const msg = error.response?.data?.error?.message || error.message || 'Something went wrong'
        dispatch('alert/showAlert', { message: msg, type: 'danger' }, { root: true })
        return { success: false, error }
      } finally {
        dispatch('spinner/hideSpinner')
      }
    },

    async approveCaseType ({ dispatch }, { caseId, caseType }) {
      try {
        dispatch('spinner/showSpinner')
        const { data } = await apiClient.post(APPROVE_CASE_TYPE_ENDPOINT, { caseId, caseType })
        if (!data.success) throw new Error(data.error?.message || 'Request failed')
        dispatch('alert/showAlert', {
          message: data.message || 'Case type approved. Client can proceed with notice payment.',
          type: 'success'
        }, { root: true })
        return data
      } catch (error) {
        const msg = error.response?.data?.error?.message || error.message || 'Something went wrong'
        dispatch('alert/showAlert', { message: msg, type: 'danger' }, { root: true })
        return { success: false, error }
      } finally {
        dispatch('spinner/hideSpinner')
      }
    },

    async addCaseRepresentative ({ dispatch }, { caseId, side, representativeEmail, representativeName, representativePhone, allowReplace }) {
      try {
        dispatch('spinner/showSpinner')
        const { data } = await apiClient.post(ADD_CASE_REPRESENTATIVE_ENDPOINT, {
          caseId,
          side,
          representativeEmail,
          representativeName,
          representativePhone,
          allowReplace
        })
        if (!data.success) throw new Error(data.error?.message || 'Request failed')
        dispatch('alert/showAlert', {
          message: data.message || 'Representative added to the case.',
          type: 'success'
        }, { root: true })
        return data
      } catch (error) {
        const msg = error.response?.data?.error?.message || error.message || 'Something went wrong'
        dispatch('alert/showAlert', { message: msg, type: 'danger' }, { root: true })
        return { success: false, error }
      } finally {
        dispatch('spinner/hideSpinner')
      }
    },

    async getAdminSettings ({ dispatch }) {
      try {
        dispatch('spinner/showSpinner')
        const { data } = await apiClient.get(GET_SETTINGS_ENDPOINT)
        if (!data.success) throw new Error(data.error?.message || 'Request failed')
        return data
      } catch (error) {
        const msg = error.response?.data?.error?.message || error.message || 'Something went wrong'
        dispatch('alert/showAlert', { message: msg, type: 'danger' }, { root: true })
        return { success: false, error }
      } finally {
        dispatch('spinner/hideSpinner')
      }
    },

    async saveAdminSettings ({ dispatch }, payload) {
      try {
        dispatch('spinner/showSpinner')
        const { data } = await apiClient.post(POST_SETTINGS_ENDPOINT, payload)
        if (!data.success) throw new Error(data.error?.message || 'Request failed')
        dispatch('alert/showAlert', { message: data.message || 'Settings saved', type: 'success' }, { root: true })
        return data
      } catch (error) {
        const msg = error.response?.data?.error?.message || error.message || 'Something went wrong'
        dispatch('alert/showAlert', { message: msg, type: 'danger' }, { root: true })
        return { success: false, error }
      } finally {
        dispatch('spinner/hideSpinner')
      }
    },

    async getAdminWebsiteContent ({ dispatch }) {
      try {
        dispatch('spinner/showSpinner')
        const { data } = await apiClient.get(GET_ADMIN_WEBSITE_CONTENT_ENDPOINT)
        if (!data.success) throw new Error(data.error?.message || 'Request failed')
        return data
      } catch (error) {
        const msg = error.response?.data?.error?.message || error.message || 'Something went wrong'
        dispatch('alert/showAlert', { message: msg, type: 'danger' }, { root: true })
        return { success: false, error }
      } finally {
        dispatch('spinner/hideSpinner')
      }
    },

    async saveAdminWebsiteSettings ({ dispatch }, payload) {
      try {
        dispatch('spinner/showSpinner')
        const { data } = await apiClient.put(`${GET_ADMIN_WEBSITE_CONTENT_ENDPOINT}/settings`, payload)
        if (!data.success) throw new Error(data.error?.message || 'Request failed')
        dispatch('alert/showAlert', { message: data.message || 'Saved', type: 'success' }, { root: true })
        return data
      } catch (error) {
        const msg = error.response?.data?.error?.message || error.message || 'Something went wrong'
        dispatch('alert/showAlert', { message: msg, type: 'danger' }, { root: true })
        return { success: false, error }
      } finally {
        dispatch('spinner/hideSpinner')
      }
    },

    async saveAdminWebsiteBanner ({ dispatch }, payload) {
      try {
        dispatch('spinner/showSpinner')
        const { data } = await apiClient.put(`${GET_ADMIN_WEBSITE_CONTENT_ENDPOINT}/banner`, payload)
        if (!data.success) throw new Error(data.error?.message || 'Request failed')
        dispatch('alert/showAlert', { message: data.message || 'Saved', type: 'success' }, { root: true })
        return data
      } catch (error) {
        const msg = error.response?.data?.error?.message || error.message || 'Something went wrong'
        dispatch('alert/showAlert', { message: msg, type: 'danger' }, { root: true })
        return { success: false, error }
      } finally {
        dispatch('spinner/hideSpinner')
      }
    },

    async saveAdminWebsiteTestimonial ({ dispatch }, payload) {
      try {
        dispatch('spinner/showSpinner')
        const { data } = await apiClient.post(`${GET_ADMIN_WEBSITE_CONTENT_ENDPOINT}/testimonials`, payload)
        if (!data.success) throw new Error(data.error?.message || 'Request failed')
        dispatch('alert/showAlert', { message: data.message || 'Saved', type: 'success' }, { root: true })
        return data
      } catch (error) {
        const msg = error.response?.data?.error?.message || error.message || 'Something went wrong'
        dispatch('alert/showAlert', { message: msg, type: 'danger' }, { root: true })
        return { success: false, error }
      } finally {
        dispatch('spinner/hideSpinner')
      }
    },

    async deleteAdminWebsiteTestimonial ({ dispatch }, id) {
      try {
        dispatch('spinner/showSpinner')
        const { data } = await apiClient.delete(`${GET_ADMIN_WEBSITE_CONTENT_ENDPOINT}/testimonials/${id}`)
        if (!data.success) throw new Error(data.error?.message || 'Request failed')
        dispatch('alert/showAlert', { message: data.message || 'Deleted', type: 'success' }, { root: true })
        return data
      } catch (error) {
        const msg = error.response?.data?.error?.message || error.message || 'Something went wrong'
        dispatch('alert/showAlert', { message: msg, type: 'danger' }, { root: true })
        return { success: false, error }
      } finally {
        dispatch('spinner/hideSpinner')
      }
    },

    async saveAdminWebsitePricingPlan ({ dispatch }, payload) {
      try {
        dispatch('spinner/showSpinner')
        const { data } = await apiClient.post(`${GET_ADMIN_WEBSITE_CONTENT_ENDPOINT}/pricing-plans`, payload)
        if (!data.success) throw new Error(data.error?.message || 'Request failed')
        dispatch('alert/showAlert', { message: data.message || 'Saved', type: 'success' }, { root: true })
        return data
      } catch (error) {
        const msg = error.response?.data?.error?.message || error.message || 'Something went wrong'
        dispatch('alert/showAlert', { message: msg, type: 'danger' }, { root: true })
        return { success: false, error }
      } finally {
        dispatch('spinner/hideSpinner')
      }
    },

    async deleteAdminWebsitePricingPlan ({ dispatch }, id) {
      try {
        dispatch('spinner/showSpinner')
        const { data } = await apiClient.delete(`${GET_ADMIN_WEBSITE_CONTENT_ENDPOINT}/pricing-plans/${id}`)
        if (!data.success) throw new Error(data.error?.message || 'Request failed')
        dispatch('alert/showAlert', { message: data.message || 'Deleted', type: 'success' }, { root: true })
        return data
      } catch (error) {
        const msg = error.response?.data?.error?.message || error.message || 'Something went wrong'
        dispatch('alert/showAlert', { message: msg, type: 'danger' }, { root: true })
        return { success: false, error }
      } finally {
        dispatch('spinner/hideSpinner')
      }
    },

    async saveAdminWebsiteFaqCategory ({ dispatch }, payload) {
      try {
        dispatch('spinner/showSpinner')
        const { data } = await apiClient.post(`${GET_ADMIN_WEBSITE_CONTENT_ENDPOINT}/faq-categories`, payload)
        if (!data.success) throw new Error(data.error?.message || 'Request failed')
        dispatch('alert/showAlert', { message: data.message || 'Saved', type: 'success' }, { root: true })
        return data
      } catch (error) {
        const msg = error.response?.data?.error?.message || error.message || 'Something went wrong'
        dispatch('alert/showAlert', { message: msg, type: 'danger' }, { root: true })
        return { success: false, error }
      } finally {
        dispatch('spinner/hideSpinner')
      }
    },

    async deleteAdminWebsiteFaqCategory ({ dispatch }, id) {
      try {
        dispatch('spinner/showSpinner')
        const { data } = await apiClient.delete(`${GET_ADMIN_WEBSITE_CONTENT_ENDPOINT}/faq-categories/${id}`)
        if (!data.success) throw new Error(data.error?.message || 'Request failed')
        dispatch('alert/showAlert', { message: data.message || 'Deleted', type: 'success' }, { root: true })
        return data
      } catch (error) {
        const msg = error.response?.data?.error?.message || error.message || 'Something went wrong'
        dispatch('alert/showAlert', { message: msg, type: 'danger' }, { root: true })
        return { success: false, error }
      } finally {
        dispatch('spinner/hideSpinner')
      }
    },

    async saveAdminWebsiteFaqItem ({ dispatch }, payload) {
      try {
        dispatch('spinner/showSpinner')
        const { data } = await apiClient.post(`${GET_ADMIN_WEBSITE_CONTENT_ENDPOINT}/faq-items`, payload)
        if (!data.success) throw new Error(data.error?.message || 'Request failed')
        dispatch('alert/showAlert', { message: data.message || 'Saved', type: 'success' }, { root: true })
        return data
      } catch (error) {
        const msg = error.response?.data?.error?.message || error.message || 'Something went wrong'
        dispatch('alert/showAlert', { message: msg, type: 'danger' }, { root: true })
        return { success: false, error }
      } finally {
        dispatch('spinner/hideSpinner')
      }
    },

    async deleteAdminWebsiteFaqItem ({ dispatch }, id) {
      try {
        dispatch('spinner/showSpinner')
        const { data } = await apiClient.delete(`${GET_ADMIN_WEBSITE_CONTENT_ENDPOINT}/faq-items/${id}`)
        if (!data.success) throw new Error(data.error?.message || 'Request failed')
        dispatch('alert/showAlert', { message: data.message || 'Deleted', type: 'success' }, { root: true })
        return data
      } catch (error) {
        const msg = error.response?.data?.error?.message || error.message || 'Something went wrong'
        dispatch('alert/showAlert', { message: msg, type: 'danger' }, { root: true })
        return { success: false, error }
      } finally {
        dispatch('spinner/hideSpinner')
      }
    },

    async regenerateAdminWebsiteContent ({ dispatch }) {
      try {
        dispatch('spinner/showSpinner')
        const { data } = await apiClient.post(`${GET_ADMIN_WEBSITE_CONTENT_ENDPOINT}/regenerate`)
        if (!data.success) throw new Error(data.error?.message || 'Request failed')
        dispatch('alert/showAlert', { message: data.message || 'Pages regenerated', type: 'success' }, { root: true })
        return data
      } catch (error) {
        const msg = error.response?.data?.error?.message || error.message || 'Something went wrong'
        dispatch('alert/showAlert', { message: msg, type: 'danger' }, { root: true })
        return { success: false, error }
      } finally {
        dispatch('spinner/hideSpinner')
      }
    },

    async getAdminBlogTaxonomy ({ dispatch }) {
      try {
        dispatch('spinner/showSpinner')
        const { data } = await apiClient.get(ADMIN_BLOG_TAXONOMY_ENDPOINT)
        if (!data.success) throw new Error(data.error?.message || 'Request failed')
        return data
      } catch (error) {
        const msg = error.response?.data?.error?.message || error.response?.data?.message || error.message || 'Something went wrong'
        dispatch('alert/showAlert', { message: msg, type: 'danger' }, { root: true })
        return { success: false, error }
      } finally {
        dispatch('spinner/hideSpinner')
      }
    },

    async createBlogCategory ({ dispatch }, { name }) {
      try {
        dispatch('spinner/showSpinner')
        const { data } = await apiClient.post(ADMIN_BLOG_CATEGORIES_ENDPOINT, { name })
        if (!data.success) throw new Error(data.error?.message || 'Request failed')
        return data
      } catch (error) {
        const msg = error.response?.data?.error?.message || error.response?.data?.message || error.message || 'Something went wrong'
        dispatch('alert/showAlert', { message: msg, type: 'danger' }, { root: true })
        return { success: false, error }
      } finally {
        dispatch('spinner/hideSpinner')
      }
    },

    async updateBlogCategory ({ dispatch }, { id, name }) {
      try {
        dispatch('spinner/showSpinner')
        const { data } = await apiClient.put(ADMIN_BLOG_CATEGORIES_ENDPOINT, { id, name })
        if (!data.success) throw new Error(data.error?.message || 'Request failed')
        return data
      } catch (error) {
        const msg = error.response?.data?.error?.message || error.response?.data?.message || error.message || 'Something went wrong'
        dispatch('alert/showAlert', { message: msg, type: 'danger' }, { root: true })
        return { success: false, error }
      } finally {
        dispatch('spinner/hideSpinner')
      }
    },

    async deleteBlogCategory ({ dispatch }, { id }) {
      try {
        dispatch('spinner/showSpinner')
        const { data } = await apiClient.delete(`${ADMIN_BLOG_CATEGORIES_ENDPOINT}/${id}`)
        if (!data.success) throw new Error(data.error?.message || 'Request failed')
        return data
      } catch (error) {
        const msg = error.response?.data?.error?.message || error.response?.data?.message || error.message || 'Something went wrong'
        dispatch('alert/showAlert', { message: msg, type: 'danger' }, { root: true })
        return { success: false, error }
      } finally {
        dispatch('spinner/hideSpinner')
      }
    },

    async createBlogTag ({ dispatch }, { name }) {
      try {
        dispatch('spinner/showSpinner')
        const { data } = await apiClient.post(ADMIN_BLOG_TAGS_ENDPOINT, { name })
        if (!data.success) throw new Error(data.error?.message || 'Request failed')
        return data
      } catch (error) {
        const msg = error.response?.data?.error?.message || error.response?.data?.message || error.message || 'Something went wrong'
        dispatch('alert/showAlert', { message: msg, type: 'danger' }, { root: true })
        return { success: false, error }
      } finally {
        dispatch('spinner/hideSpinner')
      }
    },

    async updateBlogTag ({ dispatch }, { id, name }) {
      try {
        dispatch('spinner/showSpinner')
        const { data } = await apiClient.put(ADMIN_BLOG_TAGS_ENDPOINT, { id, name })
        if (!data.success) throw new Error(data.error?.message || 'Request failed')
        return data
      } catch (error) {
        const msg = error.response?.data?.error?.message || error.response?.data?.message || error.message || 'Something went wrong'
        dispatch('alert/showAlert', { message: msg, type: 'danger' }, { root: true })
        return { success: false, error }
      } finally {
        dispatch('spinner/hideSpinner')
      }
    },

    async deleteBlogTag ({ dispatch }, { id }) {
      try {
        dispatch('spinner/showSpinner')
        const { data } = await apiClient.delete(`${ADMIN_BLOG_TAGS_ENDPOINT}/${id}`)
        if (!data.success) throw new Error(data.error?.message || 'Request failed')
        return data
      } catch (error) {
        const msg = error.response?.data?.error?.message || error.response?.data?.message || error.message || 'Something went wrong'
        dispatch('alert/showAlert', { message: msg, type: 'danger' }, { root: true })
        return { success: false, error }
      } finally {
        dispatch('spinner/hideSpinner')
      }
    },

    async getAdminUsers ({ dispatch }) {
      try {
        dispatch('spinner/showSpinner')
        const { data } = await apiClient.get(ADMIN_USERS_ENDPOINT)
        if (!data.success) throw new Error(data.error?.message || 'Request failed')
        return data
      } catch (error) {
        const msg = error.response?.data?.error?.message || error.response?.data?.message || error.message || 'Something went wrong'
        dispatch('alert/showAlert', { message: msg, type: 'danger' }, { root: true })
        return { success: false, error }
      } finally {
        dispatch('spinner/hideSpinner')
      }
    },

    async createAdminUser ({ dispatch }, payload) {
      try {
        dispatch('spinner/showSpinner')
        const { data } = await apiClient.post(ADMIN_USERS_ENDPOINT, payload)
        if (!data.success) throw new Error(data.error?.message || 'Request failed')
        return data
      } catch (error) {
        const msg = error.response?.data?.error?.message || error.response?.data?.message || error.message || 'Something went wrong'
        dispatch('alert/showAlert', { message: msg, type: 'danger' }, { root: true })
        return { success: false, error }
      } finally {
        dispatch('spinner/hideSpinner')
      }
    },

    async updateAdminUser ({ dispatch }, payload) {
      try {
        dispatch('spinner/showSpinner')
        const { data } = await apiClient.put(ADMIN_USERS_ENDPOINT, payload)
        if (!data.success) throw new Error(data.error?.message || 'Request failed')
        return data
      } catch (error) {
        const msg = error.response?.data?.error?.message || error.response?.data?.message || error.message || 'Something went wrong'
        dispatch('alert/showAlert', { message: msg, type: 'danger' }, { root: true })
        return { success: false, error }
      } finally {
        dispatch('spinner/hideSpinner')
      }
    },

    async setAdminUserActive ({ dispatch }, { userId, active }) {
      try {
        dispatch('spinner/showSpinner')
        const { data } = await apiClient.post(ADMIN_USERS_ACTIVE_ENDPOINT, { userId, active })
        if (!data.success) throw new Error(data.error?.message || 'Request failed')
        return data
      } catch (error) {
        const msg = error.response?.data?.error?.message || error.response?.data?.message || error.message || 'Something went wrong'
        dispatch('alert/showAlert', { message: msg, type: 'danger' }, { root: true })
        return { success: false, error }
      } finally {
        dispatch('spinner/hideSpinner')
      }
    },

    async getMediatorOffboardingPreview ({ dispatch }, { mediatorId }) {
      try {
        const { data } = await apiClient.get(`${ADMIN_MEDIATOR_OFFBOARDING_PREVIEW}/${mediatorId}/offboarding-preview`)
        return parseApiResponse(data)
      } catch (error) {
        const msg = error.response?.data?.error?.message || error.message || 'Something went wrong'
        dispatch('alert/showAlert', { message: msg, type: 'danger' }, { root: true })
        return { success: false, error }
      }
    },

    async completeMediatorOffboarding ({ dispatch }, payload) {
      try {
        dispatch('spinner/showSpinner')
        const { data } = await apiClient.post(
            `${ADMIN_MEDIATOR_OFFBOARDING_PREVIEW}/${payload.mediatorId}/complete-offboarding`,
            payload
        )
        const result = parseApiResponse(data)
        dispatch('alert/showAlert', { message: result.message || 'Mediator removed', type: 'success' }, { root: true })
        return result
      } catch (error) {
        const msg = error.response?.data?.error?.message || error.message || 'Something went wrong'
        dispatch('alert/showAlert', { message: msg, type: 'danger' }, { root: true })
        return { success: false, error }
      } finally {
        dispatch('spinner/hideSpinner')
      }
    },

    async getMediator360 ({ dispatch }, { mediatorId }) {
      try {
        const { data } = await apiClient.get(`${ADMIN_MEDIATOR_OFFBOARDING_PREVIEW}/${mediatorId}/360`)
        return parseApiResponse(data)
      } catch (error) {
        const msg = error.response?.data?.error?.message || error.message || 'Something went wrong'
        dispatch('alert/showAlert', { message: msg, type: 'danger' }, { root: true })
        return { success: false, error }
      }
    },

    async getPremiumFeaturesAdmin ({ dispatch }) {
      try {
        const { data } = await apiClient.get(ADMIN_PREMIUM_FEATURES)
        return parseApiResponse(data)
      } catch (error) {
        const msg = error.response?.data?.error?.message || error.message || 'Something went wrong'
        dispatch('alert/showAlert', { message: msg, type: 'danger' }, { root: true })
        return { success: false, error }
      }
    },

    async updatePremiumFeature ({ dispatch }, payload) {
      try {
        const { data } = await apiClient.post(ADMIN_PREMIUM_FEATURES, payload)
        return parseApiResponse(data)
      } catch (error) {
        const msg = error.response?.data?.error?.message || error.message || 'Something went wrong'
        dispatch('alert/showAlert', { message: msg, type: 'danger' }, { root: true })
        return { success: false, error }
      }
    },

    async getRewardFulfillmentRules ({ dispatch }) {
      try {
        const { data } = await apiClient.get(ADMIN_REWARD_FULFILLMENT_RULES)
        return parseApiResponse(data)
      } catch (error) {
        const msg = error.response?.data?.error?.message || error.message || 'Something went wrong'
        dispatch('alert/showAlert', { message: msg, type: 'danger' }, { root: true })
        return { success: false, error }
      }
    },

    async saveRewardFulfillmentRule ({ dispatch }, payload) {
      try {
        const { data } = await apiClient.post(ADMIN_REWARD_FULFILLMENT_RULES, payload)
        const result = parseApiResponse(data)
        dispatch('alert/showAlert', { message: result.message || 'Rule saved', type: 'success' }, { root: true })
        return result
      } catch (error) {
        const msg = error.response?.data?.error?.message || error.message || 'Something went wrong'
        dispatch('alert/showAlert', { message: msg, type: 'danger' }, { root: true })
        return { success: false, error }
      }
    },

    async deleteRewardFulfillmentRule ({ dispatch }, { id }) {
      try {
        const { data } = await apiClient.delete(`${ADMIN_REWARD_FULFILLMENT_RULES}/${id}`)
        const result = parseApiResponse(data)
        dispatch('alert/showAlert', { message: result.message || 'Rule deleted', type: 'success' }, { root: true })
        return result
      } catch (error) {
        const msg = error.response?.data?.error?.message || error.message || 'Something went wrong'
        dispatch('alert/showAlert', { message: msg, type: 'danger' }, { root: true })
        return { success: false, error }
      }
    },

    async getNotificationTemplates ({ dispatch }, { channel } = {}) {
      try {
        const qs = channel ? `?channel=${encodeURIComponent(channel)}` : ''
        const { data } = await apiClient.get(`${ADMIN_NOTIFICATION_TEMPLATES}${qs}`)
        return parseApiResponse(data)
      } catch (error) {
        dispatchApiErrorAlert(dispatch, error)
        return { success: false, error }
      }
    },

    async saveNotificationTemplate ({ dispatch }, payload) {
      try {
        const { data } = await apiClient.post(ADMIN_NOTIFICATION_TEMPLATES, payload)
        const result = parseApiResponse(data)
        dispatch('alert/showAlert', { message: result.message || 'Template saved', type: 'success' }, { root: true })
        return result
      } catch (error) {
        dispatchApiErrorAlert(dispatch, error)
        return { success: false, error }
      }
    },

    async deleteNotificationTemplate ({ dispatch }, { id }) {
      try {
        const { data } = await apiClient.delete(`${ADMIN_NOTIFICATION_TEMPLATES}/${id}`)
        const result = parseApiResponse(data)
        dispatch('alert/showAlert', { message: result.message || 'Template deleted', type: 'success' }, { root: true })
        return result
      } catch (error) {
        dispatchApiErrorAlert(dispatch, error)
        return { success: false, error }
      }
    },

    async previewNotificationTemplate ({ dispatch }, payload) {
      try {
        const { data } = await apiClient.post(`${ADMIN_NOTIFICATION_TEMPLATES}/preview`, payload)
        return parseApiResponse(data)
      } catch (error) {
        dispatchApiErrorAlert(dispatch, error)
        return { success: false, error }
      }
    },

    async getNotificationChannelSettings ({ dispatch }) {
      try {
        const { data } = await apiClient.get(ADMIN_NOTIFICATION_CHANNEL_SETTINGS)
        return parseApiResponse(data)
      } catch (error) {
        dispatchApiErrorAlert(dispatch, error)
        return { success: false, error }
      }
    },

    async saveNotificationChannelSettings ({ dispatch }, payload) {
      try {
        const { data } = await apiClient.post(ADMIN_NOTIFICATION_CHANNEL_SETTINGS, payload)
        const result = parseApiResponse(data)
        dispatch('alert/showAlert', { message: result.message || 'Channel settings saved', type: 'success' }, { root: true })
        return result
      } catch (error) {
        dispatchApiErrorAlert(dispatch, error)
        return { success: false, error }
      }
    },

    async searchNotificationUsers ({ dispatch }, { q, types }) {
      try {
        const params = new URLSearchParams()
        if (q) params.set('q', q)
        if (types && types.length) params.set('types', types.join(','))
        const query = params.toString()
        const { data } = await apiClient.get(query ? `${ADMIN_NOTIFICATION_USERS}?${query}` : ADMIN_NOTIFICATION_USERS)
        return parseApiResponse(data)
      } catch (error) {
        dispatchApiErrorAlert(dispatch, error)
        return { success: false, error }
      }
    },

    async sendAdminNotifications ({ dispatch }, payload) {
      try {
        dispatch('spinner/showSpinner', null, { root: true })
        const { data } = await apiClient.post(ADMIN_NOTIFICATION_SEND, payload)
        const result = parseApiResponse(data)
        dispatch('alert/showAlert', { message: result.message || 'Notifications sent', type: 'success' }, { root: true })
        return result
      } catch (error) {
        dispatchApiErrorAlert(dispatch, error)
        return { success: false, error }
      } finally {
        dispatch('spinner/hideSpinner', null, { root: true })
      }
    },

    async getNotificationSendLogs ({ dispatch }) {
      try {
        const { data } = await apiClient.get(ADMIN_NOTIFICATION_SEND_LOGS)
        return parseApiResponse(data)
      } catch (error) {
        dispatchApiErrorAlert(dispatch, error)
        return { success: false, error }
      }
    },

    async previewEmailLayout ({ dispatch }, { headerHtml, footerHtml }) {
      try {
        const { data } = await apiClient.post(ADMIN_NOTIFICATION_PREVIEW_LAYOUT, { headerHtml, footerHtml })
        return parseApiResponse(data)
      } catch (error) {
        dispatchApiErrorAlert(dispatch, error)
        return { success: false, error }
      }
    },

    async getRewardCatalogAdmin ({ commit, dispatch }) {
      try {
        const { data } = await apiClient.get(ADMIN_REWARD_CATALOG_ENDPOINT)
        if (!data.success) throw new Error(data.error?.message || data.message)
        return data
      } catch (error) {
        const msg = error.response?.data?.error?.message || error.message || 'Something went wrong'
        dispatch('alert/showAlert', { message: msg, type: 'danger' }, { root: true })
        return { success: false, error }
      }
    },

    async saveRewardCatalogItem ({ commit, dispatch }, payload) {
      try {
        dispatch('spinner/showSpinner')
        const { data } = await apiClient.post(ADMIN_REWARD_CATALOG_ENDPOINT, payload)
        if (!data.success) throw new Error(data.error?.message || data.message)
        dispatch('alert/showAlert', { message: data.message || 'Saved', type: 'success' }, { root: true })
        return data
      } catch (error) {
        const msg = error.response?.data?.error?.message || error.message || 'Something went wrong'
        dispatch('alert/showAlert', { message: msg, type: 'danger' }, { root: true })
        return { success: false, error }
      } finally {
        dispatch('spinner/hideSpinner')
      }
    },

    async deleteRewardCatalogItem ({ commit, dispatch }, { id }) {
      try {
        dispatch('spinner/showSpinner')
        const { data } = await apiClient.delete(`${ADMIN_REWARD_CATALOG_ENDPOINT}/${id}`)
        if (!data.success) throw new Error(data.error?.message || data.message)
        dispatch('alert/showAlert', { message: data.message || 'Removed', type: 'success' }, { root: true })
        return data
      } catch (error) {
        const msg = error.response?.data?.error?.message || error.message || 'Something went wrong'
        dispatch('alert/showAlert', { message: msg, type: 'danger' }, { root: true })
        return { success: false, error }
      } finally {
        dispatch('spinner/hideSpinner')
      }
    },

    async getRewardOrdersAdmin ({ commit, dispatch }, { page = 1, status }) {
      try {
        dispatch('spinner/showSpinner')
        let url = `${ADMIN_REWARD_ORDERS_ENDPOINT}?page=${encodeURIComponent(page)}`
        if (status) url += `&status=${encodeURIComponent(status)}`
        const { data } = await apiClient.get(url)
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

    async fulfillRewardOrder ({ commit, dispatch }, { id, admin_notes }) {
      try {
        dispatch('spinner/showSpinner')
        const { data } = await apiClient.post(`${ADMIN_REWARD_ORDERS_ENDPOINT}/${id}/fulfill`, { admin_notes })
        if (!data.success) throw new Error(data.error?.message || data.message)
        dispatch('alert/showAlert', { message: data.message || 'Order fulfilled', type: 'success' }, { root: true })
        return data
      } catch (error) {
        const msg = error.response?.data?.error?.message || error.message || 'Something went wrong'
        dispatch('alert/showAlert', { message: msg, type: 'danger' }, { root: true })
        return { success: false, error }
      } finally {
        dispatch('spinner/hideSpinner')
      }
    },

    // ----- Coupon codes (admin CRUD) -----
    async getCoupons ({ dispatch }) {
      try {
        const { data } = await apiClient.get(ADMIN_COUPONS_ENDPOINT)
        if (!data.success) throw new Error(data.error?.message || data.message)
        return data
      } catch (error) {
        const msg = error.response?.data?.error?.message || error.message || 'Something went wrong'
        dispatch('alert/showAlert', { message: msg, type: 'danger' }, { root: true })
        return { success: false, error }
      }
    },

    async createCoupon ({ dispatch }, payload) {
      try {
        dispatch('spinner/showSpinner')
        const { data } = await apiClient.post(ADMIN_COUPONS_ENDPOINT, payload)
        if (!data.success) throw new Error(data.error?.message || data.message)
        dispatch('alert/showAlert', { message: data.message || 'Coupon created', type: 'success' }, { root: true })
        return data
      } catch (error) {
        const msg = error.response?.data?.error?.message || error.message || 'Something went wrong'
        dispatch('alert/showAlert', { message: msg, type: 'danger' }, { root: true })
        return { success: false, error }
      } finally {
        dispatch('spinner/hideSpinner')
      }
    },

    async deleteCoupon ({ dispatch }, { id }) {
      try {
        dispatch('spinner/showSpinner')
        const { data } = await apiClient.delete(`${ADMIN_COUPONS_ENDPOINT}/${id}`)
        if (!data.success) throw new Error(data.error?.message || data.message)
        dispatch('alert/showAlert', { message: data.message || 'Coupon deleted', type: 'success' }, { root: true })
        return data
      } catch (error) {
        const msg = error.response?.data?.error?.message || error.message || 'Something went wrong'
        dispatch('alert/showAlert', { message: msg, type: 'danger' }, { root: true })
        return { success: false, error }
      } finally {
        dispatch('spinner/hideSpinner')
      }
    },

    // ----- Public coupon/referral lookup (unauthenticated signup screen) -----
    // Intentionally silent: no spinner and no error alert so debounced typing
    // doesn't flicker the global loader or spam alerts.
    async lookupSignupCoupon (_ctx, { code }) {
      try {
        const { data } = await apiClient.get(`${PUBLIC_COUPON_LOOKUP_ENDPOINT}?code=${encodeURIComponent(code)}`, { meta: { silent: true } })
        if (!data.success) return { success: false, result: { found: false } }
        return { success: true, result: data.data?.result || { found: false } }
      } catch (error) {
        return { success: false, result: { found: false }, error }
      }
    }
  }
}
