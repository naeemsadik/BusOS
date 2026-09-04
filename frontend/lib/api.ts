import axios from 'axios';
import Cookies from 'js-cookie';

const API_BASE_URL =
  typeof window === 'undefined'
    ? process.env.BACKEND_INTERNAL_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      'http://localhost:5000'
    : '/backend-api';

// Create axios instance
export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = Cookies.get('access_token');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token expiration
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const requestUrl = error.config?.url || '';

      // Don't redirect to login for subscription-related endpoints
      // These may return 401 due to expired subscription, not invalid token
      const subscriptionEndpoints = [
        '/subscription',
        '/payment-history',
        '/plans',
      ];

      const isSubscriptionEndpoint = subscriptionEndpoints.some(
        endpoint => requestUrl.includes(endpoint)
      );

      if (!isSubscriptionEndpoint) {
        // Token expired or invalid for non-subscription endpoints
        Cookies.remove('access_token');
        window.location.href = '/auth/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
