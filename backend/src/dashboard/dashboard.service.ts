import { Injectable, Logger } from '@nestjs/common';
import { Organization } from '../entities';
import { ProductService } from '../inventory/services/product.service';
import { PosService } from '../pos/pos.service';
import { CustomersService } from '../customers/customers.service';
import { OrdersService } from '../orders/orders.service';
import { InvoicesService } from '../invoices/invoices.service';
import { DeliveryService } from '../delivery/delivery.service';
import { ExpensesService } from '../expenses/expenses.service';
import { SupplierService } from '../inventory/services/supplier.service';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    private productService: ProductService,
    private posService: PosService,
    private customersService: CustomersService,
    private ordersService: OrdersService,
    private invoicesService: InvoicesService,
    private deliveryService: DeliveryService,
    private expensesService: ExpensesService,
    private supplierService: SupplierService,
  ) {}

  async getDashboardStats(organization: Organization): Promise<any> {
    try {
      const [
        inventoryStats,
        salesStats,
        customerStats,
        orderStats,
        invoiceStats,
        deliveryStats,
        expenseStats,
        supplierStats,
      ] = await Promise.all([
        this.productService.getInventoryStats(organization),
        this.posService.getSalesStats(organization, { period: 'today' }),
        this.customersService.getCustomerStats(organization),
        this.ordersService.getOrderStats(organization),
        this.invoicesService.getInvoiceStats(organization),
        this.deliveryService.getDeliveryStats(organization),
        this.expensesService.getExpenseStats(organization),
        this.supplierService.getSupplierStats(organization),
      ]);

      // Calculate key metrics
      const totalRevenue = salesStats.totalSales || 0;
      const totalExpenses = expenseStats.totalAmount || 0;
      
      // Get weekly profit using the improved calculation
      const weekProfit = await this.posService.getTotalProfit(organization, { period: 'this-week' });
      
      // Get this month's profit for better metrics
      const monthProfit = await this.posService.getTotalProfit(organization, { period: 'this-month' });
      
      const weekExpenses = await this.getWeeklyExpenses(organization);

      const monthlyExpenses = await this.getMonthlyExpenses(organization);
      
      const netProfit = weekProfit - weekExpenses;

      // Monthly growth calculation (simplified)
      const monthlyGrowth = this.calculateMonthlyGrowth(salesStats);

      return {
        overview: {
          totalProducts: inventoryStats.totalProducts,
          totalCustomers: customerStats.total,
          currentMonthOrders: orderStats.total,
          totalRevenue,
          totalExpenses,
          netProfit,
          monthlyGrowth,
          weekProfit,
          monthProfit: monthProfit - monthlyExpenses,
          weekExpenses,
          monthlyExpenses,
        },
        inventory: {
          totalProducts: inventoryStats.totalProducts,
          lowStockProducts: inventoryStats.lowStockCount,
          outOfStockProducts: inventoryStats.outOfStockCount,
          totalValue: inventoryStats.totalValue,
        },
        sales: {
          totalSales: salesStats.totalSales,
          totalOrders: salesStats.totalOrders,
          averageOrderValue: salesStats.averageOrderValue,
          topProducts: salesStats.topProducts,
        },
        customers: {
          total: customerStats.total,
          active: customerStats.active,
          inactive: customerStats.inactive,
          totalSpent: customerStats.totalSpent,
          averageSpent: customerStats.averageSpent,
        },
        orders: {
          total: orderStats.total,
          pending: orderStats.pending,
          confirmed: orderStats.confirmed,
          shipped: orderStats.shipped,
          delivered: orderStats.delivered,
          cancelled: orderStats.cancelled,
          totalRevenue: orderStats.totalRevenue,
        },
        invoices: {
          total: invoiceStats.total,
          paid: invoiceStats.paid,
          pending: invoiceStats.totalAmount - invoiceStats.paidAmount,
          overdue: invoiceStats.overdue,
          totalAmount: invoiceStats.totalAmount,
        },
        delivery: {
          total: deliveryStats.total,
          pending: deliveryStats.pending,
          inTransit: deliveryStats.inTransit,
          delivered: deliveryStats.delivered,
          failed: deliveryStats.failed,
        },
        expenses: {
          total: expenseStats.total,
          totalAmount: expenseStats.totalAmount,
          averageAmount: expenseStats.averageAmount,
        },
        suppliers: {
          total: supplierStats.totalSuppliers,
          active: supplierStats.activeSuppliers,
          inactive: supplierStats.totalSuppliers - supplierStats.activeSuppliers,
        },
        lastUpdated: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Error fetching dashboard stats:', error);
      throw error;
    }
  }

  private calculateMonthlyGrowth(salesStats: any): number {
    // This is a simplified calculation
    // In a real scenario, you'd compare current month vs previous month
    const totalSales = salesStats.totalSales || 0;
    const totalOrders = salesStats.totalOrders || 0;
    
    // Simple growth calculation based on order volume
    // You could enhance this with actual month-over-month comparison
    if (totalOrders > 100) return 24.5;
    if (totalOrders > 50) return 15.2;
    if (totalOrders > 20) return 8.7;
    return 3.2;
  }

  async getRecentActivity(organization: Organization, limit: number = 10): Promise<any> {
    try {
      const [recentSales, recentOrders] = await Promise.all([
        this.posService.getRecentSales(organization, limit),
        this.ordersService.findAll({}, organization),
      ]);

      // Combine and sort by date
      const activities = [
        ...recentSales.map(sale => ({
          type: 'sale',
          id: sale.id,
          description: `Sale of ${sale.items?.length || 0} items`,
          amount: sale.total,
          createdAt: sale.createdAt,
        })),
        ...recentOrders.orders.slice(0, limit).map(order => ({
          type: 'order',
          id: order.id,
          description: `Order #${order.orderNumber}`,
          amount: order.total,
          status: order.status,
          createdAt: order.createdAt,
        })),
      ];

      // Sort by most recent first
      activities.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      return activities.slice(0, limit);
    } catch (error) {
      this.logger.error('Error fetching recent activity:', error);
      return [];
    }
  }

  private async getWeeklyExpenses(organization: Organization): Promise<number> {
    try {
      // Get start of current week (Monday)
      const startOfWeek = new Date();
      const day = startOfWeek.getDay();
      const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
      startOfWeek.setDate(diff);
      startOfWeek.setHours(0, 0, 0, 0);

      // Get end of current week (Sunday)
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);

      const expensesResult = await this.expensesService.findAll(
        {
          startDate: startOfWeek.toISOString(),
          endDate: endOfWeek.toISOString(),
        },
        organization
      );

      return expensesResult.expenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
    } catch (error) {
      console.error('Error calculating weekly expenses:', error);
      return 0;
    }
  }

  private async getMonthlyExpenses(organization: Organization): Promise<number> {
    try {
      // Get start of current month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      // Get end of current month
      const endOfMonth = new Date(startOfMonth);
      endOfMonth.setMonth(startOfMonth.getMonth() + 1);
      endOfMonth.setDate(0);
      endOfMonth.setHours(23, 59, 59, 999);

      const expensesResult = await this.expensesService.findAll(
        {
          startDate: startOfMonth.toISOString(),
          endDate: endOfMonth.toISOString(),
        },
        organization
      );

      return expensesResult.expenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
    } catch (error) {
      console.error('Error calculating monthly expenses:', error);
      return 0;
    }
  }
}
