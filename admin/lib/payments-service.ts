import api from './api';

export interface Payment {
  id: string;
  paymentId: string;
  merchantInvoiceNumber: string;
  trxId?: string;
  amount: number;
  currency: string;
  payerReference: string;
  status: string;
  bkashUrl?: string;
  callbackUrl?: string;
  paymentCreateTime?: Date;
  paymentExecuteTime?: Date;
  updateTime?: Date;
  refundId?: string;
  refundAmount?: number;
  refundTime?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentRefundRequest {
  paymentId: string;
  trxId: string;
  amount: string;
  sku: string;
  reason: string;
}

export const PaymentsService = {
  // Get all payments (admin only)
  async getPayments(): Promise<Payment[]> {
    const response = await api.get<Payment[]>('/admin/payments');
    return response.data;
  },

  // Get payment by ID
  async getPaymentById(paymentId: string): Promise<Payment> {
    const response = await api.get<Payment>(`/payments/bkash/payment/${paymentId}`);
    return response.data;
  },

  // Query payment status
  async queryPaymentStatus(paymentId: string): Promise<any> {
    const response = await api.post<any>('/payments/bkash/query', { paymentId });
    return response.data;
  },

  // Execute payment
  async executePayment(paymentId: string): Promise<any> {
    const response = await api.post<any>('/payments/bkash/execute', { paymentId });
    return response.data;
  },

  // Refund payment
  async refundPayment(paymentId: string, data?: Partial<PaymentRefundRequest>): Promise<any> {
    const refundData = {
      paymentId,
      trxId: data?.trxId || '',
      amount: data?.amount || '0',
      sku: data?.sku || 'subscription',
      reason: data?.reason || 'Admin refund',
      ...data,
    };
    
    const response = await api.post<any>('/payments/bkash/refund', refundData);
    return response.data;
  },

  // Search transaction
  async searchTransaction(trxId: string): Promise<any> {
    const response = await api.get<any>(`/payments/bkash/transaction/${trxId}`);
    return response.data;
  },

  // Get payment statistics (admin)
  async getPaymentStatistics(): Promise<{
    totalPayments: number;
    totalAmount: number;
    successfulPayments: number;
    failedPayments: number;
    refundedPayments: number;
  }> {
    const response = await api.get<{
      totalPayments: number;
      totalAmount: number;
      successfulPayments: number;
      failedPayments: number;
      refundedPayments: number;
    }>('/admin/payments/statistics');
    return response.data;
  },
};
