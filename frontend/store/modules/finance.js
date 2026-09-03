import { apiClient } from '../../utils/apiClient'
import { triggerPdfBlobDownload } from '../helpers'
import {
  GET_INVOICES_ENDPOINT,
  GET_TRANSACTIONS_ENDPOINT,
  POST_SYNC_INVOICES_ENDPOINT,
  POST_MARK_INVOICE_PAID_ENDPOINT,
  GET_INVOICE_PDF_ENDPOINT,
  GET_MEDIATOR_BANK_ACCOUNT_ENDPOINT,
  POST_MEDIATOR_BANK_ACCOUNT_ENDPOINT,
  POST_CASE_COMMISSION_ENDPOINT
} from '../endpoints'

export default {
  namespaced: false,
  actions: {
    async getInvoices ({ dispatch }, { mediatorId, range, status } = {}) {
      try {
        dispatch('spinner/showSpinner')
        const params = new URLSearchParams()
        if (mediatorId) params.set('mediatorId', mediatorId)
        if (range) params.set('range', range)
        if (status) params.set('status', status)
        const query = params.toString()
        const { data } = await apiClient.get(query ? `${GET_INVOICES_ENDPOINT}?${query}` : GET_INVOICES_ENDPOINT)
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

    async getTransactions ({ dispatch }, { range } = {}) {
      try {
        dispatch('spinner/showSpinner')
        const query = range ? `?range=${encodeURIComponent(range)}` : ''
        const { data } = await apiClient.get(`${GET_TRANSACTIONS_ENDPOINT}${query}`)
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

    async syncInvoices ({ dispatch }) {
      try {
        dispatch('spinner/showSpinner')
        const { data } = await apiClient.post(POST_SYNC_INVOICES_ENDPOINT)
        if (!data.success) throw new Error(data.error?.message || 'Request failed')
        dispatch('alert/showAlert', { message: data.message || 'Invoices synced', type: 'success' }, { root: true })
        return data
      } catch (error) {
        const msg = error.response?.data?.error?.message || error.message || 'Something went wrong'
        dispatch('alert/showAlert', { message: msg, type: 'danger' }, { root: true })
        return { success: false, error }
      } finally {
        dispatch('spinner/hideSpinner')
      }
    },

    async markInvoicePaid ({ dispatch }, payload) {
      try {
        dispatch('spinner/showSpinner')
        const { data } = await apiClient.post(POST_MARK_INVOICE_PAID_ENDPOINT, payload)
        if (!data.success) throw new Error(data.error?.message || 'Request failed')
        dispatch('alert/showAlert', { message: data.message || 'Invoice marked paid', type: 'success' }, { root: true })
        return data
      } catch (error) {
        const msg = error.response?.data?.error?.message || error.message || 'Something went wrong'
        dispatch('alert/showAlert', { message: msg, type: 'danger' }, { root: true })
        return { success: false, error }
      } finally {
        dispatch('spinner/hideSpinner')
      }
    },

    async downloadInvoicePdf ({ dispatch }, { invoiceId, invoiceNumber }) {
      try {
        dispatch('spinner/showSpinner')
        const response = await apiClient.get(`${GET_INVOICE_PDF_ENDPOINT}/${encodeURIComponent(invoiceId)}/pdf`, {
          responseType: 'blob'
        })
        const filename = `${invoiceNumber || 'invoice'}.pdf`.replace(/[^\w.-]+/g, '_')
        await triggerPdfBlobDownload(response, filename)
        return { success: true }
      } catch (error) {
        const msg = error.message || error.response?.data?.error?.message || 'Something went wrong'
        dispatch('alert/showAlert', { message: msg, type: 'danger' }, { root: true })
        return { success: false, error }
      } finally {
        dispatch('spinner/hideSpinner')
      }
    },

    async getMediatorBankAccount ({ dispatch }, { mediatorId } = {}) {
      try {
        dispatch('spinner/showSpinner')
        const url = mediatorId ? `${GET_MEDIATOR_BANK_ACCOUNT_ENDPOINT}?mediatorId=${encodeURIComponent(mediatorId)}` : GET_MEDIATOR_BANK_ACCOUNT_ENDPOINT
        const { data } = await apiClient.get(url)
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

    async saveMediatorBankAccount ({ dispatch }, payload) {
      try {
        dispatch('spinner/showSpinner')
        const { data } = await apiClient.post(POST_MEDIATOR_BANK_ACCOUNT_ENDPOINT, payload)
        if (!data.success) throw new Error(data.error?.message || 'Request failed')
        dispatch('alert/showAlert', { message: data.message || 'Bank account saved', type: 'success' }, { root: true })
        return data
      } catch (error) {
        const msg = error.response?.data?.error?.message || error.message || 'Something went wrong'
        dispatch('alert/showAlert', { message: msg, type: 'danger' }, { root: true })
        return { success: false, error }
      } finally {
        dispatch('spinner/hideSpinner')
      }
    },

    async updateCaseMediatorCommission ({ dispatch }, payload) {
      try {
        dispatch('spinner/showSpinner')
        const { data } = await apiClient.post(POST_CASE_COMMISSION_ENDPOINT, payload)
        if (!data.success) throw new Error(data.error?.message || 'Request failed')
        dispatch('alert/showAlert', { message: data.message || 'Revenue share updated', type: 'success' }, { root: true })
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
