'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { adminCurrencyService, UserCurrency } from '@/lib/currency-service';

interface AdminCurrencyContextType {
  currency: UserCurrency;
  formatCurrency: (amount: number) => string;
}

const AdminCurrencyContext = createContext<AdminCurrencyContextType | undefined>(undefined);

interface AdminCurrencyProviderProps {
  children: ReactNode;
}

export function AdminCurrencyProvider({ children }: AdminCurrencyProviderProps) {
  const currency = adminCurrencyService.getDefaultCurrency();

  const formatCurrency = (amount: number): string => {
    return adminCurrencyService.formatCurrency(amount, currency.currencySymbol);
  };

  const value: AdminCurrencyContextType = {
    currency,
    formatCurrency,
  };

  return (
    <AdminCurrencyContext.Provider value={value}>
      {children}
    </AdminCurrencyContext.Provider>
  );
}

export function useAdminCurrency() {
  const context = useContext(AdminCurrencyContext);
  if (context === undefined) {
    throw new Error('useAdminCurrency must be used within an AdminCurrencyProvider');
  }
  return context;
}