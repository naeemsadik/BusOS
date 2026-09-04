'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { currencyService, UserCurrency } from '@/lib/currency-service';
import { useAuth } from './auth-context';

interface CurrencyContextType {
  currency: UserCurrency;
  updateCurrency: (newCurrency: UserCurrency) => Promise<void>;
  formatCurrency: (amount: number) => string;
  loading: boolean;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

interface CurrencyProviderProps {
  children: ReactNode;
}

export function CurrencyProvider({ children }: CurrencyProviderProps) {
  const { user, isLoading: authLoading } = useAuth();
  const [currency, setCurrency] = useState<UserCurrency>({
    currencyCode: 'BDT',
    currencySymbol: '৳',
    currencyName: 'Bangladeshi Taka',
  });
  const [loading, setLoading] = useState(true);

  // Load user's currency preference when user is authenticated
  useEffect(() => {
    const loadUserCurrency = async () => {
      if (!user || authLoading) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const userCurrency = await currencyService.getUserCurrency();
        setCurrency(userCurrency);
      } catch (error) {
        console.error('Failed to load user currency:', error);
        // Keep default currency on error
      } finally {
        setLoading(false);
      }
    };

    loadUserCurrency();
  }, [user, authLoading]);

  const updateCurrency = async (newCurrency: UserCurrency) => {
    try {
      setLoading(true);
      const updatedCurrency = await currencyService.updateUserCurrency(newCurrency);
      setCurrency(updatedCurrency);
    } catch (error) {
      console.error('Failed to update currency:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number): string => {
    return currencyService.formatCurrency(amount, currency.currencySymbol);
  };

  const value: CurrencyContextType = {
    currency,
    updateCurrency,
    formatCurrency,
    loading,
  };

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}