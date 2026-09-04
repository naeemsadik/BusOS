import { api } from './api';

const encodePathSegment = (value: string): string => encodeURIComponent(value);

export interface CreateCustomerData {
  name: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  notes?: string;
}

export interface UpdateCustomerData {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  status?: 'active' | 'inactive' | 'blocked';
  notes?: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  status: 'active' | 'inactive' | 'blocked';
  totalSpent: number;
  totalOrders: number;
  lastOrderDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerQuery {
  search?: string;
  status?: 'active' | 'inactive' | 'blocked';
  city?: string;
  state?: string;
  country?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface CustomersResponse {
  customers: Customer[];
  total: number;
  page: number;
  totalPages: number;
}

export interface CustomerStats {
  total: number;
  active: number;
  inactive: number;
  blocked: number;
  totalSpent: number;
  averageSpent: number;
}

class CustomersService {
  async createCustomer(data: CreateCustomerData): Promise<Customer> {
    const response = await api.post('/customers', data);
    return response.data;
  }

  async getCustomers(query?: CustomerQuery): Promise<CustomersResponse> {
    const response = await api.get('/customers', { params: query });
    return response.data;
  }

  async getCustomer(id: string): Promise<Customer> {
    const response = await api.get('/customers/' + encodePathSegment(id));
    return response.data;
  }

  async updateCustomer(id: string, data: UpdateCustomerData): Promise<Customer> {
    const response = await api.patch('/customers/' + encodePathSegment(id), data);
    return response.data;
  }

  async deleteCustomer(id: string): Promise<void> {
    await api.delete('/customers/' + encodePathSegment(id));
  }

  async getCustomerStats(): Promise<CustomerStats> {
    const response = await api.get('/customers/stats');
    return response.data;
  }

  async getCustomerOrders(id: string): Promise<any[]> {
    const response = await api.get('/customers/' + encodePathSegment(id) + '/orders');
    return response.data;
  }

  async updateCustomerStats(customerId: string, orderValue: number): Promise<void> {
    await api.patch('/customers/' + encodePathSegment(customerId) + '/update-stats', { orderValue });
  }

  async getTopCustomers(limit?: number): Promise<Customer[]> {
    const response = await api.get('/customers/top', { 
      params: { limit } 
    });
    return response.data;
  }
}

export const customersService = new CustomersService();
