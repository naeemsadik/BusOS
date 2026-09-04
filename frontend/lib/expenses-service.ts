import { api } from './api';

export interface CreateExpenseData {
  title: string;
  description?: string;
  amount: number;
  category: 'office_supplies' | 'rent' | 'utilities' | 'marketing' | 'travel' | 'meals' | 'equipment' | 'software' | 'professional_services' | 'inventory' | 'shipping' | 'taxes' | 'insurance' | 'other';
  expenseDate: string;
  vendor?: string;
  receiptUrl?: string;
  paymentMethod?: string;
  reference?: string;
  notes?: string;
}

export interface UpdateExpenseData {
  title?: string;
  description?: string;
  amount?: number;
  category?: 'office_supplies' | 'rent' | 'utilities' | 'marketing' | 'travel' | 'meals' | 'equipment' | 'software' | 'professional_services' | 'inventory' | 'shipping' | 'taxes' | 'insurance' | 'other';
  expenseDate?: string;
  vendor?: string;
  receiptUrl?: string;
  paymentMethod?: string;
  reference?: string;
  notes?: string;
}

export interface Expense {
  id: string;
  title: string;
  description?: string;
  amount: number;
  category: string;
  expenseDate: string;
  vendor?: string;
  receiptUrl?: string;
  paymentMethod?: string;
  reference?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseQuery {
  search?: string;
  category?: string;
  vendor?: string;
  startDate?: string;
  endDate?: string;
  minAmount?: number;
  maxAmount?: number;
  page?: number;
  limit?: number;
}

export interface ExpensesResponse {
  expenses: Expense[];
  total: number;
  page: number;
  totalPages: number;
}

export interface ExpenseStats {
  total: number;
  totalAmount: number;
  currentMonthAmount: number;
  averageAmount: number;
  categoriesBreakdown: any[];
}

export interface MonthlyExpenses {
  year: number;
  data: Array<{
    month: number;
    monthName: string;
    amount: number;
    count: number;
  }>;
  totalAmount: number;
  totalCount: number;
}

class ExpensesService {
  async createExpense(data: CreateExpenseData): Promise<Expense> {
    const response = await api.post('/expenses', data);
    return response.data;
  }

  async getExpenses(query?: ExpenseQuery): Promise<ExpensesResponse> {
    const response = await api.get('/expenses', { params: query });
    return response.data;
  }

  async getExpense(id: string): Promise<Expense> {
    const response = await api.get(`/expenses/${id}`);
    return response.data;
  }

  async updateExpense(id: string, data: UpdateExpenseData): Promise<Expense> {
    const response = await api.patch(`/expenses/${id}`, data);
    return response.data;
  }

  async deleteExpense(id: string): Promise<void> {
    await api.delete(`/expenses/${id}`);
  }

  async getExpenseStats(): Promise<ExpenseStats> {
    const response = await api.get('/expenses/stats');
    return response.data;
  }

  async getExpensesByCategory(): Promise<any[]> {
    const response = await api.get('/expenses/categories');
    return response.data;
  }

  async getMonthlyExpenses(year?: number): Promise<MonthlyExpenses> {
    const response = await api.get('/expenses/monthly', { 
      params: { year } 
    });
    return response.data;
  }
}

export const expensesService = new ExpensesService();
