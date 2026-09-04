'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { User, LoginRequest, RegisterRequest, ChangePasswordRequest, InviteUserRequest, AcceptInvitationRequest, UserPermission, SubscriptionStatus } from '@/lib/types';
import { authService } from '@/lib/auth-service';
import { permissionsService } from '@/lib/permissions-service';
import { toast } from 'sonner';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  changePassword: (data: ChangePasswordRequest) => Promise<void>;
  inviteUser: (data: InviteUserRequest) => Promise<void>;
  acceptInvitation: (data: AcceptInvitationRequest) => Promise<void>;
  resendVerification: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const isAuthenticated = !!user && !!Cookies.get('access_token');

  useEffect(() => {
    const initializeAuth = async () => {
      const token = Cookies.get('access_token');

      if (token) {
        try {
          const userData = await authService.getProfile();
          setUser(userData);
        } catch (error: any) {
          console.error('Failed to get user profile:', error);
          // Only remove cookie if it's an authentication error (401)
          // Don't remove on network errors or other issues
          if (error?.response?.status === 401) {
            Cookies.remove('access_token');
          }
        }
      }

      setIsLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (data: LoginRequest) => {
    try {
      const response = await authService.login(data);
      Cookies.set('access_token', response.accessToken, {
        expires: 7,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
      });
      setUser(response.user);

      // Check subscription status first
      const subscription = response.user.organization?.subscription;
      const now = new Date();
      const isSubscriptionExpired = !subscription ||
        subscription.status === SubscriptionStatus.EXPIRED ||
        subscription.status === SubscriptionStatus.SUSPENDED ||
        (subscription.status === SubscriptionStatus.TRIAL && new Date(subscription.endDate) < now) ||
        (subscription.status === SubscriptionStatus.CANCELLED && new Date(subscription.endDate) < now) ||
        (subscription.status === SubscriptionStatus.ACTIVE && new Date(subscription.endDate) < now);

      // If subscription is expired, redirect to subscription page
      if (isSubscriptionExpired) {
        toast.success('Login successful!');
        toast.warning('Your subscription has expired. Please renew to continue using all features.');
        try {
          await router.push('/subscription');
        } catch {
          window.location.href = '/subscription';
        }
        return;
      }

      // Fetch user permissions to determine landing page
      let targetPage = '/dashboard';
      if (response.user.role !== 'owner') {
        try {
          const userPermissions = await permissionsService.getUserPermissions(response.user.id);
          // Find first permitted module based on priority
          const permissionModules = [
            'pos', 'dashboard', 'inventory', 'orders', 'customers',
            'reports', 'suppliers', 'expenses', 'delivery', 'settings'
          ];

          for (const module of permissionModules) {
            const permission = userPermissions.find((p: UserPermission) => p.module === module);
            if (permission && permission.canView) {
              targetPage = `/${module}`;

              // Store the user's first permitted page in a cookie for future visits
              Cookies.set('preferred_landing_page', module, {
                expires: 365, // Store for a year
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                path: '/',
              });

              break;
            }
          }
        } catch (permError) {
          console.error('Error fetching user permissions:', permError);
          // Default to dashboard if permissions can't be fetched
        }
      }

      toast.success('Login successful!');
      try {
        await router.push(targetPage);
      } catch {
        window.location.href = targetPage;
      }
    } catch (error: any) {
      const message = error.response?.data?.message || 'Login failed';
      toast.error(message);
      throw error;
    }
  };

  const register = async (data: RegisterRequest) => {
    try {
      await authService.register(data);
      // Store email for verification resend functionality
      localStorage.setItem('verificationEmail', data.email);
      toast.success('Registration successful! Please check your email to verify your account.');
      router.push('/auth/verify-email');
    } catch (error: any) {
      const message = error.response?.data?.message || 'Registration failed';
      toast.error(message);
      throw error;
    }
  };

  const logout = () => {
    authService.logout();
    Cookies.remove('access_token');
    Cookies.remove('preferred_landing_page');
    setUser(null);
    toast.success('Logged out successfully');
    router.push('/');
  };

  const refreshUser = async () => {
    try {
      const userData = await authService.getProfile();
      setUser(userData);
    } catch (error) {
      console.error('Failed to refresh user data:', error);
    }
  };

  const changePassword = async (data: ChangePasswordRequest) => {
    try {
      await authService.changePassword(data);
      toast.success('Password changed successfully');
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to change password';
      toast.error(message);
      throw error;
    }
  };

  const inviteUser = async (data: InviteUserRequest) => {
    try {
      await authService.inviteUser(data);
      toast.success('Invitation sent successfully');
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to send invitation';
      toast.error(message);
      throw error;
    }
  };

  const acceptInvitation = async (data: AcceptInvitationRequest) => {
    try {
      await authService.acceptInvitation(data);
      toast.success('Invitation accepted successfully! Please log in.');
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to accept invitation';
      toast.error(message);
      throw error;
    }
  };

  const resendVerification = async (email: string) => {
    try {
      await authService.resendVerification({ email });
      toast.success('Verification email resent successfully');
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to resend verification email';
      toast.error(message);
      throw error;
    }
  };

  const value = {
    user,
    isAuthenticated,
    isLoading,
    login,
    register,
    logout,
    refreshUser,
    changePassword,
    inviteUser,
    acceptInvitation,
    resendVerification,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
