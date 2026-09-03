import {create} from 'zustand';
import apiClient from '../api/client';
import {
  LOGIN_ENDPOINT,
  LOGOUT_ENDPOINT,
  RESET_PASSWORD_ENDPOINT,
  CONFIRM_PASSWORD_CHANGE_ENDPOINT,
  NEW_USER_SIGNUP_ENDPOINT,
  NEW_MEDIATOR_SIGNUP_ENDPOINT,
  IS_EMAIL_EXIST_ENDPOINT,
  GET_USER_DATA_ENDPOINT,
  SEND_OTP_ENDPOINT,
  VERIFY_OTP_ENDPOINT,
} from '../api/endpoints';
import {setTokens, clearTokens, hasStoredSession} from '../utils/tokenStorage';
import {User} from '../types';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitializing: boolean;

  // Actions
  initialize: () => Promise<void>;
  login: (
    username: string,
    password: string,
    userType?: string,
  ) => Promise<{
    success: boolean;
    needsAccountType?: boolean;
    availableTypes?: string[];
    message?: string;
  }>;
  logout: () => Promise<void>;
  getUserData: () => Promise<void>;
  resetPassword: (emailAddress: string, userType?: string) => Promise<{success: boolean; message?: string}>;
  confirmPasswordChange: (
    emailAddress: string,
    otp: string,
    password: string,
  ) => Promise<{success: boolean; message?: string}>;
  newUserSignup: (
    userDetails: Record<string, unknown>,
    existingUser?: boolean,
  ) => Promise<{success: boolean; message?: string}>;
  newMediatorSignup: (
    userDetails: Record<string, unknown>,
  ) => Promise<{success: boolean; message?: string}>;
  isEmailExist: (
    email: string,
    type?: string,
  ) => Promise<{success: boolean; exists?: boolean; data?: Record<string, unknown>; message?: string}>;
  sendOtp: (recordId: string) => Promise<{success: boolean; data?: Record<string, unknown>}>;
  verifyOtp: (
    requestId: string,
    otp: string,
  ) => Promise<{success: boolean; message?: string}>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  isInitializing: true,

  initialize: async () => {
    try {
      const hasSession = await hasStoredSession();
      if (hasSession) {
        await get().getUserData();
      }
    } catch {
      await clearTokens();
    } finally {
      set({isInitializing: false});
    }
  },

  login: async (username, password, userType) => {
    set({isLoading: true});
    try {
      const {data} = await apiClient.post(LOGIN_ENDPOINT, {
        username,
        password,
        ...(userType ? {userType} : {}),
        clientType: 'mobile',
      });
      if (!data.success) throw new Error(data.error?.message || 'Login failed');

      await setTokens({
        accessToken: data.data.accessToken,
        refreshToken: data.data.refreshToken,
      });

      await get().getUserData();
      return {success: true};
    } catch (error: unknown) {
      const err = error as {response?: {data?: {error?: {message?: string; code?: string; details?: {availableTypes?: string[]}}}}; message?: string};
      const errPayload = err.response?.data?.error;
      const msg = errPayload?.message || err.message || 'Login failed';

      if (errPayload?.code === 'E111') {
        return {
          success: false,
          needsAccountType: true,
          availableTypes: errPayload?.details?.availableTypes || [],
          message: msg,
        };
      }
      return {success: false, message: msg};
    } finally {
      set({isLoading: false});
    }
  },

  logout: async () => {
    set({isLoading: true});
    try {
      await apiClient.get(LOGOUT_ENDPOINT);
    } catch {
      // Continue with local logout even if server fails
    }
    await clearTokens();
    set({user: null, isAuthenticated: false, isLoading: false});
  },

  getUserData: async () => {
    try {
      const {data} = await apiClient.get(GET_USER_DATA_ENDPOINT);
      if (data.success && data.data) {
        set({user: data.data, isAuthenticated: true});
      }
    } catch {
      set({user: null, isAuthenticated: false});
      await clearTokens();
    }
  },

  resetPassword: async (emailAddress, userType) => {
    set({isLoading: true});
    try {
      const {data} = await apiClient.post(RESET_PASSWORD_ENDPOINT, {
        emailAddress,
        ...(userType ? {userType} : {}),
      });
      if (!data.success) throw new Error(data.error?.message);
      return {success: true, message: data.message};
    } catch (error: unknown) {
      const err = error as {response?: {data?: {error?: {message?: string}}}; message?: string};
      const msg = err.response?.data?.error?.message || err.message || 'Failed';
      return {success: false, message: msg};
    } finally {
      set({isLoading: false});
    }
  },

  confirmPasswordChange: async (emailAddress, otp, password) => {
    set({isLoading: true});
    try {
      const {data} = await apiClient.post(CONFIRM_PASSWORD_CHANGE_ENDPOINT, {
        emailAddress,
        otp,
        password,
      });
      if (!data.success) throw new Error(data.error?.message);
      return {success: true, message: data.message || 'Password changed successfully'};
    } catch (error: unknown) {
      const err = error as {response?: {data?: {error?: {message?: string}}}; message?: string};
      const msg = err.response?.data?.error?.message || err.message || 'Failed';
      return {success: false, message: msg};
    } finally {
      set({isLoading: false});
    }
  },

  newUserSignup: async (userDetails, existingUser) => {
    set({isLoading: true});
    try {
      const {data} = await apiClient.post(NEW_USER_SIGNUP_ENDPOINT, {
        ...userDetails,
        existingUser,
      });
      if (!data.success) throw new Error(data.error?.message);
      return {success: true, message: data.message};
    } catch (error: unknown) {
      const err = error as {response?: {data?: {error?: {message?: string}}}; message?: string};
      const msg = err.response?.data?.error?.message || err.message || 'Failed';
      return {success: false, message: msg};
    } finally {
      set({isLoading: false});
    }
  },

  newMediatorSignup: async userDetails => {
    set({isLoading: true});
    try {
      const {data} = await apiClient.post(NEW_MEDIATOR_SIGNUP_ENDPOINT, {
        userDetails,
      });
      if (!data.success) throw new Error(data.error?.message);
      return {success: true, message: data.message};
    } catch (error: unknown) {
      const err = error as {response?: {data?: {error?: {message?: string}}}; message?: string};
      const msg = err.response?.data?.error?.message || err.message || 'Failed';
      return {success: false, message: msg};
    } finally {
      set({isLoading: false});
    }
  },

  isEmailExist: async (email, type) => {
    try {
      const params = new URLSearchParams({email});
      if (type) params.set('type', type.toUpperCase());
      const {data} = await apiClient.get(
        `${IS_EMAIL_EXIST_ENDPOINT}?${params.toString()}`,
      );
      if (!data.success) throw new Error(data.error?.message);
      return {success: true, exists: data.data?.exists, data: data.data, message: data.message};
    } catch (error: unknown) {
      const err = error as {response?: {data?: {error?: {message?: string}}}; message?: string};
      const msg = err.response?.data?.error?.message || err.message || 'Failed';
      return {success: false, message: msg};
    }
  },

  sendOtp: async recordId => {
    set({isLoading: true});
    try {
      const {data} = await apiClient.post(SEND_OTP_ENDPOINT, {id: recordId});
      if (!data.success) throw new Error(data.error?.message);
      return {success: true, data: data.data};
    } catch (error: unknown) {
      const err = error as {response?: {data?: {error?: {message?: string}}}; message?: string};
      return {success: false, data: {message: err.response?.data?.error?.message || err.message}};
    } finally {
      set({isLoading: false});
    }
  },

  verifyOtp: async (requestId, otp) => {
    set({isLoading: true});
    try {
      const {data} = await apiClient.post(VERIFY_OTP_ENDPOINT, {
        requestId,
        otp,
      });
      if (!data.success) throw new Error(data.error?.message);
      return {success: true, message: data.message};
    } catch (error: unknown) {
      const err = error as {response?: {data?: {error?: {message?: string}}}; message?: string};
      const msg = err.response?.data?.error?.message || err.message || 'Failed';
      return {success: false, message: msg};
    } finally {
      set({isLoading: false});
    }
  },
}));
