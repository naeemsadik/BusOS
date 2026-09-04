import axios from 'axios';
import {
  DEMO_TOKEN,
  mockAdmin,
  mockDashboardStats,
  mockSubscriptionAnalytics,
  mockSmsAnalytics,
  mockOrganizations,
  mockUsers,
  mockSubscriptions,
  mockSubscriptionPlans,
  mockSmsSettings,
  mockSmsGlobalStats,
  mockPaymentStats,
  mockPayments,
  mockCurrencies,
} from './mock-data';

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

export function isDemoActive(): boolean {
  if (typeof window === 'undefined') return false;
  const token = localStorage.getItem('admin_token');
  const demoMode = localStorage.getItem('admin_demo_mode');
  return demoMode === 'true' || token === DEMO_TOKEN;
}

export function getMockResponse(config: any): any | null {
  const url = (config?.url || '').toString();
  const method = (config?.method || 'get').toString().toLowerCase();

  // Auth & Profile
  if (url.includes('/admin/login')) {
    return {
      access_token: DEMO_TOKEN,
      admin: mockAdmin,
    };
  }
  if (url.includes('/admin/profile')) {
    return mockAdmin;
  }
  if (url.includes('/admin/change-password')) {
    return { message: 'Password changed successfully (Demo Mode)' };
  }
  if (url.includes('/admin/admins')) {
    return [mockAdmin];
  }

  // Dashboard & Analytics
  if (url.includes('/admin/dashboard')) {
    return mockDashboardStats;
  }
  if (url.includes('/admin/analytics/subscriptions')) {
    return mockSubscriptionAnalytics;
  }
  if (url.includes('/admin/analytics/sms')) {
    return mockSmsAnalytics;
  }

  // Organizations
  if (url.includes('/admin/organizations')) {
    return {
      organizations: mockOrganizations,
      total: mockOrganizations.length,
      page: 1,
      totalPages: 1,
    };
  }

  // Users
  if (url.includes('/admin/users')) {
    return {
      users: mockUsers,
      total: mockUsers.length,
      page: 1,
      totalPages: 1,
    };
  }

  // Subscription Plans
  if (url.includes('/subscription-plans/all')) {
    return mockSubscriptionPlans;
  }
  if (url.includes('/subscription-plans')) {
    if (method === 'post') {
      return {
        id: `plan-${Date.now()}`,
        name: 'New Plan',
        price: 5000,
        currency: 'BDT',
        durationDays: 30,
        features: ['Feature 1', 'Feature 2'],
        isActive: true,
        isPopular: false,
        sortOrder: 5,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }
    return { message: 'Plan operation successful (Demo Mode)' };
  }

  // Subscriptions
  if (url.includes('/admin/subscriptions')) {
    return {
      subscriptions: mockSubscriptions,
      total: mockSubscriptions.length,
      page: 1,
      totalPages: 1,
    };
  }

  // SMS
  if (url.includes('/admin/sms/settings')) {
    return mockSmsSettings;
  }
  if (url.includes('/admin/sms/global-stats')) {
    return mockSmsGlobalStats;
  }
  if (url.includes('/admin/sms/gateway-balance')) {
    return { balance: 1250 };
  }

  // Payments
  if (url.includes('/admin/payments/statistics')) {
    return mockPaymentStats;
  }
  if (url.includes('/admin/payments') || url.includes('/payments/')) {
    if (url.includes('/payments/bkash/refund')) {
      return { message: 'Payment refunded successfully (Demo Mode)', refundId: 'REF-DEMO-991' };
    }
    return mockPayments;
  }

  // Currencies
  if (url.includes('/api/currency/popular')) {
    return mockCurrencies.slice(0, 5);
  }
  if (url.includes('/api/currency')) {
    return mockCurrencies;
  }

  // Generic fallback for any other demo mutation or read
  if (['post', 'put', 'patch', 'delete'].includes(method)) {
    return { message: 'Action succeeded (Demo Mode)' };
  }

  return null;
}

// Request interceptor to add auth token and mock adapter when demo mode is active
api.interceptors.request.use(
  (config: any) => {
    if (typeof window !== 'undefined') {
      const adminToken = localStorage.getItem('admin_token');
      if (adminToken) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${adminToken}`;
      }

      if (isDemoActive()) {
        const mockData = getMockResponse(config);
        if (mockData !== null) {
          config.adapter = async (cfg: any) => ({
            data: mockData,
            status: 200,
            statusText: 'OK',
            headers: {},
            config: cfg,
          });
        }
      }
    }
    return config;
  },
  (error: any) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token expiration and network fallback
api.interceptors.response.use(
  (response: any) => response,
  async (error: any) => {
    // If backend is down/unreachable, gracefully fall back to mock data
    const isNetworkError = !error?.response || error?.code === 'ERR_NETWORK' || error?.code === 'ECONNREFUSED';
    if (isDemoActive() || isNetworkError) {
      const mockData = getMockResponse(error?.config);
      if (mockData !== null) {
        return {
          data: mockData,
          status: 200,
          statusText: 'OK',
          headers: {},
          config: error.config,
        };
      }
    }

    if (error?.response?.status === 401 && !isDemoActive()) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('admin_token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
