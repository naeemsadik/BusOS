import api from './api';
import { adminSMSService } from './sms-service';
import {
  Admin,
  AdminDashboardStats,
  AdminSubscriptionAnalytics,
  AdminSmsAnalytics,
  AdminOrganizationItem,
  AdminUserItem,
  AdminSubscriptionItem,
  AdminLoginRequest,
  AdminLoginResponse,
  CreateAdminRequest,
  UpdateAdminRequest,
  ChangeAdminPasswordRequest,
  CreateSubscriptionRequest,
  UpdateSubscriptionRequest,
  SubscriptionPlan,
  ApiResponse,
} from './types';

export const adminService = {
  // Authentication
  async login(data: AdminLoginRequest): Promise<AdminLoginResponse> {
    const response = await api.post('/admin/login', data);
    return response.data as AdminLoginResponse;
  },

  async getProfile(): Promise<Admin> {
    const response = await api.get('/admin/profile');
    return response.data as Admin;
  },

  async updateProfile(data: UpdateAdminRequest): Promise<Admin> {
    const response = await api.patch('/admin/profile', data);
    return response.data as Admin;
  },

  async changePassword(data: ChangeAdminPasswordRequest): Promise<ApiResponse> {
    const response = await api.patch('/admin/change-password', data);
    return response.data as ApiResponse;
  },

  // Dashboard
  async getDashboardStats(): Promise<AdminDashboardStats> {
    try {
      // Get basic dashboard stats from API
      const response = await api.get('/admin/dashboard');
      const dashboardStats = response.data as AdminDashboardStats;
      
      // Get SMS stats and enhance dashboard stats
      const [smsStats, balanceStatus] = await Promise.all([
        adminSMSService.getSMSStats(),
        adminSMSService.getBalanceStatus()
      ]);
      
      return {
        ...dashboardStats,
        smsBalance: balanceStatus.balance,
        smsBalanceStatus: balanceStatus.status,
        monthlySMSSent: smsStats.monthlyUsage.sent,
        todaySMSSent: smsStats.todayUsage.sent
      };
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      // Return stats without SMS info if SMS service fails
      const response = await api.get('/admin/dashboard');
      return response.data as AdminDashboardStats;
    }
  },

  async getSubscriptionAnalytics(): Promise<AdminSubscriptionAnalytics> {
    const response = await api.get('/admin/analytics/subscriptions');
    return response.data as AdminSubscriptionAnalytics;
  },

  async getSmsAnalytics(): Promise<AdminSmsAnalytics> {
    const response = await api.get('/admin/analytics/sms');
    return response.data as AdminSmsAnalytics;
  },

  // Organizations
  async getOrganizations(page: number = 1, limit: number = 10): Promise<{
    organizations: AdminOrganizationItem[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const response = await api.get(`/admin/organizations?page=${page}&limit=${limit}`);
    return response.data as {
      organizations: AdminOrganizationItem[];
      total: number;
      page: number;
      totalPages: number;
    };
  },

  // Users
  async getUsers(page: number = 1, limit: number = 10): Promise<{
    users: AdminUserItem[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const response = await api.get(`/admin/users?page=${page}&limit=${limit}`);
    return response.data as {
      users: AdminUserItem[];
      total: number;
      page: number;
      totalPages: number;
    };
  },

  // Subscriptions
  async getSubscriptions(page: number = 1, limit: number = 10): Promise<{
    subscriptions: AdminSubscriptionItem[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const response = await api.get(`/admin/subscriptions?page=${page}&limit=${limit}`);
    return response.data as {
      subscriptions: AdminSubscriptionItem[];
      total: number;
      page: number;
      totalPages: number;
    };
  },

  // Admin Management
  async createAdmin(data: CreateAdminRequest): Promise<Admin> {
    const response = await api.post('/admin/create', data);
    return response.data as Admin;
  },

  async getAllAdmins(): Promise<Admin[]> {
    const response = await api.get('/admin/admins');
    return response.data as Admin[];
  },

  async deactivateAdmin(adminId: string): Promise<ApiResponse> {
    const response = await api.patch(`/admin/admins/${adminId}/deactivate`);
    return response.data as ApiResponse;
  },

  // Subscription Management
  async createSubscription(data: CreateSubscriptionRequest): Promise<AdminSubscriptionItem> {
    const response = await api.post('/admin/subscriptions', data);
    return response.data as AdminSubscriptionItem;
  },

  async updateSubscription(subscriptionId: string, data: UpdateSubscriptionRequest): Promise<AdminSubscriptionItem> {
    const response = await api.patch(`/admin/subscriptions/${subscriptionId}`, data);
    return response.data as AdminSubscriptionItem;
  },

  async getSubscriptionDetails(subscriptionId: string): Promise<AdminSubscriptionItem> {
    const response = await api.get(`/admin/subscriptions/${subscriptionId}`);
    return response.data as AdminSubscriptionItem;
  },

  async deleteSubscription(subscriptionId: string): Promise<ApiResponse> {
    const response = await api.delete(`/admin/subscriptions/${subscriptionId}`);
    return response.data as ApiResponse;
  },

  // Subscription Plan Management
  async getAllSubscriptionPlans(): Promise<Array<{
    id: string;
    name: string;
    planType: SubscriptionPlan;
    description: string;
    price: number;
    currency: string;
    durationDays: number;
    features: string[];
    maxUsers: number | null;
    maxInventoryItems: number | null;
    isActive: boolean;
    isPopular: boolean;
    sortOrder: number;
    createdAt: string;
    updatedAt: string;
  }>> {
    const response = await api.get('/subscription-plans/all');
    return response.data as Array<{
      id: string;
      name: string;
      planType: SubscriptionPlan;
      description: string;
      price: number;
      currency: string;
      durationDays: number;
      features: string[];
      maxUsers: number | null;
      maxInventoryItems: number | null;
      isActive: boolean;
      isPopular: boolean;
      sortOrder: number;
      createdAt: string;
      updatedAt: string;
    }>;
  },

  async createSubscriptionPlan(data: {
    name: string;
    planType: SubscriptionPlan;
    description: string;
    price: number;
    currency: string;
    durationDays: number;
    features: string[];
    maxUsers?: number;
    maxInventoryItems?: number;
    isActive: boolean;
    isPopular: boolean;
    sortOrder: number;
  }): Promise<any> {
    const response = await api.post('/subscription-plans', data);
    return response.data as any;
  },

  async togglePlanStatus(planId: string): Promise<any> {
    const response = await api.patch(`/subscription-plans/${planId}/toggle-status`);
    return response.data as any;
  },

  async initializeDefaultPlans(): Promise<any> {
    const response = await api.post('/subscription-plans/init-default');
    return response.data as any;
  },

  async updateSubscriptionPlan(planId: string, data: {
    name?: string;
    planType?: SubscriptionPlan;
    description?: string;
    price?: number;
    currency?: string;
    durationDays?: number;
    features?: string[];
    maxUsers?: number;
    maxInventoryItems?: number;
    isActive?: boolean;
    isPopular?: boolean;
    sortOrder?: number;
  }): Promise<any> {
    const response = await api.put(`/subscription-plans/${planId}`, data);
    return response.data as any;
  },

  async deleteSubscriptionPlan(planId: string): Promise<any> {
    const response = await api.delete(`/subscription-plans/${planId}`);
    return response.data as any;
  },

  // SMS Management
  async getSmsSettings(): Promise<any> {
    const response = await api.get('/admin/sms/settings');
    return response.data;
  },

  async updateSmsSettings(settings: {
    pricePerSms: number;
    minimumPurchase: number;
    maximumPurchase: number;
    lowBalanceThreshold: number;
    criticalBalanceThreshold: number;
    isEnabled: boolean;
  }): Promise<any> {
    const response = await api.put('/admin/sms/settings', settings);
    return response.data;
  },

  async getSmsGlobalStats(): Promise<any> {
    const response = await api.get('/admin/sms/global-stats');
    return response.data;
  },
};
