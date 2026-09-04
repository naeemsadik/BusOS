import { api } from './api';

export interface DashboardStats {
  overview: {
    yesterdayProfit: any;
    totalProducts: number;
    totalCustomers: number;
    currentMonthOrders: number;
    totalRevenue: number;
    totalExpenses: number;
    netProfit: number;
    monthlyGrowth: number;
    weekProfit: number;
    monthProfit: number;
    weekExpenses: number;
    monthlyExpenses: number;
  };
  inventory: {
    totalProducts: number;
    lowStockProducts: number;
    outOfStockProducts: number;
    totalValue: number;
  };
  sales: {
    totalSales: number;
    totalOrders: number;
    averageOrderValue: number;
    topProducts: any[];
  };
  customers: {
    total: number;
    active: number;
    inactive: number;
    totalSpent: number;
    averageSpent: number;
  };
  orders: {
    total: number;
    pending: number;
    confirmed: number;
    shipped: number;
    delivered: number;
    cancelled: number;
    totalRevenue: number;
  };
  invoices: {
    total: number;
    paid: number;
    pending: number;
    overdue: number;
    totalAmount: number;
  };
  delivery: {
    total: number;
    pending: number;
    inTransit: number;
    delivered: number;
    failed: number;
  };
  expenses: {
    total: number;
    totalAmount: number;
    averageAmount: number;
  };
  suppliers: {
    total: number;
    active: number;
    inactive: number;
  };
}

export interface RecentActivity {
  type: string;
  id: string;
  description: string;
  amount: number;
  status?: string;
  createdAt: string;
}

class DashboardService {
  async getStats(): Promise<DashboardStats> {
    const response = await api.get('/dashboard/stats');
    return response.data;
  }

  async getRecentActivity(limit?: number): Promise<RecentActivity[]> {
    const response = await api.get('/dashboard/activity', {
      params: { limit }
    });
    return response.data;
  }
}

export const dashboardService = new DashboardService();
