import api from './api';
import { Subscription, SubscriptionPlan, ApiResponse } from './types';

export interface UpgradeSubscriptionRequest {
  plan: SubscriptionPlan;
  paymentMethodId?: string;
}

export interface CancelSubscriptionRequest {
  reason?: string;
}

export const subscriptionService = {
  // Get current subscription
  async getCurrentSubscription(): Promise<Subscription> {
    const response = await api.get('/subscription');
    return response.data;
  },

  // Upgrade subscription
  async upgradeSubscription(data: UpgradeSubscriptionRequest): Promise<ApiResponse> {
    const response = await api.post('/subscription/upgrade', data);
    return response.data;
  },

  // Cancel subscription
  async cancelSubscription(data?: CancelSubscriptionRequest): Promise<ApiResponse> {
    const response = await api.post('/subscription/cancel', data);
    return response.data;
  },

  // Renew subscription
  async renewSubscription(): Promise<ApiResponse> {
    const response = await api.post('/subscription/renew');
    return response.data;
  },

  // Check subscription status
  async checkStatus(): Promise<{
    isActive: boolean;
    isExpired: boolean;
    daysRemaining: number;
    subscription: Subscription;
  }> {
    const response = await api.get('/subscription/status');
    return response.data;
  },

  // Get subscription plans
  async getPlans(): Promise<{
    plans: Array<{
      id: string;
      name: string;
      planType: SubscriptionPlan;
      description: string;
      price: number;
      currency: string;
      durationDays: number;
      features: string[];
      maxUsers: number | null;
      maxInventoryItems: number | null;
      isActive: boolean;
      isPopular: boolean;
    }>;
  }> {
    const response = await api.get('/subscription/plans');
    return { plans: response.data };
  },

  // Purchase a subscription plan
  async purchaseSubscription(data: { 
    planType: SubscriptionPlan; 
    payerReference: string; 
    paymentMethod?: 'bkash' | 'sslcommerz' 
  }): Promise<{ paymentUrl: string; paymentId: string; merchantInvoiceNumber: string }> {
    const response = await api.post('/subscription/purchase', data);
    return response.data;
  },

  // Get payment history
  async getPaymentHistory(): Promise<Array<{
    id: string;
    paymentId: string;
    invoiceNumber: string;
    amount: number;
    currency: string;
    status: string;
    paymentMethod: string;
    transactionId: string;
    cardType?: string;
    paymentDate: string;
    createdAt: string;
  }>> {
    const response = await api.get('/subscription/payment-history');
    return response.data;
  },

  // Get invoice data for a payment
  async getInvoice(paymentId: string): Promise<{
    invoiceNumber: string;
    paymentId: string;
    transactionId: string;
    paymentMethod: string;
    paymentDate: string;
    amount: number;
    currency: string;
    status: string;
    organization: {
      name: string;
      phone: string;
      address: string;
      city: string;
      country: string;
    };
    subscription: {
      plan: string;
      planName: string;
      features: string[];
    };
    cardType?: string;
  }> {
    const response = await api.get(`/subscription/invoice/${paymentId}`);
    return response.data;
  },
};
