import {create} from 'zustand';
import apiClient from '../api/client';
import {
  GET_MY_REWARDS_ENDPOINT,
  REDEEM_REWARD_ENDPOINT,
  MEDIATOR_SUBSCRIPTION_ENDPOINT,
  MEDIATOR_LEGAL_FEEDS_ENDPOINT,
  MEDIATOR_COURT_CASES_ENDPOINT,
  MEDIATOR_PRIVATE_INVOICE_SETTINGS,
  MEDIATOR_PRIVATE_INVOICES,
  MEDIATOR_INCOME_ENDPOINT,
  GET_MEDIATOR_BANK_ACCOUNT_ENDPOINT,
  POST_MEDIATOR_BANK_ACCOUNT_ENDPOINT,
  GET_MY_BLOGS_ENDPOINT,
  SAVE_BLOG_ENDPOINT,
  GET_MY_VIDEO_REELS_ENDPOINT,
  SAVE_VIDEO_REEL_ENDPOINT,
  GET_INVOICES_ENDPOINT,
} from '../api/endpoints';
import {
  Reward,
  CourtCase,
  Blog,
  VideoReel,
  Invoice,
  PrivateInvoice,
  BankAccount,
  MediatorSubscription,
} from '../types';
import {SubscriptionTier} from '../config';

interface MediatorState {
  rewards: Reward[];
  subscription: MediatorSubscription;
  courtCases: CourtCase[];
  blogs: Blog[];
  videoReels: VideoReel[];
  invoices: Invoice[];
  privateInvoices: PrivateInvoice[];
  bankAccount: BankAccount | null;
  isLoading: boolean;

  // Rewards
  getMyRewards: (page?: number) => Promise<{success: boolean; data?: unknown}>;
  redeemReward: (catalogItemId: string) => Promise<{success: boolean; message?: string}>;

  // Subscription
  loadSubscription: () => Promise<void>;

  // Legal feeds
  getLegalFeeds: (feed?: string, limit?: number) => Promise<{success: boolean; data?: unknown}>;

  // Court cases
  getCourtCases: () => Promise<{success: boolean; data?: CourtCase[]}>;
  addCourtCase: (cnr: string, label?: string) => Promise<{success: boolean; message?: string}>;
  removeCourtCase: (id: string) => Promise<{success: boolean; message?: string}>;
  refreshCourtCase: (id: string) => Promise<{success: boolean; message?: string}>;

  // Private invoices
  getPrivateInvoices: (page?: number) => Promise<{success: boolean; data?: PrivateInvoice[]}>;
  createPrivateInvoice: (payload: Record<string, unknown>) => Promise<{success: boolean; message?: string}>;
  getPrivateInvoiceSettings: () => Promise<{success: boolean; data?: unknown}>;
  savePrivateInvoiceSettings: (payload: Record<string, unknown>) => Promise<{success: boolean}>;

  // Income
  getMediatorIncome: (params?: Record<string, string>) => Promise<{success: boolean; data?: unknown}>;

  // Bank account
  getBankAccount: () => Promise<void>;
  saveBankAccount: (payload: BankAccount) => Promise<{success: boolean; message?: string}>;

  // Blogs
  getMyBlogs: () => Promise<void>;
  saveBlog: (payload: Record<string, unknown>) => Promise<{success: boolean; message?: string}>;
  deleteBlog: (id: string) => Promise<{success: boolean; message?: string}>;

  // Video reels
  getMyVideoReels: () => Promise<void>;
  saveVideoReel: (payload: Record<string, unknown>) => Promise<{success: boolean; message?: string}>;
  deleteVideoReel: (id: string) => Promise<{success: boolean; message?: string}>;

  // Invoices (platform)
  getInvoices: () => Promise<void>;
}

export const useMediatorStore = create<MediatorState>((set, get) => ({
  rewards: [],
  subscription: {tier: 'FREE' as SubscriptionTier, features: []},
  courtCases: [],
  blogs: [],
  videoReels: [],
  invoices: [],
  privateInvoices: [],
  bankAccount: null,
  isLoading: false,

  getMyRewards: async (page = 1) => {
    set({isLoading: true});
    try {
      const {data} = await apiClient.get(`${GET_MY_REWARDS_ENDPOINT}?page=${page}`);
      if (!data.success) throw new Error(data.error?.message);
      set({rewards: data.data?.catalog || data.data?.rewards || []});
      return {success: true, data: data.data};
    } catch (error: unknown) {
      const err = error as {message?: string};
      return {success: false, data: {message: err.message}};
    } finally {
      set({isLoading: false});
    }
  },

  redeemReward: async catalogItemId => {
    set({isLoading: true});
    try {
      const {data} = await apiClient.post(REDEEM_REWARD_ENDPOINT, {catalogItemId});
      if (!data.success) throw new Error(data.error?.message);
      await get().loadSubscription();
      return {success: true, message: data.message || 'Reward redeemed'};
    } catch (error: unknown) {
      const err = error as {response?: {data?: {error?: {message?: string}}}; message?: string};
      return {success: false, message: err.response?.data?.error?.message || err.message || 'Failed'};
    } finally {
      set({isLoading: false});
    }
  },

  loadSubscription: async () => {
    try {
      const {data} = await apiClient.get(MEDIATOR_SUBSCRIPTION_ENDPOINT);
      if (data.success) {
        const tier = data.data?.tier || 'FREE';
        const features = data.data?.features || [];
        set({subscription: {tier, features}});
      }
    } catch {
      // Silent
    }
  },

  getLegalFeeds: async (feed = 'judgments', limit = 12) => {
    try {
      const {data} = await apiClient.get(
        `${MEDIATOR_LEGAL_FEEDS_ENDPOINT}?feed=${feed}&limit=${limit}`,
      );
      if (!data.success) throw new Error(data.error?.message);
      return {success: true, data: data.data};
    } catch (error: unknown) {
      const err = error as {message?: string};
      return {success: false, data: {message: err.message}};
    }
  },

  getCourtCases: async () => {
    set({isLoading: true});
    try {
      const {data} = await apiClient.get(MEDIATOR_COURT_CASES_ENDPOINT);
      if (!data.success) throw new Error(data.error?.message);
      set({courtCases: data.data?.trackers || data.data || []});
      return {success: true, data: data.data?.trackers || data.data || []};
    } catch (error: unknown) {
      const err = error as {message?: string};
      return {success: false, data: undefined, message: err.message};
    } finally {
      set({isLoading: false});
    }
  },

  addCourtCase: async (cnr, label) => {
    set({isLoading: true});
    try {
      const {data} = await apiClient.post(MEDIATOR_COURT_CASES_ENDPOINT, {cnr, label});
      if (!data.success) throw new Error(data.error?.message);
      return {success: true, message: data.message || 'Case tracked'};
    } catch (error: unknown) {
      const err = error as {response?: {data?: {error?: {message?: string}}}; message?: string};
      return {success: false, message: err.response?.data?.error?.message || err.message || 'Failed'};
    } finally {
      set({isLoading: false});
    }
  },

  removeCourtCase: async id => {
    try {
      const {data} = await apiClient.delete(`${MEDIATOR_COURT_CASES_ENDPOINT}/${id}`);
      if (!data.success) throw new Error(data.error?.message);
      return {success: true, message: data.message || 'Removed'};
    } catch (error: unknown) {
      const err = error as {response?: {data?: {error?: {message?: string}}}; message?: string};
      return {success: false, message: err.response?.data?.error?.message || err.message || 'Failed'};
    }
  },

  refreshCourtCase: async id => {
    set({isLoading: true});
    try {
      const {data} = await apiClient.post(`${MEDIATOR_COURT_CASES_ENDPOINT}/${id}/refresh`);
      if (!data.success) throw new Error(data.error?.message);
      return {success: true, message: data.message || 'Refreshed'};
    } catch (error: unknown) {
      const err = error as {response?: {data?: {error?: {message?: string}}}; message?: string};
      return {success: false, message: err.response?.data?.error?.message || err.message || 'Failed'};
    } finally {
      set({isLoading: false});
    }
  },

  getPrivateInvoices: async (page = 1) => {
    set({isLoading: true});
    try {
      const {data} = await apiClient.get(`${MEDIATOR_PRIVATE_INVOICES}?page=${page}`);
      if (!data.success) throw new Error(data.error?.message);
      set({privateInvoices: data.data?.invoices || data.data || []});
      return {success: true, data: data.data?.invoices || data.data || []};
    } catch (error: unknown) {
      const err = error as {message?: string};
      return {success: false, message: err.message};
    } finally {
      set({isLoading: false});
    }
  },

  createPrivateInvoice: async payload => {
    set({isLoading: true});
    try {
      const {data} = await apiClient.post(MEDIATOR_PRIVATE_INVOICES, payload);
      if (!data.success) throw new Error(data.error?.message);
      return {success: true, message: data.message || 'Invoice created'};
    } catch (error: unknown) {
      const err = error as {response?: {data?: {error?: {message?: string}}}; message?: string};
      return {success: false, message: err.response?.data?.error?.message || err.message || 'Failed'};
    } finally {
      set({isLoading: false});
    }
  },

  getPrivateInvoiceSettings: async () => {
    try {
      const {data} = await apiClient.get(MEDIATOR_PRIVATE_INVOICE_SETTINGS);
      if (!data.success) throw new Error(data.error?.message);
      return {success: true, data: data.data};
    } catch (error: unknown) {
      const err = error as {message?: string};
      return {success: false, data: {message: err.message}};
    }
  },

  savePrivateInvoiceSettings: async payload => {
    try {
      const {data} = await apiClient.post(MEDIATOR_PRIVATE_INVOICE_SETTINGS, payload);
      if (!data.success) throw new Error(data.error?.message);
      return {success: true};
    } catch {
      return {success: false};
    }
  },

  getMediatorIncome: async (params) => {
    try {
      const query = params ? new URLSearchParams(params).toString() : '';
      const url = query ? `${MEDIATOR_INCOME_ENDPOINT}?${query}` : MEDIATOR_INCOME_ENDPOINT;
      const {data} = await apiClient.get(url);
      if (!data.success) throw new Error(data.error?.message);
      return {success: true, data: data.data};
    } catch (error: unknown) {
      const err = error as {message?: string};
      return {success: false, data: {message: err.message}};
    }
  },

  getBankAccount: async () => {
    try {
      const {data} = await apiClient.get(GET_MEDIATOR_BANK_ACCOUNT_ENDPOINT);
      if (data.success) {
        set({bankAccount: data.data});
      }
    } catch {
      // Silent
    }
  },

  saveBankAccount: async payload => {
    set({isLoading: true});
    try {
      const {data} = await apiClient.post(POST_MEDIATOR_BANK_ACCOUNT_ENDPOINT, payload);
      if (!data.success) throw new Error(data.error?.message);
      set({bankAccount: payload});
      return {success: true, message: 'Bank account saved'};
    } catch (error: unknown) {
      const err = error as {response?: {data?: {error?: {message?: string}}}; message?: string};
      return {success: false, message: err.response?.data?.error?.message || err.message || 'Failed'};
    } finally {
      set({isLoading: false});
    }
  },

  getMyBlogs: async () => {
    set({isLoading: true});
    try {
      const {data} = await apiClient.get(GET_MY_BLOGS_ENDPOINT);
      if (data.success) {
        set({blogs: data.data?.blogs || data.data || []});
      }
    } catch {
      // Silent
    } finally {
      set({isLoading: false});
    }
  },

  saveBlog: async payload => {
    set({isLoading: true});
    try {
      const {data} = await apiClient.post(SAVE_BLOG_ENDPOINT, payload);
      if (!data.success) throw new Error(data.error?.message);
      return {success: true, message: data.message || 'Blog saved'};
    } catch (error: unknown) {
      const err = error as {response?: {data?: {error?: {message?: string}}}; message?: string};
      return {success: false, message: err.response?.data?.error?.message || err.message || 'Failed'};
    } finally {
      set({isLoading: false});
    }
  },

  deleteBlog: async id => {
    try {
      const {data} = await apiClient.delete(`${SAVE_BLOG_ENDPOINT.replace('save', 'delete')}/${id}`);
      if (!data.success) throw new Error(data.error?.message);
      set({blogs: get().blogs.filter(b => b.id !== id)});
      return {success: true, message: 'Blog deleted'};
    } catch (error: unknown) {
      const err = error as {message?: string};
      return {success: false, message: err.message || 'Failed'};
    }
  },

  getMyVideoReels: async () => {
    set({isLoading: true});
    try {
      const {data} = await apiClient.get(GET_MY_VIDEO_REELS_ENDPOINT);
      if (data.success) {
        set({videoReels: data.data?.reels || data.data || []});
      }
    } catch {
      // Silent
    } finally {
      set({isLoading: false});
    }
  },

  saveVideoReel: async payload => {
    set({isLoading: true});
    try {
      const {data} = await apiClient.post(SAVE_VIDEO_REEL_ENDPOINT, payload);
      if (!data.success) throw new Error(data.error?.message);
      return {success: true, message: data.message || 'Video reel saved'};
    } catch (error: unknown) {
      const err = error as {response?: {data?: {error?: {message?: string}}}; message?: string};
      return {success: false, message: err.response?.data?.error?.message || err.message || 'Failed'};
    } finally {
      set({isLoading: false});
    }
  },

  deleteVideoReel: async id => {
    try {
      const {data} = await apiClient.delete(`/deleteVideoReel/${id}`);
      if (!data.success) throw new Error(data.error?.message);
      set({videoReels: get().videoReels.filter(r => r.id !== id)});
      return {success: true, message: 'Video reel deleted'};
    } catch (error: unknown) {
      const err = error as {message?: string};
      return {success: false, message: err.message || 'Failed'};
    }
  },

  getInvoices: async () => {
    set({isLoading: true});
    try {
      const {data} = await apiClient.get(GET_INVOICES_ENDPOINT);
      if (data.success) {
        set({invoices: data.data?.invoices || data.data || []});
      }
    } catch {
      // Silent
    } finally {
      set({isLoading: false});
    }
  },
}));
