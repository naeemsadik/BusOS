import { api } from './api';

export interface Supplier {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  address: string;
  paymentTerms: string;
  category: string;
  status: 'active' | 'inactive';
  notes?: string;
  totalPurchases: number;
  outstandingAmount: number;
  lastOrderDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSupplierData {
  name: string;
  company: string;
  email: string;
  phone?: string;
  address?: string;
  paymentTerms?: string;
  category?: string;
  status?: 'active' | 'inactive';
  notes?: string;
  totalPurchases?: number;
  outstandingAmount?: number;
}

export interface UpdateSupplierData extends Partial<CreateSupplierData> {}

export interface SupplierStats {
  totalSuppliers: number;
  activeSuppliers: number;
  totalPurchases: number;
  outstandingAmount: number;
  categories: string[];
}

export interface SuppliersResponse {
  suppliers: Supplier[];
  total: number;
  page: number;
  totalPages: number;
}

export interface SupplierQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'active' | 'inactive';
  category?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

class SupplierService {
  async getAll(query: SupplierQuery = {}): Promise<SuppliersResponse> {
    const response = await api.get('/suppliers', { params: query });
    return response.data;
  }

  async getById(id: string): Promise<Supplier> {
    const response = await api.get(`/suppliers/${id}`);
    return response.data;
  }

  async create(data: CreateSupplierData): Promise<Supplier> {
    const response = await api.post('/suppliers', data);
    return response.data;
  }

  async update(id: string, data: UpdateSupplierData): Promise<Supplier> {
    const response = await api.patch(`/suppliers/${id}`, data);
    return response.data;
  }

  async delete(id: string): Promise<void> {
    await api.delete(`/suppliers/${id}`);
  }

  async bulkDelete(ids: string[]): Promise<void> {
    await api.delete('/suppliers/bulk', { data: { ids } });
  }

  async getStats(): Promise<SupplierStats> {
    const response = await api.get('/suppliers/stats');
    return response.data;
  }

  async updateStats(id: string, data: { totalPurchases?: number; outstandingAmount?: number; lastOrderDate?: string }): Promise<Supplier> {
    const response = await api.patch(`/suppliers/${id}/stats`, data);
    return response.data;
  }
}

export const supplierService = new SupplierService();
