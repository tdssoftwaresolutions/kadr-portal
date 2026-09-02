import { apiClient } from '../../utils/apiClient'
import {
  GET_CASE_CORRESPONDENCE_ENDPOINT,
  POST_CASE_CORRESPONDENCE_ENDPOINT,
  GET_ADMIN_CASE_CORRESPONDENCE_ENDPOINT,
  GET_ADMIN_CORRESPONDENCE_INBOX_ENDPOINT,
  POST_ADMIN_CORRESPONDENCE_INBOX_MARK_READ_ENDPOINT,
  GET_ADMIN_CORRESPONDENCE_CONTEXT_ENDPOINT,
  GET_ADMIN_CORRESPONDENCE_CASES_ENDPOINT,
  GET_ADMIN_WEBSITE_CONTACT_INBOX_ENDPOINT,
  POST_PUBLIC_WEBSITE_CONTACT_LEAD_ENDPOINT,
  GET_PORTAL_SUPPORT_THREADS_ENDPOINT
} from '../endpoints'

export default {
  namespaced: false,
  actions: {
    async getCaseCorrespondence (ctx, { caseId, channel }) {
      try {
        const { data } = await apiClient.get(
            `${GET_CASE_CORRESPONDENCE_ENDPOINT}?caseId=${encodeURIComponent(caseId)}&channel=${encodeURIComponent(channel)}`
        )
        if (!data.success) throw new Error(data.error?.message || 'Request failed')
        return data
      } catch (error) {
        return {
          success: false,
          error,
          message: error.response?.data?.error?.message || error.message
        }
      }
    },

    async postCaseCorrespondence (ctx, payload) {
      try {
        const { data } = await apiClient.post(POST_CASE_CORRESPONDENCE_ENDPOINT, payload)
        if (!data.success) throw new Error(data.error?.message || 'Request failed')
        return data
      } catch (error) {
        return {
          success: false,
          error,
          message: error.response?.data?.error?.message || error.message
        }
      }
    },

    async getAdminCaseCorrespondence (ctx, { caseId }) {
      try {
        const { data } = await apiClient.get(
            `${GET_ADMIN_CASE_CORRESPONDENCE_ENDPOINT}?caseId=${encodeURIComponent(caseId)}`
        )
        if (!data.success) throw new Error(data.error?.message || 'Request failed')
        return data
      } catch (error) {
        return {
          success: false,
          error,
          message: error.response?.data?.error?.message || error.message
        }
      }
    },

    async getAdminCorrespondenceInbox (ctx) {
      try {
        const { data } = await apiClient.get(GET_ADMIN_CORRESPONDENCE_INBOX_ENDPOINT)
        if (!data.success) throw new Error(data.error?.message || 'Request failed')
        return data
      } catch (error) {
        return {
          success: false,
          error,
          message: error.response?.data?.error?.message || error.message
        }
      }
    },

    async markAdminCorrespondenceInboxRead (ctx, payload) {
      try {
        const { data } = await apiClient.post(POST_ADMIN_CORRESPONDENCE_INBOX_MARK_READ_ENDPOINT, payload)
        if (!data.success) throw new Error(data.error?.message || 'Request failed')
        return data
      } catch (error) {
        return {
          success: false,
          error,
          message: error.response?.data?.error?.message || error.message
        }
      }
    },

    async getAdminCorrespondenceContext (ctx, { caseId }) {
      try {
        const { data } = await apiClient.get(
            `${GET_ADMIN_CORRESPONDENCE_CONTEXT_ENDPOINT}?caseId=${encodeURIComponent(caseId)}`
        )
        if (!data.success) throw new Error(data.error?.message || 'Request failed')
        return data
      } catch (error) {
        return {
          success: false,
          error,
          message: error.response?.data?.error?.message || error.message
        }
      }
    },

    async getAdminCorrespondenceCasesForPicker (ctx, { page = 1, search = '' } = {}) {
      try {
        const q = new URLSearchParams()
        q.set('page', String(page))
        if (search) q.set('search', search)
        const { data } = await apiClient.get(`${GET_ADMIN_CORRESPONDENCE_CASES_ENDPOINT}?${q.toString()}`)
        if (!data.success) throw new Error(data.error?.message || 'Request failed')
        return data
      } catch (error) {
        return {
          success: false,
          error,
          message: error.response?.data?.error?.message || error.message
        }
      }
    },

    async getAdminWebsiteContactInbox (ctx) {
      try {
        const { data } = await apiClient.get(GET_ADMIN_WEBSITE_CONTACT_INBOX_ENDPOINT)
        if (!data.success) throw new Error(data.error?.message || 'Request failed')
        return data
      } catch (error) {
        return {
          success: false,
          error,
          message: error.response?.data?.error?.message || error.message
        }
      }
    },

    async getAdminWebsiteContactThread (ctx, { threadId }) {
      try {
        const { data } = await apiClient.get(`/admin/website-contact/thread/${encodeURIComponent(threadId)}`)
        if (!data.success) throw new Error(data.error?.message || 'Request failed')
        return data
      } catch (error) {
        return {
          success: false,
          error,
          message: error.response?.data?.error?.message || error.message
        }
      }
    },

    async postAdminWebsiteContactReply (ctx, { threadId, body }) {
      try {
        const { data } = await apiClient.post(
            `/admin/website-contact/thread/${encodeURIComponent(threadId)}/messages`,
            { body }
        )
        if (!data.success) throw new Error(data.error?.message || 'Request failed')
        return data
      } catch (error) {
        return {
          success: false,
          error,
          message: error.response?.data?.error?.message || error.message
        }
      }
    },

    async submitPublicWebsiteContactLead (ctx, { email, title, description, phone, name, apiKey } = {}) {
      try {
        const headers = {}
        if (apiKey) headers['x-website-contact-key'] = apiKey
        const { data } = await apiClient.post(
          POST_PUBLIC_WEBSITE_CONTACT_LEAD_ENDPOINT,
          { email, title, description, phone, name },
          { headers }
        )
        if (!data.success) throw new Error(data.error?.message || 'Request failed')
        return data
      } catch (error) {
        return {
          success: false,
          error,
          message: error.response?.data?.error?.message || error.message
        }
      }
    },

    async getPortalSupportThreads (ctx) {
      try {
        const { data } = await apiClient.get(GET_PORTAL_SUPPORT_THREADS_ENDPOINT)
        if (!data.success) throw new Error(data.error?.message || 'Request failed')
        return data
      } catch (error) {
        return { success: false, error, message: error.response?.data?.error?.message || error.message }
      }
    },

    async getPortalSupportThread (ctx, { threadId }) {
      try {
        const { data } = await apiClient.get(`/portal/support/thread/${encodeURIComponent(threadId)}`)
        if (!data.success) throw new Error(data.error?.message || 'Request failed')
        return data
      } catch (error) {
        return { success: false, error, message: error.response?.data?.error?.message || error.message }
      }
    },

    async createPortalSupportThread (ctx, { topic, body }) {
      try {
        const { data } = await apiClient.post('/portal/support/thread', { topic, body })
        if (!data.success) throw new Error(data.error?.message || 'Request failed')
        return data
      } catch (error) {
        return { success: false, error, message: error.response?.data?.error?.message || error.message }
      }
    },

    async postPortalSupportUserMessage (ctx, { threadId, body }) {
      try {
        const { data } = await apiClient.post(
            `/portal/support/thread/${encodeURIComponent(threadId)}/messages`,
            { body }
        )
        if (!data.success) throw new Error(data.error?.message || 'Request failed')
        return data
      } catch (error) {
        return { success: false, error, message: error.response?.data?.error?.message || error.message }
      }
    }
  }
}
