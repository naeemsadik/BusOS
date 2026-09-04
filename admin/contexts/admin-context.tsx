'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Admin } from '../lib/types';
import { adminService } from '../lib/admin-service';
import { mockAdmin, DEMO_TOKEN } from '../lib/mock-data';

interface AdminContextType {
  admin: Admin | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isDemoMode: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  refreshAdmin: () => Promise<void>;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const isDemo =
        localStorage.getItem('admin_demo_mode') === 'true' ||
        token === DEMO_TOKEN;

      if (token) {
        if (isDemo) {
          setAdmin(mockAdmin);
          setIsLoading(false);
          return;
        }

        // Set token in axios defaults
        const api = (await import('../lib/api')).default;
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        const adminData = await adminService.getProfile();
        setAdmin(adminData);
      }
    } catch (error) {
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_demo_mode');
      setAdmin(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (username: string, password: string) => {
    const trimmedUser = username.trim().toLowerCase();
    const isDemoCreds =
      (trimmedUser === 'admin' || trimmedUser === 'demo' || trimmedUser === 'admin@pos-system.local') &&
      (password === 'admin' || password === 'admin123' || password === 'demo123');

    if (isDemoCreds) {
      localStorage.setItem('admin_token', DEMO_TOKEN);
      localStorage.setItem('admin_demo_mode', 'true');
      setAdmin(mockAdmin);
      return;
    }

    try {
      const response = await adminService.login({ username, password });
      
      localStorage.setItem('admin_token', response.access_token);
      localStorage.removeItem('admin_demo_mode');
      
      // Set token in axios defaults
      const api = (await import('@/lib/api')).default;
      api.defaults.headers.common['Authorization'] = `Bearer ${response.access_token}`;
      
      setAdmin(response.admin);
    } catch (error) {
      // If backend is offline and user attempted admin login, fall back to demo mode smoothly
      if (trimmedUser === 'admin') {
        localStorage.setItem('admin_token', DEMO_TOKEN);
        localStorage.setItem('admin_demo_mode', 'true');
        setAdmin(mockAdmin);
        return;
      }
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_demo_mode');
    setAdmin(null);
    
    // Remove token from axios defaults
    import('@/lib/api').then(({ default: api }) => {
      delete api.defaults.headers.common['Authorization'];
    });
  };

  const refreshAdmin = async () => {
    try {
      const isDemo =
        localStorage.getItem('admin_demo_mode') === 'true' ||
        localStorage.getItem('admin_token') === DEMO_TOKEN;

      if (isDemo) {
        setAdmin(mockAdmin);
        return;
      }

      const adminData = await adminService.getProfile();
      setAdmin(adminData);
    } catch (error) {
      console.error('Failed to refresh admin data:', error);
    }
  };

  const isDemoMode =
    admin?.id === mockAdmin.id ||
    (typeof window !== 'undefined' && localStorage.getItem('admin_demo_mode') === 'true');

  const value = {
    admin,
    isLoading,
    isAuthenticated: !!admin,
    isDemoMode,
    login,
    logout,
    refreshAdmin,
  };

  return (
    <AdminContext.Provider value={value}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const context = useContext(AdminContext);
  if (context === undefined) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
}
