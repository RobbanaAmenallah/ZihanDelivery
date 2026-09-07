import axios, { type AxiosInstance, type AxiosError } from 'axios';
import { API_BASE_URL } from '@/lib/constants';

/**
 * Shared Axios instance with base URL and interceptors.
 */
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Request Interceptor: Attach auth tokens when available
apiClient.interceptors.request.use(
  (config) => {
    // Option to inject Supabase access token in Authorization header
    const token = localStorage.getItem('supabase_access_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Format error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    // Centralized error logging/handling
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export default apiClient;
