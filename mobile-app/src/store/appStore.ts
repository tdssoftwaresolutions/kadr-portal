import {create} from 'zustand';
import apiClient from '../api/client';
import {
  GET_DASHBOARD_CONTENT_ENDPOINT,
  GET_CALENDAR_INIT_ENDPOINT,
  NEW_CALENDAR_EVENT_ENDPOINT,
  GET_PAST_MEDIATIONS_ENDPOINT,
  MARK_CASE_RESOLVED_ENDPOINT,
  ACCEPT_MEDIATION_REQUEST_ENDPOINT,
  INITIATE_NEW_CASE_ENDPOINT,
  SUBMIT_EVENT_FEEDBACK_ENDPOINT,
  SET_CLIENT_PAYMENT_ENDPOINT,
  SAVE_NOTE_ENDPOINT,
  DELETE_NOTE_ENDPOINT,
  GET_CASE_CORRESPONDENCE_ENDPOINT,
  POST_CASE_CORRESPONDENCE_ENDPOINT,
  UPDATE_USER_PROFILE_ENDPOINT,
  DELETE_MY_ACCOUNT_ENDPOINT,
  AVAILABLE_LANGUAGES_ENDPOINT,
  GET_PORTAL_SUPPORT_THREADS_ENDPOINT,
  PUSH_REGISTER_ENDPOINT,
} from '../api/endpoints';
import {DashboardContent, CalendarEvent, Case, CorrespondenceMessage, SupportThread} from '../types';

type AlertType = 'success' | 'danger' | 'warning' | 'info';

interface AppState {
  // UI State
  isLoading: boolean;
  alert: {message: string; type: AlertType} | null;

  // Cached Data
  dashboardContent: DashboardContent | null;
  calendarEvents: CalendarEvent[];
  pastMediations: Case[];
  availableLanguages: string[];
  supportThreads: SupportThread[];

  // Actions
  showAlert: (message: string, type?: AlertType) => void;
  clearAlert: () => void;
  setLoading: (loading: boolean) => void;

  // Dashboard
  getDashboardContent: () => Promise<DashboardContent | null>;
  invalidateCaches: () => void;

  // Calendar
  getCalendarInit: () => Promise<{events: CalendarEvent[]; cases?: Case[]}>;
  createCalendarEvent: (payload: Record<string, unknown>) => Promise<{success: boolean; message?: string}>;

  // Cases
  getPastMediations: (page?: number) => Promise<{success: boolean; data?: Case[]; pagination?: Record<string, unknown>}>;
  markCaseResolved: (
    caseId: string,
    resolveStatus: string,
    agreementText?: string,
    signature?: string,
  ) => Promise<{success: boolean; message?: string}>;
  acceptMediationRequest: (caseId: string) => Promise<{success: boolean; message?: string}>;
  initiateNewCase: (payload: Record<string, unknown>) => Promise<{success: boolean; message?: string}>;
  submitMeetingFeedback: (payload: Record<string, unknown>) => Promise<{success: boolean; message?: string}>;
  setClientPayment: (payload: Record<string, unknown>) => Promise<{success: boolean; message?: string}>;

  // Notes
  saveNote: (payload: Record<string, unknown>) => Promise<{success: boolean; message?: string}>;
  deleteNote: (payload: Record<string, unknown>) => Promise<{success: boolean; message?: string}>;

  // Correspondence
  getCaseCorrespondence: (caseId: string) => Promise<{success: boolean; data?: CorrespondenceMessage[]}>;
  sendCaseMessage: (caseId: string, content: string, attachments?: string[]) => Promise<{success: boolean; message?: string}>;

  // Profile
  updateUserProfile: (payload: Record<string, unknown>) => Promise<{success: boolean; message?: string}>;
  deleteMyAccount: () => Promise<{success: boolean; message?: string}>;

  // Languages
  getAvailableLanguages: () => Promise<string[]>;

  // Support
  getSupportThreads: () => Promise<SupportThread[]>;
  createSupportThread: (subject: string, content: string) => Promise<{success: boolean; message?: string}>;

  // Push
  registerPushToken: (token: string, platform: string) => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  isLoading: false,
  alert: null,
  dashboardContent: null,
  calendarEvents: [],
  pastMediations: [],
  availableLanguages: [],
  supportThreads: [],

  showAlert: (message, type = 'danger') => {
    set({alert: {message, type}});
    setTimeout(() => set({alert: null}), 4000);
  },

  clearAlert: () => set({alert: null}),
  setLoading: loading => set({isLoading: loading}),

  getDashboardContent: async () => {
    const cached = get().dashboardContent;
    if (cached) return cached;
    set({isLoading: true});
    try {
      const {data} = await apiClient.get(GET_DASHBOARD_CONTENT_ENDPOINT);
      if (data.success) {
        set({dashboardContent: data.data});
        return data.data;
      }
      return null;
    } catch (error: unknown) {
      const err = error as {response?: {data?: {error?: {message?: string}}}; message?: string};
      get().showAlert(err.response?.data?.error?.message || err.message || 'Failed to load dashboard');
      return null;
    } finally {
      set({isLoading: false});
    }
  },

  invalidateCaches: () => {
    set({dashboardContent: null, calendarEvents: []});
  },

  getCalendarInit: async () => {
    set({isLoading: true});
    try {
      const {data} = await apiClient.get(GET_CALENDAR_INIT_ENDPOINT);
      if (data.success) {
        set({calendarEvents: data.data?.events || []});
        return data.data;
      }
      return {events: []};
    } catch (error: unknown) {
      const err = error as {response?: {data?: {error?: {message?: string}}}; message?: string};
      get().showAlert(err.response?.data?.error?.message || err.message || 'Failed to load calendar');
      return {events: []};
    } finally {
      set({isLoading: false});
    }
  },

  createCalendarEvent: async payload => {
    set({isLoading: true});
    try {
      const {data} = await apiClient.post(NEW_CALENDAR_EVENT_ENDPOINT, payload);
      if (!data.success) throw new Error(data.error?.message);
      get().invalidateCaches();
      get().showAlert(data.message || 'Event created', 'success');
      return {success: true};
    } catch (error: unknown) {
      const err = error as {response?: {data?: {error?: {message?: string}}}; message?: string};
      const msg = err.response?.data?.error?.message || err.message || 'Failed';
      get().showAlert(msg);
      return {success: false, message: msg};
    } finally {
      set({isLoading: false});
    }
  },

  getPastMediations: async (page = 1) => {
    set({isLoading: true});
    try {
      const {data} = await apiClient.get(
        `${GET_PAST_MEDIATIONS_ENDPOINT}?page=${page}`,
      );
      if (!data.success) throw new Error(data.error?.message);
      set({pastMediations: data.data?.mediations || data.data || []});
      return {success: true, data: data.data?.mediations || data.data, pagination: data.data?.pagination};
    } catch (error: unknown) {
      const err = error as {response?: {data?: {error?: {message?: string}}}; message?: string};
      get().showAlert(err.response?.data?.error?.message || err.message || 'Failed');
      return {success: false};
    } finally {
      set({isLoading: false});
    }
  },

  markCaseResolved: async (caseId, resolveStatus, agreementText, signature) => {
    set({isLoading: true});
    try {
      const {data} = await apiClient.post(MARK_CASE_RESOLVED_ENDPOINT, {
        caseId,
        resolveStatus,
        agreementText,
        signature,
      });
      if (!data.success) throw new Error(data.error?.message);
      get().invalidateCaches();
      return {success: true, message: data.message};
    } catch (error: unknown) {
      const err = error as {response?: {data?: {error?: {message?: string}}}; message?: string};
      const msg = err.response?.data?.error?.message || err.message || 'Failed';
      get().showAlert(msg);
      return {success: false, message: msg};
    } finally {
      set({isLoading: false});
    }
  },

  acceptMediationRequest: async caseId => {
    set({isLoading: true});
    try {
      const {data} = await apiClient.post(ACCEPT_MEDIATION_REQUEST_ENDPOINT, {caseId});
      if (!data.success) throw new Error(data.error?.message);
      get().invalidateCaches();
      get().showAlert(data.message || 'Request accepted', 'success');
      return {success: true};
    } catch (error: unknown) {
      const err = error as {response?: {data?: {error?: {message?: string}}}; message?: string};
      const msg = err.response?.data?.error?.message || err.message || 'Failed';
      get().showAlert(msg);
      return {success: false, message: msg};
    } finally {
      set({isLoading: false});
    }
  },

  initiateNewCase: async payload => {
    set({isLoading: true});
    try {
      const {data} = await apiClient.post(INITIATE_NEW_CASE_ENDPOINT, payload);
      if (!data.success) throw new Error(data.error?.message);
      get().invalidateCaches();
      get().showAlert(data.message || 'Case submitted for review', 'success');
      return {success: true};
    } catch (error: unknown) {
      const err = error as {response?: {data?: {error?: {message?: string}}}; message?: string};
      const msg = err.response?.data?.error?.message || err.message || 'Failed';
      get().showAlert(msg);
      return {success: false, message: msg};
    } finally {
      set({isLoading: false});
    }
  },

  submitMeetingFeedback: async payload => {
    set({isLoading: true});
    try {
      const {data} = await apiClient.post(SUBMIT_EVENT_FEEDBACK_ENDPOINT, payload);
      if (!data.success) throw new Error(data.error?.message);
      get().invalidateCaches();
      get().showAlert('Feedback submitted', 'success');
      return {success: true};
    } catch (error: unknown) {
      const err = error as {response?: {data?: {error?: {message?: string}}}; message?: string};
      const msg = err.response?.data?.error?.message || err.message || 'Failed';
      get().showAlert(msg);
      return {success: false, message: msg};
    } finally {
      set({isLoading: false});
    }
  },

  setClientPayment: async payload => {
    set({isLoading: true});
    try {
      const {data} = await apiClient.post(SET_CLIENT_PAYMENT_ENDPOINT, payload);
      if (!data.success) throw new Error(data.error?.message);
      get().invalidateCaches();
      return {success: true};
    } catch (error: unknown) {
      const err = error as {response?: {data?: {error?: {message?: string}}}; message?: string};
      const msg = err.response?.data?.error?.message || err.message || 'Failed';
      get().showAlert(msg);
      return {success: false, message: msg};
    } finally {
      set({isLoading: false});
    }
  },

  saveNote: async payload => {
    try {
      const {data} = await apiClient.post(SAVE_NOTE_ENDPOINT, payload);
      if (!data.success) throw new Error(data.error?.message);
      return {success: true};
    } catch (error: unknown) {
      const err = error as {response?: {data?: {error?: {message?: string}}}; message?: string};
      const msg = err.response?.data?.error?.message || err.message || 'Failed';
      get().showAlert(msg);
      return {success: false, message: msg};
    }
  },

  deleteNote: async payload => {
    try {
      const {data} = await apiClient.post(DELETE_NOTE_ENDPOINT, payload);
      if (!data.success) throw new Error(data.error?.message);
      return {success: true};
    } catch (error: unknown) {
      const err = error as {response?: {data?: {error?: {message?: string}}}; message?: string};
      const msg = err.response?.data?.error?.message || err.message || 'Failed';
      get().showAlert(msg);
      return {success: false, message: msg};
    }
  },

  getCaseCorrespondence: async caseId => {
    try {
      const {data} = await apiClient.get(
        `${GET_CASE_CORRESPONDENCE_ENDPOINT}?caseId=${caseId}`,
      );
      if (!data.success) throw new Error(data.error?.message);
      return {success: true, data: data.data};
    } catch (error: unknown) {
      const err = error as {response?: {data?: {error?: {message?: string}}}; message?: string};
      get().showAlert(err.response?.data?.error?.message || err.message || 'Failed');
      return {success: false};
    }
  },

  sendCaseMessage: async (caseId, content, attachments) => {
    try {
      const {data} = await apiClient.post(POST_CASE_CORRESPONDENCE_ENDPOINT, {
        caseId,
        content,
        attachments,
      });
      if (!data.success) throw new Error(data.error?.message);
      return {success: true};
    } catch (error: unknown) {
      const err = error as {response?: {data?: {error?: {message?: string}}}; message?: string};
      const msg = err.response?.data?.error?.message || err.message || 'Failed';
      get().showAlert(msg);
      return {success: false, message: msg};
    }
  },

  updateUserProfile: async payload => {
    set({isLoading: true});
    try {
      const {data} = await apiClient.post(UPDATE_USER_PROFILE_ENDPOINT, payload);
      if (!data.success) throw new Error(data.error?.message);
      get().showAlert(data.message || 'Profile updated', 'success');
      return {success: true};
    } catch (error: unknown) {
      const err = error as {response?: {data?: {error?: {message?: string}}}; message?: string};
      const msg = err.response?.data?.error?.message || err.message || 'Failed';
      get().showAlert(msg);
      return {success: false, message: msg};
    } finally {
      set({isLoading: false});
    }
  },

  deleteMyAccount: async () => {
    set({isLoading: true});
    try {
      const {data} = await apiClient.post(DELETE_MY_ACCOUNT_ENDPOINT);
      if (!data.success) throw new Error(data.error?.message);
      return {success: true, message: data.message};
    } catch (error: unknown) {
      const err = error as {response?: {data?: {error?: {message?: string}}}; message?: string};
      const msg = err.response?.data?.error?.message || err.message || 'Failed';
      get().showAlert(msg);
      return {success: false, message: msg};
    } finally {
      set({isLoading: false});
    }
  },

  getAvailableLanguages: async () => {
    try {
      const {data} = await apiClient.get(AVAILABLE_LANGUAGES_ENDPOINT);
      if (data.success) {
        set({availableLanguages: data.data?.languages || []});
        return data.data?.languages || [];
      }
      return [];
    } catch {
      return [];
    }
  },

  getSupportThreads: async () => {
    set({isLoading: true});
    try {
      const {data} = await apiClient.get(GET_PORTAL_SUPPORT_THREADS_ENDPOINT);
      if (data.success) {
        set({supportThreads: data.data || []});
        return data.data || [];
      }
      return [];
    } catch (error: unknown) {
      const err = error as {response?: {data?: {error?: {message?: string}}}; message?: string};
      get().showAlert(err.response?.data?.error?.message || err.message || 'Failed');
      return [];
    } finally {
      set({isLoading: false});
    }
  },

  createSupportThread: async (subject, content) => {
    set({isLoading: true});
    try {
      const {data} = await apiClient.post('/portal/support/thread', {subject, content});
      if (!data.success) throw new Error(data.error?.message);
      get().showAlert('Support request submitted', 'success');
      return {success: true};
    } catch (error: unknown) {
      const err = error as {response?: {data?: {error?: {message?: string}}}; message?: string};
      const msg = err.response?.data?.error?.message || err.message || 'Failed';
      get().showAlert(msg);
      return {success: false, message: msg};
    } finally {
      set({isLoading: false});
    }
  },

  registerPushToken: async (token, platform) => {
    try {
      await apiClient.post(PUSH_REGISTER_ENDPOINT, {token, platform});
    } catch {
      // Silent failure for push registration
    }
  },
}));
