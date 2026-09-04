import { api } from './api';

export interface PosItem {
  productId: string;
  productName: string;
  productSku?: string;
  unitPrice: number;
  unitCost?: number;
  quantity: number;
  discountAmount?: number;
  total: number;
}

export interface CreateSaleData {
  customerId?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  items: PosItem[];
  subtotal: number;
  taxAmount?: number;
  discountAmount?: number;
  shippingAmount?: number;
  total: number;
  paidAmount: number; // Added paidAmount field
  paymentMethod: 'cash' | 'card' | 'bank_transfer' | 'mobile_money' | 'credit' | 'cod';
  notes?: string;
  paperflyOrderNumber?: string;
}

export interface Sale {
  id: string;
  orderNumber: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  items: any[];
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
  paidAmount: number; // Added paidAmount field
  paymentMethod: string;
  notes?: string;
  createdAt: string;
}

export interface PosStats {
  totalSales: number;
  totalOrders: number;
  averageOrderValue: number;
  topProducts: {
    name: string;
    sold: number;
    revenue: number;
  }[];
  salesByPeriod?: {
    period: string;
    sales: number;
    orders: number;
    change: string;
  }[];
}

export interface SalesPeriod {
  period?: 'today' | 'yesterday' | 'this-week' | 'this-month' | 'last-month' | 'custom';
  startDate?: string;
  endDate?: string;
}

export interface ProductProfit {
  productId: string;
  productName: string;
  totalRevenue: number;
  totalCost: number;
  totalDiscount: number;
  totalProfit: number;
  quantitySold: number;
  averageSellingPrice: number;
  averageCost: number;
  profitMargin: number;
}

export interface ProfitStats {
  period: string;
  totalProfit: number;
  paidProfit: number;
  totalRevenue: number;
  totalCost: number;
  totalDiscount: number;
  profitMargin: number;
  paidProfitMargin: number;
  topProfitableProducts: ProductProfit[];
  summary: {
    averageProfitPerSale: number;
    averagePaidProfitPerSale: number;
    highestProfitProduct: ProductProfit | null;
    lowestProfitProduct: ProductProfit | null;
  };
}

class PosService {
  async createSale(data: CreateSaleData): Promise<Sale> {
    const response = await api.post('/pos/sales', data);
    return response.data;
  }

  async getRecentSales(limit?: number): Promise<Sale[]> {
    const response = await api.get('/pos/sales/recent', { 
      params: { limit } 
    });
    return response.data;
  }

  async getSalesStats(params?: SalesPeriod): Promise<PosStats> {
    const response = await api.get('/pos/sales-stats', { 
      params
    });
    return response.data;
  }

  async getTopProducts(params?: SalesPeriod): Promise<any[]> {
    const response = await api.get('/pos/top-products', { 
      params 
    });
    return response.data;
  }

  // Profit-related methods using the formula: profit = (Selling Price - Discount - Cost Price) × Quantity
  async getTotalProfit(params?: SalesPeriod): Promise<number> {
    const response = await api.get('/pos/profit/total', { 
      params 
    });
    return response.data;
  }

  async getProfitByProduct(params?: SalesPeriod): Promise<ProductProfit[]> {
    const response = await api.get('/pos/profit/by-product', { 
      params 
    });
    return response.data;
  }

  async getProfitStats(params?: SalesPeriod): Promise<ProfitStats> {
    const response = await api.get('/pos/profit/stats', { 
      params 
    });
    return response.data;
  }
}

export const posService = new PosService();
