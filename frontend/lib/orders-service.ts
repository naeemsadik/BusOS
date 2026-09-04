import { api } from './api';
import { customersService } from './customers-service';

export interface OrderItem {
  productId: string;
  productName: string;
  productSku?: string;
  unitPrice: number;
  quantity: number;
  discountAmount?: number;
  total: number;
}

export interface CreateOrderData {
  customerId?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  items: OrderItem[];
  subtotal: number;
  taxAmount?: number;
  discountAmount?: number;
  shippingAmount?: number;
  total: number;
  shippingAddress?: string;
  shippingCity?: string;
  shippingState?: string;
  shippingZipCode?: string;
  shippingCountry?: string;
  notes?: string;
}

export interface UpdateOrderData {
  status?: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'returned';
  paymentStatus?: 'pending' | 'paid' | 'partial' | 'failed' | 'refunded' | 'cod';
  paymentMethod?: 'cash' | 'card' | 'bank_transfer' | 'mobile_money' | 'credit';
  paidAmount?: number;
  trackingNumber?: string;
  courierService?: string;
  paperflyOrderNumber?: string;
  notes?: string;
  shippingAddress?: string;
  shippingCity?: string;
  shippingState?: string;
  shippingZipCode?: string;
  shippingCountry?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerId?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  customer?: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
    status?: string;
    totalSpent?: string;
    totalOrders?: number;
    lastOrderDate?: string;
    notes?: string;
    organizationId?: string;
    createdAt?: string;
    updatedAt?: string;
  };
  items: any[];
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  shippingAmount: number;
  total: number;
  paidAmount: number;
  status: string;
  paymentStatus: string;
  paymentMethod?: string;
  shippingAddress?: string;
  shippingCity?: string;
  shippingState?: string;
  shippingZipCode?: string;
  shippingCountry?: string;
  trackingNumber?: string;
  courierService?: string;
  paperflyOrderNumber?: string;
  trackingStatus?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderQuery {
  search?: string;
  status?: string;
  paymentStatus?: string;
  customerId?: string;
  startDate?: string;
  endDate?: string;
  minAmount?: number;
  maxAmount?: number;
  page?: number;
  limit?: number;
}

export interface OrdersResponse {
  orders: Order[];
  total: number;
  page: number;
  totalPages: number;
}

export interface OrderStats {
  total: number;
  pending: number;
  confirmed: number;
  processing: number;
  shipped: number;
  delivered: number;
  cancelled: number;
  totalRevenue: number;
}

class OrdersService {
  async createOrder(data: CreateOrderData): Promise<Order> {
    const response = await api.post('/orders', data);
    return response.data;
  }

  async getOrders(query?: OrderQuery): Promise<OrdersResponse> {
    const response = await api.get('/orders', { params: query });
    return response.data;
  }

  async getOrder(id: string): Promise<Order> {
    const response = await api.get(`/orders/${id}`);
    return response.data;
  }

  async updateOrder(id: string, data: UpdateOrderData): Promise<Order> {
    const response = await api.patch(`/orders/${id}`, data);
    return response.data;
  }

  async deleteOrder(id: string, customerId: string, orderValue: number): Promise<void> {
    await api.delete(`/orders/${id}`);
    await customersService.updateCustomerStats(customerId, -orderValue);
  }

  async getOrderStats(): Promise<OrderStats> {
    const response = await api.get('/orders/stats');
    return response.data;
  }
}

export const ordersService = new OrdersService();
