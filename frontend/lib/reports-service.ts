import { api } from './api';
import { posService, type SalesPeriod } from './pos-service';

export interface SalesSummary {
  totalSales: number;
  totalOrders: number;
  averageOrderValue: number;
  topProducts: any[];
  salesByPeriod?: {
    period: string;
    sales: number;
    orders: number;
    change: string;
  }[];
}

export interface ExpenseSummary {
  total: number;
  totalAmount: number;
  currentMonthAmount: number;
  pending: number;
  approved: number;
  rejected: number;
  paid: number;
  categoriesBreakdown: {
    category: string;
    amount: number;
    percentage: number;
    count: number;
  }[];
}

export interface CustomerSummary {
  total: number;
  active: number;
  inactive: number;
  newCustomers: number;
  totalSpent: number;
  averageSpent: number;
}

export interface DashboardSummary {
  overview: {
    totalProducts: number;
    totalCustomers: number;
    currentMonthOrders: number;
    totalRevenue: number;
    totalExpenses: number;
    netProfit: number;
    monthlyGrowth: number;
  };
  inventory: any;
  sales: any;
  customers: any;
  orders: any;
  invoices: any;
  delivery: any;
  expenses: any;
  suppliers: any;
}

export type ReportsPeriod = SalesPeriod;

class ReportsService {
  async getDashboardStats(): Promise<DashboardSummary> {
    const response = await api.get('/dashboard/stats');
    return response.data;
  }

  async getSalesSummary(params?: ReportsPeriod): Promise<SalesSummary> {
    return posService.getSalesStats(params);
  }

  async getExpenseSummary(): Promise<ExpenseSummary> {
    const response = await api.get('/expenses/stats');
    return response.data;
  }

  async getCustomerSummary(): Promise<CustomerSummary> {
    const response = await api.get('/customers/stats');
    return response.data;
  }

  async getMonthlyExpenses(year?: number): Promise<any> {
    const response = await api.get('/expenses/monthly', {
      params: { year }
    });
    return response.data;
  }

  async getTopSellingProducts(period?: ReportsPeriod): Promise<any[]> {
    return posService.getTopProducts(period);
  }
}

export const reportsService = new ReportsService();
