import { api } from './api';

export interface Currency {
  code: string;
  currency: string;
  country: string;
  symbol: string;
}

export interface UserCurrency {
  currencyCode: string;
  currencySymbol: string;
  currencyName: string;
}

class CurrencyService {
  async getAllCurrencies(): Promise<Currency[]> {
    const response = await api.get('/api/currency');
    return response.data;
  }

  async getPopularCurrencies(): Promise<Currency[]> {
    const response = await api.get('/api/currency/popular');
    return response.data;
  }

  async getUserCurrency(): Promise<UserCurrency> {
    const response = await api.get('/api/currency/user');
    return response.data;
  }

  async updateUserCurrency(currency: UserCurrency): Promise<UserCurrency> {
    const response = await api.put('/api/currency/user', currency);
    return response.data;
  }

  // Utility method to format currency amounts
  formatCurrency(amount: number, currencySymbol: string = '৳'): string {
    return `${currencySymbol}${amount.toLocaleString()}`;
  }

  // Get currency by code from local data (without API call)
  getCurrencySymbol(currencyCode: string): string {
    const symbolMap: { [key: string]: string } = {
      'USD': '$',
      'EUR': '€',
      'GBP': '£',
      'JPY': '¥',
      'CNY': '¥',
      'INR': '₹',
      'BDT': '৳',
      'CAD': 'C$',
      'AUD': 'A$',
      'CHF': 'CHF',
      'SEK': 'kr',
      'NOK': 'kr',
      'DKK': 'kr',
      'RUB': '₽',
      'KRW': '₩',
      'BRL': 'R$',
      'MXN': '$',
      'ZAR': 'R',
      'TRY': '₺',
      'THB': '฿',
      'SGD': 'S$',
      'HKD': 'HK$',
      'NZD': 'NZ$',
      'PLN': 'zł',
      'CZK': 'Kč',
      'HUF': 'Ft',
      'ILS': '₪',
      'AED': 'د.إ',
      'SAR': '﷼',
      'EGP': '£',
      'PKR': '₨',
      'LKR': '₨',
      'MYR': 'RM',
      'IDR': 'Rp',
      'PHP': '₱',
      'VND': '₫',
    };

    return symbolMap[currencyCode] || currencyCode;
  }
}

export const currencyService = new CurrencyService();