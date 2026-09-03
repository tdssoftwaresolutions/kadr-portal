import {create} from 'zustand';
import apiClient from '../api/client';
import {
  GET_INACTIVE_USERS_ENDPOINT,
  GET_ACTIVE_USERS_ENDPOINT,
  UPDATE_INACTIVE_USER_ENDPOINT,
  ADMIN_USERS_ENDPOINT,
  ADMIN_USERS_ACTIVE_ENDPOINT,
  GET_ADMIN_ACTIVE_CASES_ENDPOINT,
  GET_ADMIN_CASE_META_ENDPOINT,
  POST_ADMIN_ASSIGN_CASE_MEDIATOR_ENDPOINT,
  GET_SETTINGS_ENDPOINT,
  POST_SETTINGS_ENDPOINT,
  POST_CASE_COMMISSION_ENDPOINT,
  GET_INVOICES_ENDPOINT,
  GET_TRANSACTIONS_ENDPOINT,
  POST_SYNC_INVOICES_ENDPOINT,
  POST_MARK_INVOICE_PAID_ENDPOINT,
  ADMIN_SET_USER_DELETED_ENDPOINT,
  ADMIN_BLOG_TAXONOMY_ENDPOINT,
  ADMIN_BLOG_CATEGORIES_ENDPOINT,
  ADMIN_BLOG_TAGS_ENDPOINT,
  ADMIN_CORRESPONDENCE_INBOX_ENDPOINT,
  ADMIN_CORRESPONDENCE_MARK_READ_ENDPOINT,
  ADMIN_NOTIFICATION_TEMPLATES,
  ADMIN_NOTIFICATION_SEND,
  ADMIN_REWARD_CATALOG_ENDPOINT,
  ADMIN_REWARD_ORDERS_ENDPOINT,
  ADMIN_WEBSITE_CONTENT_ENDPOINT,
} from '../api/endpoints';
import {User, Case, Invoice, Transaction, AdminSettings} from '../types';

interface AdminState {
  inactiveUsers: User[];
  activeUsers: User[];
  adminUsers: User[];
  activeCases: Case[];
  caseMeta: Record<string, unknown> | null;
  invoices: Invoice[];
  transactions: Transaction[];
  settings: AdminSettings | null;
  isLoading: boolean;

  // Users
  getInactiveUsers: () => Promise<void>;
  getActiveUsers: () => Promise<void>;
  updateInactiveUser: (userId: string, isActive: boolean) => Promise<{success: boolean; message?: string}>;
  setUserDeleted: (userId: string) => Promise<{success: boolean; message?: string}>;
  getAdminUsers: () => Promise<void>;
  createAdminUser: (payload: Record<string, unknown>) => Promise<{success: boolean; message?: string}>;
  updateAdminUser: (payload: Record<string, unknown>) => Promise<{success: boolean; message?: string}>;
  setAdminActiveStatus: (id: string, active: boolean) => Promise<{success: boolean; message?: string}>;

  // Cases
  getActiveCases: () => Promise<void>;
  getCaseMeta: () => Promise<void>;
  assignCaseMediator: (caseId: string, mediatorId: string) => Promise<{success: boolean; message?: string}>;
  approveCaseType: (caseId: string, caseType: string) => Promise<{success: boolean; message?: string}>;

  // Finance
  getSettings: () => Promise<void>;
  saveSettings: (payload: Record<string, unknown>) => Promise<{success: boolean; message?: string}>;
  updateCaseCommission: (caseId: string, rate: number) => Promise<{success: boolean; message?: string}>;
  getInvoices: () => Promise<void>;
  getTransactions: () => Promise<void>;
  syncInvoices: (mediatorId: string) => Promise<{success: boolean; message?: string}>;
  markInvoicePaid: (invoiceId: string) => Promise<{success: boolean; message?: string}>;

  // Blog taxonomy
  getBlogTaxonomy: () => Promise<{success: boolean; data?: unknown}>;
  createBlogCategory: (payload: Record<string, unknown>) => Promise<{success: boolean; message?: string}>;
  createBlogTag: (payload: Record<string, unknown>) => Promise<{success: boolean; message?: string}>;

  // Correspondence
  getCorrespondenceInbox: () => Promise<{success: boolean; data?: unknown}>;
  markCorrespondenceRead: (ids: string[]) => Promise<{success: boolean}>;

  // Notifications
  getNotificationTemplates: () => Promise<{success: boolean; data?: unknown}>;
  sendNotification: (payload: Record<string, unknown>) => Promise<{success: boolean; message?: string}>;

  // Rewards
  getRewardCatalog: () => Promise<{success: boolean; data?: unknown}>;
  getRewardOrders: () => Promise<{success: boolean; data?: unknown}>;
  fulfillRewardOrder: (id: string) => Promise<{success: boolean; message?: string}>;

  // Website content
  getWebsiteContent: () => Promise<{success: boolean; data?: unknown}>;
}

export const useAdminStore = create<AdminState>((set, get) => ({
  inactiveUsers: [],
  activeUsers: [],
  adminUsers: [],
  activeCases: [],
  caseMeta: null,
  invoices: [],
  transactions: [],
  settings: null,
  isLoading: false,

  getInactiveUsers: async () => {
    set({isLoading: true});
    try {
      const {data} = await apiClient.get(GET_INACTIVE_USERS_ENDPOINT);
      if (data.success) set({inactiveUsers: data.data || []});
    } catch { /* silent */ } finally {
      set({isLoading: false});
    }
  },

  getActiveUsers: async () => {
    set({isLoading: true});
    try {
      const {data} = await apiClient.get(GET_ACTIVE_USERS_ENDPOINT);
      if (data.success) set({activeUsers: data.data || []});
    } catch { /* silent */ } finally {
      set({isLoading: false});
    }
  },

  updateInactiveUser: async (userId, isActive) => {
    set({isLoading: true});
    try {
      const {data} = await apiClient.post(UPDATE_INACTIVE_USER_ENDPOINT, {userId, isActive});
      if (!data.success) throw new Error(data.error?.message);
      return {success: true, message: data.message};
    } catch (error: unknown) {
      const err = error as {response?: {data?: {error?: {message?: string}}}; message?: string};
      return {success: false, message: err.response?.data?.error?.message || err.message || 'Failed'};
    } finally {
      set({isLoading: false});
    }
  },

  setUserDeleted: async userId => {
    set({isLoading: true});
    try {
      const {data} = await apiClient.post(ADMIN_SET_USER_DELETED_ENDPOINT, {userId});
      if (!data.success) throw new Error(data.error?.message);
      return {success: true, message: data.message};
    } catch (error: unknown) {
      const err = error as {response?: {data?: {error?: {message?: string}}}; message?: string};
      return {success: false, message: err.response?.data?.error?.message || err.message || 'Failed'};
    } finally {
      set({isLoading: false});
    }
  },

  getAdminUsers: async () => {
    set({isLoading: true});
    try {
      const {data} = await apiClient.get(ADMIN_USERS_ENDPOINT);
      if (data.success) set({adminUsers: data.data || []});
    } catch { /* silent */ } finally {
      set({isLoading: false});
    }
  },

  createAdminUser: async payload => {
    set({isLoading: true});
    try {
      const {data} = await apiClient.post(ADMIN_USERS_ENDPOINT, payload);
      if (!data.success) throw new Error(data.error?.message);
      return {success: true, message: data.message || 'User created'};
    } catch (error: unknown) {
      const err = error as {response?: {data?: {error?: {message?: string}}}; message?: string};
      return {success: false, message: err.response?.data?.error?.message || err.message || 'Failed'};
    } finally {
      set({isLoading: false});
    }
  },

  updateAdminUser: async payload => {
    set({isLoading: true});
    try {
      const {data} = await apiClient.put(ADMIN_USERS_ENDPOINT, payload);
      if (!data.success) throw new Error(data.error?.message);
      return {success: true, message: data.message || 'User updated'};
    } catch (error: unknown) {
      const err = error as {response?: {data?: {error?: {message?: string}}}; message?: string};
      return {success: false, message: err.response?.data?.error?.message || err.message || 'Failed'};
    } finally {
      set({isLoading: false});
    }
  },

  setAdminActiveStatus: async (id, active) => {
    try {
      const {data} = await apiClient.post(ADMIN_USERS_ACTIVE_ENDPOINT, {id, active});
      if (!data.success) throw new Error(data.error?.message);
      return {success: true, message: data.message};
    } catch (error: unknown) {
      const err = error as {response?: {data?: {error?: {message?: string}}}; message?: string};
      return {success: false, message: err.response?.data?.error?.message || err.message || 'Failed'};
    }
  },

  getActiveCases: async () => {
    set({isLoading: true});
    try {
      const {data} = await apiClient.get(GET_ADMIN_ACTIVE_CASES_ENDPOINT);
      if (data.success) set({activeCases: data.data || []});
    } catch { /* silent */ } finally {
      set({isLoading: false});
    }
  },

  getCaseMeta: async () => {
    try {
      const {data} = await apiClient.get(GET_ADMIN_CASE_META_ENDPOINT);
      if (data.success) set({caseMeta: data.data});
    } catch { /* silent */ }
  },

  assignCaseMediator: async (caseId, mediatorId) => {
    set({isLoading: true});
    try {
      const {data} = await apiClient.post(POST_ADMIN_ASSIGN_CASE_MEDIATOR_ENDPOINT, {caseId, mediatorId});
      if (!data.success) throw new Error(data.error?.message);
      return {success: true, message: data.message || 'Mediator assigned'};
    } catch (error: unknown) {
      const err = error as {response?: {data?: {error?: {message?: string}}}; message?: string};
      return {success: false, message: err.response?.data?.error?.message || err.message || 'Failed'};
    } finally {
      set({isLoading: false});
    }
  },

  approveCaseType: async (caseId, caseType) => {
    set({isLoading: true});
    try {
      const {data} = await apiClient.post('/cases/approve-type', {caseId, caseType});
      if (!data.success) throw new Error(data.error?.message);
      return {success: true, message: data.message};
    } catch (error: unknown) {
      const err = error as {response?: {data?: {error?: {message?: string}}}; message?: string};
      return {success: false, message: err.response?.data?.error?.message || err.message || 'Failed'};
    } finally {
      set({isLoading: false});
    }
  },

  getSettings: async () => {
    set({isLoading: true});
    try {
      const {data} = await apiClient.get(GET_SETTINGS_ENDPOINT);
      if (data.success) set({settings: data.data});
    } catch { /* silent */ } finally {
      set({isLoading: false});
    }
  },

  saveSettings: async payload => {
    set({isLoading: true});
    try {
      const {data} = await apiClient.post(POST_SETTINGS_ENDPOINT, payload);
      if (!data.success) throw new Error(data.error?.message);
      return {success: true, message: data.message || 'Settings saved'};
    } catch (error: unknown) {
      const err = error as {response?: {data?: {error?: {message?: string}}}; message?: string};
      return {success: false, message: err.response?.data?.error?.message || err.message || 'Failed'};
    } finally {
      set({isLoading: false});
    }
  },

  updateCaseCommission: async (caseId, rate) => {
    try {
      const {data} = await apiClient.post(POST_CASE_COMMISSION_ENDPOINT, {caseId, rate});
      if (!data.success) throw new Error(data.error?.message);
      return {success: true, message: data.message};
    } catch (error: unknown) {
      const err = error as {response?: {data?: {error?: {message?: string}}}; message?: string};
      return {success: false, message: err.response?.data?.error?.message || err.message || 'Failed'};
    }
  },

  getInvoices: async () => {
    set({isLoading: true});
    try {
      const {data} = await apiClient.get(GET_INVOICES_ENDPOINT);
      if (data.success) set({invoices: data.data?.invoices || data.data || []});
    } catch { /* silent */ } finally {
      set({isLoading: false});
    }
  },

  getTransactions: async () => {
    set({isLoading: true});
    try {
      const {data} = await apiClient.get(GET_TRANSACTIONS_ENDPOINT);
      if (data.success) set({transactions: data.data?.transactions || data.data || []});
    } catch { /* silent */ } finally {
      set({isLoading: false});
    }
  },

  syncInvoices: async mediatorId => {
    set({isLoading: true});
    try {
      const {data} = await apiClient.post(POST_SYNC_INVOICES_ENDPOINT, {mediatorId});
      if (!data.success) throw new Error(data.error?.message);
      return {success: true, message: data.message || 'Synced'};
    } catch (error: unknown) {
      const err = error as {response?: {data?: {error?: {message?: string}}}; message?: string};
      return {success: false, message: err.response?.data?.error?.message || err.message || 'Failed'};
    } finally {
      set({isLoading: false});
    }
  },

  markInvoicePaid: async invoiceId => {
    try {
      const {data} = await apiClient.post(POST_MARK_INVOICE_PAID_ENDPOINT, {invoiceId});
      if (!data.success) throw new Error(data.error?.message);
      return {success: true, message: data.message || 'Marked as paid'};
    } catch (error: unknown) {
      const err = error as {response?: {data?: {error?: {message?: string}}}; message?: string};
      return {success: false, message: err.response?.data?.error?.message || err.message || 'Failed'};
    }
  },

  getBlogTaxonomy: async () => {
    set({isLoading: true});
    try {
      const {data} = await apiClient.get(ADMIN_BLOG_TAXONOMY_ENDPOINT);
      if (!data.success) throw new Error(data.error?.message);
      return {success: true, data: data.data};
    } catch (error: unknown) {
      const err = error as {message?: string};
      return {success: false, data: {message: err.message}};
    } finally {
      set({isLoading: false});
    }
  },

  createBlogCategory: async payload => {
    try {
      const {data} = await apiClient.post(ADMIN_BLOG_CATEGORIES_ENDPOINT, payload);
      if (!data.success) throw new Error(data.error?.message);
      return {success: true, message: data.message || 'Category created'};
    } catch (error: unknown) {
      const err = error as {response?: {data?: {error?: {message?: string}}}; message?: string};
      return {success: false, message: err.response?.data?.error?.message || err.message || 'Failed'};
    }
  },

  createBlogTag: async payload => {
    try {
      const {data} = await apiClient.post(ADMIN_BLOG_TAGS_ENDPOINT, payload);
      if (!data.success) throw new Error(data.error?.message);
      return {success: true, message: data.message || 'Tag created'};
    } catch (error: unknown) {
      const err = error as {response?: {data?: {error?: {message?: string}}}; message?: string};
      return {success: false, message: err.response?.data?.error?.message || err.message || 'Failed'};
    }
  },

  getCorrespondenceInbox: async () => {
    set({isLoading: true});
    try {
      const {data} = await apiClient.get(ADMIN_CORRESPONDENCE_INBOX_ENDPOINT);
      if (!data.success) throw new Error(data.error?.message);
      return {success: true, data: data.data};
    } catch (error: unknown) {
      const err = error as {message?: string};
      return {success: false, data: {message: err.message}};
    } finally {
      set({isLoading: false});
    }
  },

  markCorrespondenceRead: async ids => {
    try {
      const {data} = await apiClient.post(ADMIN_CORRESPONDENCE_MARK_READ_ENDPOINT, {ids});
      return {success: data.success};
    } catch {
      return {success: false};
    }
  },

  getNotificationTemplates: async () => {
    try {
      const {data} = await apiClient.get(ADMIN_NOTIFICATION_TEMPLATES);
      if (!data.success) throw new Error(data.error?.message);
      return {success: true, data: data.data};
    } catch (error: unknown) {
      const err = error as {message?: string};
      return {success: false, data: {message: err.message}};
    }
  },

  sendNotification: async payload => {
    set({isLoading: true});
    try {
      const {data} = await apiClient.post(ADMIN_NOTIFICATION_SEND, payload);
      if (!data.success) throw new Error(data.error?.message);
      return {success: true, message: data.message || 'Notification sent'};
    } catch (error: unknown) {
      const err = error as {response?: {data?: {error?: {message?: string}}}; message?: string};
      return {success: false, message: err.response?.data?.error?.message || err.message || 'Failed'};
    } finally {
      set({isLoading: false});
    }
  },

  getRewardCatalog: async () => {
    try {
      const {data} = await apiClient.get(ADMIN_REWARD_CATALOG_ENDPOINT);
      if (!data.success) throw new Error(data.error?.message);
      return {success: true, data: data.data};
    } catch (error: unknown) {
      const err = error as {message?: string};
      return {success: false, data: {message: err.message}};
    }
  },

  getRewardOrders: async () => {
    try {
      const {data} = await apiClient.get(ADMIN_REWARD_ORDERS_ENDPOINT);
      if (!data.success) throw new Error(data.error?.message);
      return {success: true, data: data.data};
    } catch (error: unknown) {
      const err = error as {message?: string};
      return {success: false, data: {message: err.message}};
    }
  },

  fulfillRewardOrder: async id => {
    set({isLoading: true});
    try {
      const {data} = await apiClient.post(`${ADMIN_REWARD_ORDERS_ENDPOINT}/${id}/fulfill`);
      if (!data.success) throw new Error(data.error?.message);
      return {success: true, message: data.message || 'Order fulfilled'};
    } catch (error: unknown) {
      const err = error as {response?: {data?: {error?: {message?: string}}}; message?: string};
      return {success: false, message: err.response?.data?.error?.message || err.message || 'Failed'};
    } finally {
      set({isLoading: false});
    }
  },

  getWebsiteContent: async () => {
    set({isLoading: true});
    try {
      const {data} = await apiClient.get(ADMIN_WEBSITE_CONTENT_ENDPOINT);
      if (!data.success) throw new Error(data.error?.message);
      return {success: true, data: data.data};
    } catch (error: unknown) {
      const err = error as {message?: string};
      return {success: false, data: {message: err.message}};
    } finally {
      set({isLoading: false});
    }
  },
}));
