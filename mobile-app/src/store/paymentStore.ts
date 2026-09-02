import {create} from 'zustand';
import apiClient from '../api/client';
import {
  PAYMENT_CONFIG_ENDPOINT,
  PAYMENT_INITIATE_ENDPOINT,
  PAYMENT_VERIFY_ENDPOINT,
  PAYMENT_AMOUNTS_ENDPOINT,
} from '../api/endpoints';
import {PaymentConfig} from '../types';

interface PaymentState {
  config: PaymentConfig | null;
  amounts: Record<string, number>[];
  isLoading: boolean;

  getPaymentConfig: () => Promise<PaymentConfig | null>;
  getPaymentAmounts: () => Promise<Record<string, number>[]>;
  initiatePayment: (
    purpose: string,
    caseId?: string,
    amount?: number,
  ) => Promise<{success: boolean; data?: unknown; message?: string}>;
  verifyPayment: (
    orderId: string,
    gatewayPayload: Record<string, unknown>,
  ) => Promise<{success: boolean; message?: string}>;
}

export const usePaymentStore = create<PaymentState>((set) => ({
  config: null,
  amounts: [],
  isLoading: false,

  getPaymentConfig: async () => {
    try {
      const {data} = await apiClient.get(PAYMENT_CONFIG_ENDPOINT);
      if (data.success) {
        set({config: data.data});
        return data.data;
      }
      return null;
    } catch {
      return null;
    }
  },

  getPaymentAmounts: async () => {
    try {
      const {data} = await apiClient.get(PAYMENT_AMOUNTS_ENDPOINT);
      if (data.success) {
        set({amounts: data.data || []});
        return data.data || [];
      }
      return [];
    } catch {
      return [];
    }
  },

  initiatePayment: async (purpose, caseId, amount) => {
    set({isLoading: true});
    try {
      const {data} = await apiClient.post(PAYMENT_INITIATE_ENDPOINT, {
        purpose,
        caseId,
        amount,
      });
      if (!data.success) throw new Error(data.error?.message);
      return {success: true, data: data.data};
    } catch (error: unknown) {
      const err = error as {response?: {data?: {error?: {message?: string}}}; message?: string};
      return {
        success: false,
        message: err.response?.data?.error?.message || err.message || 'Payment failed',
      };
    } finally {
      set({isLoading: false});
    }
  },

  verifyPayment: async (orderId, gatewayPayload) => {
    set({isLoading: true});
    try {
      const {data} = await apiClient.post(PAYMENT_VERIFY_ENDPOINT, {
        orderId,
        gatewayPayload,
      });
      if (!data.success) throw new Error(data.error?.message);
      return {success: true, message: data.message || 'Payment verified'};
    } catch (error: unknown) {
      const err = error as {response?: {data?: {error?: {message?: string}}}; message?: string};
      return {
        success: false,
        message: err.response?.data?.error?.message || err.message || 'Verification failed',
      };
    } finally {
      set({isLoading: false});
    }
  },
}));
