import { api } from './api';

export interface UpdateInvoiceData {
  status?: 'draft' | 'sent' | 'viewed' | 'paid' | 'overdue' | 'cancelled';
  paidDate?: string;
  notes?: string;
  terms?: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  customerId?: string;
  customerName?: string;
  customerEmail?: string;
  customerAddress?: string;
  items: any[];
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
  status: 'draft' | 'sent' | 'viewed' | 'paid' | 'overdue' | 'cancelled';
  issueDate: string;
  dueDate: string;
  paidDate?: string;
  notes?: string;
  terms?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceQuery {
  search?: string;
  status?: string;
  customerId?: string;
  startDate?: string;
  endDate?: string;
  minAmount?: number;
  maxAmount?: number;
  page?: number;
  limit?: number;
}

export interface InvoicesResponse {
  invoices: Invoice[];
  total: number;
  page: number;
  totalPages: number;
}

export interface InvoiceStats {
  total: number;
  draft: number;
  sent: number;
  viewed: number;
  paid: number;
  overdue: number;
  cancelled: number;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  overdueAmount: number;
}

class InvoicesService {
  async getInvoices(query?: InvoiceQuery): Promise<InvoicesResponse> {
    const response = await api.get('/invoices', { params: query });
    return response.data;
  }

  async getInvoice(id: string): Promise<Invoice> {
    const response = await api.get(`/invoices/${id}`);
    return response.data;
  }

  async updateInvoice(id: string, data: UpdateInvoiceData): Promise<Invoice> {
    const response = await api.patch(`/invoices/${id}`, data);
    return response.data;
  }

  async getInvoiceStats(): Promise<InvoiceStats> {
    const response = await api.get('/invoices/stats');
    return response.data;
  }

  async getOverdueInvoices(): Promise<Invoice[]> {
    const response = await api.get('/invoices/overdue');
    return response.data;
  }

  async createFromOrder(orderId: string): Promise<Invoice> {
    const response = await api.post(`/invoices/from-order/${orderId}`);
    return response.data;
  }

  async markAsSent(id: string): Promise<Invoice> {
    const response = await api.patch(`/invoices/${id}/send`);
    return response.data;
  }

  async markAsPaid(id: string): Promise<Invoice> {
    const response = await api.patch(`/invoices/${id}/pay`);
    return response.data;
  }
}

export const invoicesService = new InvoicesService();
