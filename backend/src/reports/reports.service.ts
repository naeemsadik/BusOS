import { Injectable } from '@nestjs/common';
import { Organization } from '../entities';
import { PosService } from '../pos/pos.service';
import { ExpensesService } from '../expenses/expenses.service';
import { CustomersService } from '../customers/customers.service';
import { ProductService } from '../inventory/services/product.service';

export interface ReportsPeriod {
  period?: string;
  startDate?: string;
  endDate?: string;
  year?: number;
  isCustomRange?: boolean;
}

@Injectable()
export class ReportsService {
  constructor(
    private posService: PosService,
    private expensesService: ExpensesService,
    private customersService: CustomersService,
    private productService: ProductService,
  ) {}

  async getSalesReport(organization: Organization, params: ReportsPeriod) {
    try {
      const { period, startDate, endDate } = params;
      
      const salesStats = await this.posService.getSalesStats(organization, {
        period: period as any,
        startDate,
        endDate,
      });

      // Get top products
      const topProducts = await this.posService.getTopProducts(organization, {
        period: period as any,
        startDate,
        endDate,
      });

      return {
        ...salesStats,
        topProducts,
      };
    } catch (error) {
      console.error('Error fetching sales report:', error);
      throw error;
    }
  }

  async getExpenseReport(organization: Organization, params: ReportsPeriod) {
    try {
      const { period, startDate, endDate, year } = params;
      
      // Get expense statistics
      const expenseStats = await this.expensesService.getExpenseStats(organization);
      
      // Get monthly expense data
      const monthlyExpenses = await this.expensesService.getMonthlyExpenses(organization, year);
      
      // Get expense categories breakdown
      const categoriesBreakdown = await this.expensesService.getExpensesByCategory(organization);
      
      return {
        stats: expenseStats,
        monthly: monthlyExpenses,
        categories: categoriesBreakdown,
      };
    } catch (error) {
      console.error('Error fetching expense report:', error);
      throw error;
    }
  }

  async getCustomerReport(organization: Organization) {
    try {
      const customerStats = await this.customersService.getCustomerStats(organization);
      return customerStats;
    } catch (error) {
      console.error('Error fetching customer report:', error);
      throw error;
    }
  }

  async getInventoryReport(organization: Organization) {
    try {
      const inventoryStats = await this.productService.getInventoryStats(organization);
      return inventoryStats;
    } catch (error) {
      console.error('Error fetching inventory report:', error);
      throw error;
    }
  }
}
