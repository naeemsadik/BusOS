import { Injectable } from '@nestjs/common';
import * as currencyCodes from 'currency-codes';

export interface Currency {
  code: string;
  currency: string;
  country: string;
  symbol: string;
}

@Injectable()
export class CurrencyService {
  private currencies: Currency[] = [];

  constructor() {
    this.initializeCurrencies();
  }

  private initializeCurrencies() {
    // Get all currencies from currency-codes package
    const allCurrencies = currencyCodes.data;
    
    // Map to our interface format and add symbols
    this.currencies = allCurrencies.map(currency => ({
      code: currency.code,
      currency: currency.currency,
      country: currency.countries ? currency.countries[0] : 'Unknown',
      symbol: this.getCurrencySymbol(currency.code),
    }));

    // Remove duplicates based on currency code
    const uniqueCurrencies = new Map();
    this.currencies.forEach(currency => {
      if (!uniqueCurrencies.has(currency.code)) {
        uniqueCurrencies.set(currency.code, currency);
      }
    });
    
    this.currencies = Array.from(uniqueCurrencies.values());
    
    // Sort by currency name for better UX
    this.currencies.sort((a, b) => a.currency.localeCompare(b.currency));
  }

  private getCurrencySymbol(currencyCode: string): string {
    // Common currency symbols mapping
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

  getAllCurrencies(): Currency[] {
    return this.currencies;
  }

  getCurrencyByCode(code: string): Currency | undefined {
    return this.currencies.find(currency => currency.code === code);
  }

  getPopularCurrencies(): Currency[] {
    const popularCodes = ['USD', 'EUR', 'GBP', 'INR', 'BDT', 'CNY', 'JPY', 'CAD', 'AUD'];
    return this.currencies.filter(currency => popularCodes.includes(currency.code));
  }
}