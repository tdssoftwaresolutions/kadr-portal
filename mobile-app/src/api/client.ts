import axios, {
  AxiosInstance,
  InternalAxiosRequestConfig,
  AxiosResponse,
  AxiosError,
} from 'axios';
import {API_BASE_URL} from '../config';
import {
  getAccessToken,
  getRefreshToken,
  setTokens,
  clearTokens,
} from '../utils/tokenStorage';

const REFRESH_TOKEN_ENDPOINT = '/refresh-token';

const EXCLUDED_ENDPOINTS = [
  '/login',
  '/getExistingUser',
  '/resetPassword',
  '/confirmPasswordChange',
  '/newUserSignup',
  '/newMediatorSignup',
  '/isEmailExist',
  '/website-contact',
];

function isExcludedUrl(url = ''): boolean {
  return EXCLUDED_ENDPOINTS.some(endpoint => url.includes(endpoint));
}

let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

function subscribeTokenRefresh(cb: (token: string) => void) {
  refreshSubscribers.push(cb);
}

function onTokenRefreshed(token: string) {
  refreshSubscribers.forEach(cb => cb(token));
  refreshSubscribers = [];
}

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 100000,
  headers: {
    'Content-Type': 'application/json',
    'X-Kadr-Client': 'mobile',
  },
});

// Request interceptor: attach auth token
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    if (!isExcludedUrl(config.url)) {
      const token = await getAccessToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  error => Promise.reject(error),
);

// Response interceptor: handle token refresh on E102
apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const errorCode =
      (error.response?.data as {errorCode?: string})?.errorCode;

    if (errorCode !== 'E102') {
      return Promise.reject(error);
    }

    const originalRequest = error.config;
    if (!originalRequest) return Promise.reject(error);

    if (isRefreshing) {
      return new Promise(resolve => {
        subscribeTokenRefresh((token: string) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          resolve(apiClient(originalRequest));
        });
      });
    }

    isRefreshing = true;

    try {
      const refreshToken = await getRefreshToken();
      const body = refreshToken ? {refreshToken} : {};
      const {data} = await apiClient.post(REFRESH_TOKEN_ENDPOINT, body);

      const accessToken = data?.data?.accessToken || data?.accessToken;
      if (!accessToken) throw new Error('Refresh failed');

      await setTokens({accessToken});
      onTokenRefreshed(accessToken);

      originalRequest.headers.Authorization = `Bearer ${accessToken}`;
      return apiClient(originalRequest);
    } catch (refreshError) {
      await clearTokens();
      // The store will detect this and navigate to login
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

export default apiClient;
