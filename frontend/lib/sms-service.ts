import api from './api';
import {
  SmsBalanceStatus,
  SmsUsageStats,
  PublicSmsSettings,
  PurchaseSmsRequest,
  PurchaseSmsResponse,
  SendSmsRequest,
  SendSmsResponse,
} from './types';

export const smsService = {
  // Balance Management
  async getBalanceStatus(): Promise<SmsBalanceStatus> {
    const { data } = await api.get('/sms/balance/status');
    return data;
  },

  // SMS Usage Statistics
  async getSmsUsageStats(): Promise<SmsUsageStats> {
    const { data } = await api.get('/sms/stats');
    return data;
  },

  // SMS Purchase
  async initiatePurchase(purchaseData: PurchaseSmsRequest): Promise<PurchaseSmsResponse> {
    const { data } = await api.post('/sms/purchase', purchaseData);
    return data;
  },

  async completePurchase(packageId: string, paymentId: string): Promise<{
    success: boolean;
    smsAdded: number;
    newBalance: number;
  }> {
    const { data } = await api.post(`/sms/purchase/${packageId}/complete?paymentId=${paymentId}`);
    return data;
  },

  // SMS Sending
  async sendSms(smsData: SendSmsRequest): Promise<SendSmsResponse> {
    const { data } = await api.post('/sms/send', smsData);
    return data;
  },

  // Settings
  async getPublicSmsSettings(): Promise<PublicSmsSettings> {
    const { data } = await api.get('/sms/settings');
    return data;
  },

  // Helper functions for UI
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-BD', {
      style: 'currency',
      currency: 'BDT',
      minimumFractionDigits: 2,
    }).format(amount);
  },

  formatPhoneNumber(phone: string): string {
    // Add basic phone number formatting for Bangladesh
    if (phone.startsWith('+880')) {
      return phone;
    }
    if (phone.startsWith('880')) {
      return `+${phone}`;
    }
    if (phone.startsWith('01')) {
      return `+880${phone.substring(1)}`;
    }
    return phone;
  },

  validatePhoneNumber(phone: string): boolean {
    // Basic validation for Bangladesh phone numbers
    const cleanPhone = phone.replace(/\D/g, '');
    return /^(880|01)[13-9]\d{8}$/.test(cleanPhone);
  },

  calculateSmsCount(message: string): number {
    // Calculate SMS count based on message length
    // Standard SMS is 160 characters, Unicode SMS is 70 characters
    const isUnicode = /[^\x00-\x7F]/.test(message);
    const maxLength = isUnicode ? 70 : 160;
    return Math.ceil(message.length / maxLength);
  },
};
